import { Router } from "express";
import { pool } from "../db.js";

const router = Router();
const signedIn = (req,res,next) => req.session.userId ? next() : res.status(401).json({error:"Not signed in."});
const clean = (v,max) => typeof v === "string" ? v.trim().slice(0,max) : "";

router.get("/",signedIn,async(req,res,next)=>{
 try{
  const r=await pool.query(`SELECT c.id,c.title,c.created_at,cm.role,
   COALESCE((SELECT json_agg(json_build_object('id',ch.id,'name',ch.name,'description',ch.description,'isDefault',ch.is_default) ORDER BY ch.is_default DESC,ch.name) FROM conversation_channels ch WHERE ch.conversation_id=c.id),'[]'::json) AS channels
   FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id
   WHERE cm.user_id=$1 AND c.kind='group' ORDER BY c.created_at DESC`,[req.session.userId]);
  res.json({groups:r.rows});
 }catch(e){next(e);}
});

router.post("/",signedIn,async(req,res,next)=>{
 const title=clean(req.body?.title,80);
 const usernames=Array.isArray(req.body?.members)?[...new Set(req.body.members.map(x=>clean(x,24).toLowerCase()).filter(Boolean))].slice(0,49):[];
 if(!title)return res.status(400).json({error:"Group name is required."});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const g=await client.query("INSERT INTO conversations(kind,title,created_by) VALUES('group',$1,$2) RETURNING id,title,created_at",[title,req.session.userId]);
  const id=g.rows[0].id;
  await client.query("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES($1,$2,'owner')",[id,req.session.userId]);
  if(usernames.length){
   const found=await client.query("SELECT id FROM profiles WHERE lower(username)=ANY($1::text[])",[usernames]);
   for(const m of found.rows)await client.query("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT DO NOTHING",[id,m.id]);
  }
  const ch=await client.query("INSERT INTO conversation_channels(conversation_id,name,description,is_default,created_by) VALUES($1,'general','Main group discussion',true,$2) RETURNING id,name,description,is_default",[id,req.session.userId]);
  await client.query("COMMIT");
  res.status(201).json({group:{...g.rows[0],role:"owner",channels:ch.rows}});
 }catch(e){await client.query("ROLLBACK");next(e);}finally{client.release();}
});

router.post("/:groupId/channels",signedIn,async(req,res,next)=>{
 const name=clean(req.body?.name,40).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-");
 const description=clean(req.body?.description,160);
 if(!name)return res.status(400).json({error:"Channel name is required."});
 try{
  const m=await pool.query("SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  if(!m.rowCount)return res.status(404).json({error:"Group not found."});
  if(!["owner","admin","moderator"].includes(m.rows[0].role))return res.status(403).json({error:"Moderator permission required."});
  const ch=await pool.query("INSERT INTO conversation_channels(conversation_id,name,description,created_by) VALUES($1,$2,$3,$4) RETURNING id,name,description",[req.params.groupId,name,description,req.session.userId]);
  res.status(201).json({channel:ch.rows[0]});
 }catch(e){if(e.code==="23505")return res.status(409).json({error:"Channel already exists."});next(e);}
});

router.get("/:groupId/members",signedIn,async(req,res,next)=>{
 try{
  const access=await pool.query("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  if(!access.rowCount)return res.status(404).json({error:"Group not found."});
  const result=await pool.query("SELECT p.id,p.username,p.display_name,cm.role,cm.joined_at FROM conversation_members cm JOIN profiles p ON p.id=cm.user_id WHERE cm.conversation_id=$1 ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,lower(p.username)",[req.params.groupId]);
  return res.json({members:result.rows});
 }catch(e){next(e);}
});

// Members may leave; removing another member follows role hierarchy.
router.delete("/:groupId/members/:userId",signedIn,async(req,res,next)=>{
 const targetId=req.params.userId;
 const actorId=req.session.userId;
 const isSelf=targetId===actorId;
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const roles=await client.query("SELECT user_id,role FROM conversation_members WHERE conversation_id=$1 AND user_id=ANY($2::uuid[]) FOR UPDATE",[req.params.groupId,[actorId,targetId]]);
  const actor=roles.rows.find(x=>x.user_id===actorId);
  const target=roles.rows.find(x=>x.user_id===targetId);
  if(!actor||!target){await client.query("ROLLBACK");return res.status(404).json({error:"Group member not found."});}
  if(isSelf){
   if(actor.role==="owner"){await client.query("ROLLBACK");return res.status(409).json({error:"Group owner must transfer ownership before leaving."});}
  }else{
   const ownerCanRemove=actor.role==="owner"&&target.role!=="owner";
   const adminCanRemove=actor.role==="admin"&&(target.role==="member"||target.role==="moderator");
   const moderatorCanRemove=actor.role==="moderator"&&target.role==="member";
   if(!ownerCanRemove&&!adminCanRemove&&!moderatorCanRemove){await client.query("ROLLBACK");return res.status(403).json({error:"You do not have permission to remove this member."});}
  }
  await client.query("DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,targetId]);
  if(!isSelf)await client.query("INSERT INTO moderation_audit(moderator_id,action,target_user_id,conversation_id,metadata) VALUES($1,'member_removed',$2,$3,jsonb_build_object('targetRole',$4))",[actorId,targetId,req.params.groupId,target.role]);
  await client.query("COMMIT");
  return res.json({removed:true,left:isSelf});
 }catch(e){await client.query("ROLLBACK");next(e);}finally{client.release();}
});

// Ownership can be transferred only by the current owner to an existing member.
router.post("/:groupId/transfer-ownership",signedIn,async(req,res,next)=>{
 const nextOwnerId=typeof req.body?.userId==="string"?req.body.userId:"";
 if(!nextOwnerId)return res.status(400).json({error:"Select a group member."});
 if(nextOwnerId===req.session.userId)return res.status(400).json({error:"You already own this group."});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const group=await client.query("SELECT id FROM conversations WHERE id=$1 AND kind='group' FOR UPDATE",[req.params.groupId]);
  if(!group.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Group not found."});}
  const roles=await client.query("SELECT user_id,role FROM conversation_members WHERE conversation_id=$1 AND user_id=ANY($2::uuid[]) FOR UPDATE",[req.params.groupId,[req.session.userId,nextOwnerId]]);
  const actor=roles.rows.find(x=>x.user_id===req.session.userId);
  const target=roles.rows.find(x=>x.user_id===nextOwnerId);
  if(!actor||actor.role!=="owner"){await client.query("ROLLBACK");return res.status(403).json({error:"Only the current owner can transfer ownership."});}
  if(!target){await client.query("ROLLBACK");return res.status(404).json({error:"The new owner must already be a group member."});}
  await client.query("UPDATE conversation_members SET role='admin' WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  await client.query("UPDATE conversation_members SET role='owner' WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,nextOwnerId]);
  await client.query("INSERT INTO moderation_audit(moderator_id,action,target_user_id,conversation_id,metadata) VALUES($1,'ownership_transferred',$2,$3,'{}'::jsonb)",[req.session.userId,nextOwnerId,req.params.groupId]);
  await client.query("COMMIT");
  return res.json({transferred:true,newOwnerId:nextOwnerId});
 }catch(e){await client.query("ROLLBACK");next(e);}finally{client.release();}
});

router.patch("/:groupId/members/:userId/role",signedIn,async(req,res,next)=>{
 const role=req.body?.role;
 if(!["moderator","member"].includes(role))return res.status(400).json({error:"Invalid role."});
 try{
  const actor=await pool.query("SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  if(!actor.rowCount||!["owner","admin"].includes(actor.rows[0].role))return res.status(403).json({error:"Only owner or admin can assign moderators."});
  const target=await pool.query("UPDATE conversation_members SET role=$1 WHERE conversation_id=$2 AND user_id=$3 AND role<>'owner' RETURNING user_id,role",[role,req.params.groupId,req.params.userId]);
  if(!target.rowCount)return res.status(404).json({error:"Member not found."});
  await pool.query("INSERT INTO moderation_audit(moderator_id,action,target_user_id,conversation_id,metadata) VALUES($1,'member_role_changed',$2,$3,jsonb_build_object('newRole',$4))",[req.session.userId,req.params.userId,req.params.groupId,role]);
  res.json({member:target.rows[0]});
 }catch(e){next(e);}
});

// Moderation history is visible only to the group owner/admin/moderator team.
router.get("/:groupId/moderation-log",signedIn,async(req,res,next)=>{
 try{
  const access=await pool.query("SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  if(!access.rowCount)return res.status(404).json({error:"Group not found."});
  if(!["owner","admin","moderator"].includes(access.rows[0].role))return res.status(403).json({error:"Moderator permission required."});
  const limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||30,1),100);
  const result=await pool.query("SELECT a.id,a.action,a.metadata,a.created_at,mod.username AS moderator_username,target.username AS target_username FROM moderation_audit a JOIN profiles mod ON mod.id=a.moderator_id LEFT JOIN profiles target ON target.id=a.target_user_id WHERE a.conversation_id=$1 ORDER BY a.created_at DESC LIMIT $2",[req.params.groupId,limit]);
  return res.json({events:result.rows});
 }catch(e){next(e);}
});
router.delete("/:groupId/channels/:channelId/messages/:messageId",signedIn,async(req,res,next)=>{
 try{
  const m=await pool.query("SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  if(!m.rowCount||!["owner","admin","moderator"].includes(m.rows[0].role))return res.status(403).json({error:"Moderator permission required."});
  // Bind the channel to the same group whose moderator role was checked above.
  // Without this condition, a moderator in one group could target another group's channel.
  const d=await pool.query(
   "UPDATE messages SET deleted_at=now(),body='[message removed by moderator]' WHERE id=$1 AND channel_id=$2 AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM conversation_channels ch WHERE ch.id=messages.channel_id AND ch.conversation_id=$3) RETURNING id",
   [req.params.messageId,req.params.channelId,req.params.groupId]
  );
  if(!d.rowCount)return res.status(404).json({error:"Message not found."});
  await pool.query("INSERT INTO moderation_audit(moderator_id,action,conversation_id,metadata) VALUES($1,'message_removed',$2,jsonb_build_object('channelId',$3,'messageId',$4))",[req.session.userId,req.params.groupId,req.params.channelId,req.params.messageId]);
  res.json({removed:true});
 }catch(e){next(e);}
});

export default router;
