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

router.delete("/:groupId/channels/:channelId/messages/:messageId",signedIn,async(req,res,next)=>{
 try{
  const m=await pool.query("SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[req.params.groupId,req.session.userId]);
  if(!m.rowCount||!["owner","admin","moderator"].includes(m.rows[0].role))return res.status(403).json({error:"Moderator permission required."});
  const d=await pool.query("UPDATE messages SET deleted_at=now(),body='[message removed by moderator]' WHERE id=$1 AND channel_id=$2 AND deleted_at IS NULL RETURNING id",[req.params.messageId,req.params.channelId]);
  if(!d.rowCount)return res.status(404).json({error:"Message not found."});
  await pool.query("INSERT INTO moderation_audit(moderator_id,action,conversation_id,metadata) VALUES($1,'message_removed',$2,jsonb_build_object('channelId',$3,'messageId',$4))",[req.session.userId,req.params.groupId,req.params.channelId,req.params.messageId]);
  res.json({removed:true});
 }catch(e){next(e);}
});

export default router;
