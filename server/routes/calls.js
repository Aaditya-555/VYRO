import { Router } from "express";
import { createHmac } from "node:crypto";
import { pool } from "../db.js";

const router=Router();
const signedIn=(req,res,next)=>req.session.userId?next():res.status(401).json({error:"Not signed in."});

// Coturn REST credentials are short-lived; the shared secret never enters the APK.
router.get("/ice-config",signedIn,(_req,res)=>{
 const iceServers=[{urls:["stun:stun.l.google.com:19302"]}];
 const turnUrl=process.env.TURN_URL;
 const turnSecret=process.env.TURN_SHARED_SECRET;
 if(turnUrl&&turnSecret){
  const username=String(Math.floor(Date.now()/1000)+3600);
  const credential=createHmac("sha1",turnSecret).update(username).digest("base64");
  iceServers.push({urls:turnUrl.split(",").map(x=>x.trim()).filter(Boolean),username,credential});
 }
 res.set("Cache-Control","no-store").json({iceServers,turnEnabled:iceServers.length>1});
});
async function callAccess(callId,userId){
 const r=await pool.query(`SELECT c.id,c.conversation_id,c.caller_id,c.callee_id,c.call_type,c.status
  FROM call_sessions c WHERE c.id=$1 AND (c.caller_id=$2 OR c.callee_id=$2)`,[callId,userId]);
 return r.rows[0]||null;
}

// One-to-one calls only; both users must still be accepted friends.
router.post("/start",signedIn,async(req,res,next)=>{
 const conversationId=String(req.body?.conversationId||"");
 const callType=req.body?.callType==="video"?"video":"voice";
 try{
  const member=await pool.query(`SELECT c.kind,other.user_id AS peer_id
   FROM conversations c JOIN conversation_members mine ON mine.conversation_id=c.id AND mine.user_id=$2
   JOIN conversation_members other ON other.conversation_id=c.id AND other.user_id<>$2
   WHERE c.id=$1 AND c.kind='direct' LIMIT 1`,[conversationId,req.session.userId]);
  if(!member.rowCount)return res.status(404).json({error:"Direct conversation not found."});
  const peerId=member.rows[0].peer_id;
  const friendship=await pool.query(`SELECT 1 FROM friend_requests WHERE status='accepted'
   AND ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)) LIMIT 1`,[req.session.userId,peerId]);
  if(!friendship.rowCount)return res.status(403).json({error:"Calls are available only between accepted friends."});
  const active=await pool.query("SELECT id FROM call_sessions WHERE conversation_id=$1 AND status IN ('ringing','active') AND created_at>now()-interval '2 minutes'",[conversationId]);
  if(active.rowCount)return res.status(409).json({error:"A call is already active in this chat."});
  const created=await pool.query("INSERT INTO call_sessions(conversation_id,caller_id,callee_id,call_type) VALUES($1,$2,$3,$4) RETURNING id,call_type,status,created_at",[conversationId,req.session.userId,peerId,callType]);
  res.status(201).json({call:created.rows[0]});
 }catch(e){next(e);}
});

router.get("/incoming",signedIn,async(req,res,next)=>{
 try{
  const r=await pool.query(`SELECT c.id,c.conversation_id,c.call_type,c.created_at,p.username,p.full_name
   FROM call_sessions c JOIN profiles p ON p.id=c.caller_id
   WHERE c.callee_id=$1 AND c.status='ringing' AND c.created_at>now()-interval '60 seconds' ORDER BY c.created_at DESC LIMIT 5`,[req.session.userId]);
  res.json({calls:r.rows});
 }catch(e){next(e);}
});

router.get("/:callId/signals",signedIn,async(req,res,next)=>{
 try{
  const call=await callAccess(req.params.callId,req.session.userId);
  if(!call)return res.status(404).json({error:"Call not found."});
  const since=Number(req.query.since)||0;
  const r=await pool.query("SELECT id,sender_id,signal_type,payload,created_at FROM call_signals WHERE call_id=$1 AND id>$2 AND sender_id<>$3 ORDER BY id ASC LIMIT 100",[call.id,since,req.session.userId]);
  res.json({signals:r.rows,callStatus:call.status});
 }catch(e){next(e);}
});

router.post("/:callId/signals",signedIn,async(req,res,next)=>{
 const type=req.body?.type;
 const allowed=["offer","answer","ice-candidate","reject"];
 if(!allowed.includes(type))return res.status(400).json({error:"Invalid call signal."});
 try{
  const call=await callAccess(req.params.callId,req.session.userId);
  if(!call||call.status==="ended")return res.status(404).json({error:"Call is no longer active."});
  if(type==="reject"){
   await pool.query("UPDATE call_sessions SET status='ended',ended_at=now() WHERE id=$1 AND callee_id=$2 AND status='ringing'",[call.id,req.session.userId]);
   return res.json({sent:true});
  }
  if(type==="offer"&&call.caller_id!==req.session.userId)return res.status(403).json({error:"Only the caller can send an offer."});
  if(type==="answer"&&call.callee_id!==req.session.userId)return res.status(403).json({error:"Only the recipient can answer."});
  const payload=req.body?.payload;
  if(!payload||typeof payload!=="object"||JSON.stringify(payload).length>12000)return res.status(400).json({error:"Invalid call payload."});
  const r=await pool.query("INSERT INTO call_signals(call_id,sender_id,signal_type,payload) VALUES($1,$2,$3,$4::jsonb) RETURNING id",[call.id,req.session.userId,type,JSON.stringify(payload)]);
  if(type==="answer")await pool.query("UPDATE call_sessions SET status='active',answered_at=now() WHERE id=$1 AND status='ringing'",[call.id]);
  res.status(201).json({sent:true,id:r.rows[0].id});
 }catch(e){next(e);}
});

router.post("/:callId/end",signedIn,async(req,res,next)=>{
 try{
  const call=await callAccess(req.params.callId,req.session.userId);
  if(!call)return res.status(404).json({error:"Call not found."});
  await pool.query("UPDATE call_sessions SET status='ended',ended_at=now() WHERE id=$1 AND status<>'ended'",[call.id]);
  res.json({ended:true});
 }catch(e){next(e);}
});
export default router;
