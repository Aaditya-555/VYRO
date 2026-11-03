import { Router } from "express";
import { pool } from "../db.js";
const router=Router();
const signedIn=(req,res,next)=>req.session.userId?next():res.status(401).json({error:"Not signed in."});

router.get("/",signedIn,async(req,res,next)=>{
 try{
  const r=await pool.query(`
   SELECT c.id,c.kind,c.title,c.created_at,
    CASE WHEN c.kind='direct' THEN (SELECT json_build_object('id',p.id,'username',p.username,'full_name',p.full_name,'display_name',p.display_name) FROM conversation_members other JOIN profiles p ON p.id=other.user_id WHERE other.conversation_id=c.id AND other.user_id<>$1 LIMIT 1) ELSE NULL END AS peer,
    (SELECT m.body FROM messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
    (SELECT m.created_at FROM messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
    COALESCE((SELECT json_agg(json_build_object('id',ch.id,'name',ch.name,'description',ch.description,'isDefault',ch.is_default) ORDER BY ch.is_default DESC,ch.name) FROM conversation_channels ch WHERE ch.conversation_id=c.id),'[]'::json) AS channels
   FROM conversations c JOIN conversation_members mine ON mine.conversation_id=c.id
   WHERE mine.user_id=$1 ORDER BY COALESCE((SELECT max(m.created_at) FROM messages m WHERE m.conversation_id=c.id),c.created_at) DESC
  `,[req.session.userId]);
  res.json({conversations:r.rows});
 }catch(e){next(e);}
});

router.post("/direct",signedIn,async(req,res,next)=>{
 const username=typeof req.body?.username==="string"?req.body.username.trim().toLowerCase():"";
 if(!/^[a-z0-9_]{3,24}$/.test(username))return res.status(400).json({error:"Enter a valid username."});
 const client=await pool.connect();
 try{
  const target=await client.query("SELECT id,username,full_name FROM profiles WHERE username=$1",[username]);
  if(!target.rowCount)return res.status(404).json({error:"No VYRO user found with that username."});
  const friendship=await client.query(`SELECT id FROM friend_requests WHERE status='accepted' AND ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)) LIMIT 1`,[req.session.userId,target.rows[0].id]);
  if(!friendship.rowCount)return res.status(403).json({error:"Send a friend request and wait for acceptance before chatting."});
  if(target.rows[0].id===req.session.userId)return res.status(400).json({error:"You cannot start a chat with yourself."});
  await client.query("BEGIN");
  const existing=await client.query(`SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=$1 JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=$2 WHERE c.kind='direct' LIMIT 1`,[req.session.userId,target.rows[0].id]);
  let id;
  if(existing.rowCount)id=existing.rows[0].id;
  else{
   const c=await client.query("INSERT INTO conversations(kind,created_by) VALUES('direct',$1) RETURNING id",[req.session.userId]);id=c.rows[0].id;
   await client.query("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES($1,$2,'member'),($1,$3,'member')",[id,req.session.userId,target.rows[0].id]);
  }
  await client.query("COMMIT");
  res.status(existing.rowCount?200:201).json({conversation:{id,kind:"direct",peer:target.rows[0]}});
 }catch(e){await client.query("ROLLBACK");next(e);}finally{client.release();}
});
export default router;
