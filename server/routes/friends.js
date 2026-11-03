import { Router } from "express";
import { pool } from "../db.js";
const router=Router();
const signedIn=(req,res,next)=>req.session.userId?next():res.status(401).json({error:"Not signed in."});

router.get("/",signedIn,async(req,res,next)=>{
 try{
  const id=req.session.userId;
  const [friends,incoming,outgoing]=await Promise.all([
   pool.query("SELECT p.id,p.username,p.full_name,p.display_name,fr.responded_at AS friends_since FROM friend_requests fr JOIN profiles p ON p.id=CASE WHEN fr.sender_id=$1 THEN fr.receiver_id ELSE fr.sender_id END WHERE (fr.sender_id=$1 OR fr.receiver_id=$1) AND fr.status='accepted' ORDER BY p.username",[id]),
   pool.query("SELECT fr.id,p.id AS user_id,p.username,p.full_name,fr.created_at FROM friend_requests fr JOIN profiles p ON p.id=fr.sender_id WHERE fr.receiver_id=$1 AND fr.status='pending' ORDER BY fr.created_at DESC",[id]),
   pool.query("SELECT fr.id,p.id AS user_id,p.username,p.full_name,fr.created_at FROM friend_requests fr JOIN profiles p ON p.id=fr.receiver_id WHERE fr.sender_id=$1 AND fr.status='pending' ORDER BY fr.created_at DESC",[id])
  ]);
  res.json({friends:friends.rows,incoming:incoming.rows,outgoing:outgoing.rows});
 }catch(e){next(e);}
});

router.post("/requests",signedIn,async(req,res,next)=>{
 try{
  const username=typeof req.body?.username==="string"?req.body.username.trim().toLowerCase():"";
  if(!/^[a-z0-9_]{3,24}$/.test(username))return res.status(400).json({error:"Enter a valid username."});
  const target=await pool.query("SELECT id FROM profiles WHERE username=$1",[username]);
  if(!target.rowCount)return res.status(404).json({error:"No VYRO account found with that username."});
  if(target.rows[0].id===req.session.userId)return res.status(400).json({error:"You cannot add yourself."});
  const exists=await pool.query("SELECT id,status FROM friend_requests WHERE LEAST(sender_id,receiver_id)=LEAST($1::uuid,$2::uuid) AND GREATEST(sender_id,receiver_id)=GREATEST($1::uuid,$2::uuid) LIMIT 1",[req.session.userId,target.rows[0].id]);
  if(exists.rowCount){
   if(exists.rows[0].status==="accepted")return res.status(409).json({error:"You are already friends."});
   if(exists.rows[0].status==="pending")return res.status(409).json({error:"A friend request already exists."});
   await pool.query("UPDATE friend_requests SET sender_id=$1,receiver_id=$2,status='pending',created_at=now(),responded_at=NULL WHERE id=$3",[req.session.userId,target.rows[0].id,exists.rows[0].id]);
   return res.status(201).json({ok:true});
  }
  await pool.query("INSERT INTO friend_requests(sender_id,receiver_id) VALUES($1,$2)",[req.session.userId,target.rows[0].id]);
  res.status(201).json({ok:true});
 }catch(e){if(e.code==="23505")return res.status(409).json({error:"A request between these accounts already exists."});next(e);}
});

router.patch("/requests/:id",signedIn,async(req,res,next)=>{
 try{
  const action=req.body?.action;
  if(!["accept","decline"].includes(action))return res.status(400).json({error:"Choose accept or decline."});
  const result=await pool.query("UPDATE friend_requests SET status=$1,responded_at=now() WHERE id=$2 AND receiver_id=$3 AND status='pending' RETURNING id",[action==="accept"?"accepted":"declined",req.params.id,req.session.userId]);
  if(!result.rowCount)return res.status(404).json({error:"This request is no longer available."});
  res.json({ok:true});
 }catch(e){next(e);}
});

router.delete("/:friendId",signedIn,async(req,res,next)=>{
 try{
  const result=await pool.query("DELETE FROM friend_requests WHERE status='accepted' AND ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)) RETURNING id",[req.session.userId,req.params.friendId]);
  if(!result.rowCount)return res.status(404).json({error:"Friend not found."});
  res.json({ok:true});
 }catch(e){next(e);}
});
export default router;
