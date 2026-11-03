import { useEffect,useRef,useState } from "react";

const API=import.meta.env.VITE_API_BASE_URL||"";
async function api(path,options={}){
 if(!API&&!import.meta.env.DEV)throw new Error("VYRO server URL is not configured.");
 const r=await fetch(API+path,{...options,credentials:"include",headers:{"Content-Type":"application/json",...(options.headers||{})}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||"Call request failed.");
 return data;
}
const rtcConfig={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};
export default function CallCenter({conversation,user}){
 const [call,setCall]=useState(null),[incoming,setIncoming]=useState([]),[status,setStatus]=useState(""),[error,setError]=useState("");
 const pc=useRef(null),stream=useRef(null),remoteAudio=useRef(null),remoteVideo=useRef(null),localVideo=useRef(null),lastSignal=useRef(0),queuedIce=useRef([]);
 const active=useRef(call);active.current=call;
 async function cleanup(endRemote=false){
  const current=active.current;
  if(endRemote&&current?.id)try{await api("/api/calls/"+current.id+"/end",{method:"POST",body:"{}"});}catch{}
  if(pc.current){pc.current.onicecandidate=null;pc.current.ontrack=null;pc.current.close();pc.current=null;}
  stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
  if(localVideo.current)localVideo.current.srcObject=null;
  if(remoteVideo.current)remoteVideo.current.srcObject=null;
  if(remoteAudio.current)remoteAudio.current.srcObject=null;
  queuedIce.current=[];lastSignal.current=0;setCall(null);setStatus("");setError("");
 }
 async function makePeer(callId,video){
  const peer=new RTCPeerConnection(rtcConfig);pc.current=peer;
  const local=await navigator.mediaDevices.getUserMedia({audio:true,video});
  stream.current=local;
  if(localVideo.current)localVideo.current.srcObject=local;
  local.getTracks().forEach(track=>peer.addTrack(track,local));
  peer.ontrack=e=>{
   const remote=e.streams[0];
   if(remoteAudio.current)remoteAudio.current.srcObject=remote;
   if(remoteVideo.current)remoteVideo.current.srcObject=remote;
  };
  peer.onicecandidate=e=>{
   if(e.candidate)api("/api/calls/"+callId+"/signals",{method:"POST",body:JSON.stringify({type:"ice-candidate",payload:e.candidate.toJSON()})}).catch(err=>setError(err.message));
  };
  peer.onconnectionstatechange=()=>{if(["failed","disconnected"].includes(peer.connectionState))setStatus("Connection interrupted — checking network…");if(peer.connectionState==="connected")setStatus("Connected");};
  return peer;
 }
 async function start(type){
  if(!conversation||conversation.kind!=="direct")return;
  try{
   setError("");setStatus("Starting call…");
   if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error("This device/browser does not support secure voice and video calls.");
   const d=await api("/api/calls/start",{method:"POST",body:JSON.stringify({conversationId:conversation.id,callType:type})});
   setCall({...d.call,peerName:conversation.peer?.display_name||conversation.peer?.full_name||conversation.peer?.username||"Friend",outgoing:true});
   const peer=await makePeer(d.call.id,type==="video");
   const offer=await peer.createOffer();await peer.setLocalDescription(offer);
   await api("/api/calls/"+d.call.id+"/signals",{method:"POST",body:JSON.stringify({type:"offer",payload:peer.localDescription.toJSON()})});
   setStatus("Calling… waiting for answer");
  }catch(e){setError(e.message);setStatus("");}
 }
 async function accept(item){
  try{
   setError("");setIncoming(list=>list.filter(x=>x.id!==item.id));
   setCall({...item,outgoing:false,peerName:item.full_name||item.username});
   setStatus("Connecting…");
   if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error("This device/browser does not support secure voice and video calls.");
   await makePeer(item.id,item.call_type==="video");
  }catch(e){setError(e.message);}
 }
 async function reject(item){try{await api("/api/calls/"+item.id+"/signals",{method:"POST",body:JSON.stringify({type:"reject",payload:{}})});}catch(e){setError(e.message);}setIncoming(list=>list.filter(x=>x.id!==item.id));}
 useEffect(()=>{
  if(!user)return;
  let live=true;
  const poll=()=>api("/api/calls/incoming").then(d=>{if(live&&!active.current)setIncoming(d.calls||[]);}).catch(()=>{});
  poll();const timer=setInterval(poll,2500);return()=>{live=false;clearInterval(timer);};
 },[user]);
 useEffect(()=>{
  if(!call)return;
  let live=true;
  const poll=async()=>{
   try{
    const d=await api("/api/calls/"+call.id+"/signals?since="+lastSignal.current);
    if(!live)return;
    if(d.callStatus==="ended"){setStatus("Call ended");await cleanup(false);return;}
    for(const signal of d.signals||[]){
     lastSignal.current=Math.max(lastSignal.current,Number(signal.id));
     const peer=pc.current;if(!peer)continue;
     if(signal.signal_type==="offer"&&!call.outgoing&& !peer.remoteDescription){
      await peer.setRemoteDescription(signal.payload);
      for(const candidate of queuedIce.current.splice(0))await peer.addIceCandidate(candidate);
      const answer=await peer.createAnswer();await peer.setLocalDescription(answer);
      await api("/api/calls/"+call.id+"/signals",{method:"POST",body:JSON.stringify({type:"answer",payload:peer.localDescription.toJSON()})});
      setStatus("Connecting…");
     }else if(signal.signal_type==="answer"&&call.outgoing&&!peer.remoteDescription){
      await peer.setRemoteDescription(signal.payload);
      for(const candidate of queuedIce.current.splice(0))await peer.addIceCandidate(candidate);
      setStatus("Connecting…");
     }else if(signal.signal_type==="ice-candidate"){
      const candidate=new RTCIceCandidate(signal.payload);
      if(peer.remoteDescription)await peer.addIceCandidate(candidate);else queuedIce.current.push(candidate);
     }
    }
   }catch(e){if(live)setError(e.message);}
  };
  const timer=setInterval(poll,900);poll();
  return()=>{live=false;clearInterval(timer);};
 },[call?.id]);
 useEffect(()=>()=>{pc.current?.close();stream.current?.getTracks().forEach(t=>t.stop());},[]);
 return <div className="call-center">
  {conversation?.kind==="direct"&&<><button className="call-action" onClick={()=>start("voice")} disabled={!!call}>☎ Voice</button><button className="call-action video" onClick={()=>start("video")} disabled={!!call}>▣ Video</button></>}
  {!call&&incoming.length>0&&<div className="incoming-call"><div><b>Incoming {incoming[0].call_type} call</b><small>{incoming[0].full_name} (@{incoming[0].username})</small></div><button onClick={()=>accept(incoming[0])}>Accept</button><button className="decline" onClick={()=>reject(incoming[0])}>Decline</button></div>}
  {call&&<div className="call-overlay"><div className="call-window"><div className="call-top"><span className="call-live-dot"/><b>{call.call_type==="video"?"Video call":"Voice call"}</b><small>{status||"Connecting…"}</small></div><h2>{call.peerName||"VYRO friend"}</h2><p className="call-error">{error}</p><video ref={remoteVideo} className="remote-video" autoPlay playsInline/><audio ref={remoteAudio} autoPlay/><video ref={localVideo} className="local-video" autoPlay muted playsInline/><div className="call-controls"><button onClick={()=>{if(stream.current)stream.current.getAudioTracks().forEach(t=>t.enabled=!t.enabled);}}>Mic</button><button onClick={()=>{if(stream.current)stream.current.getVideoTracks().forEach(t=>t.enabled=!t.enabled);}}>Camera</button><button className="hangup" onClick={()=>cleanup(true)}>End call</button></div></div></div>}
  {error&&!call&&<div className="call-toast">{error}<button onClick={()=>setError("")}>×</button></div>}
 </div>;
}
