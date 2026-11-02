import { useEffect, useState } from "react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE_URL || "";
const effects = [
  ["red-aura","Red Aura","◉"],["lightning-aura","Lightning Pulse","ϟ"],["flame-aura","Flame Orbit","♨"],
  ["heart-spark","Heart Spark","♥"],["kitty-halo","Kitty Halo","⌁"],["butterfly-drift","Butterfly Drift","✧"],
  ["bubble-orbit","Bubble Orbit","○"],["cherry-blossom","Cherry Blossom","✿"],["starry-aura","Starry Aura","✦"],
  ["crystal-wings","Crystal Wings","◇"],["angel-ring","Angel Ring","☼"],["aurora-ribbon","Aurora Ribbon","〰"],
  ["neon-serpent","Neon Serpent","∿"],["cyber-dragon","Cyber Dragon","龍"],["inferno-wings","Inferno Wings","♨"],
  ["void-tentacles","Void Tentacles","∞"],["thunder-storm","Thunder Storm","ϟ"],["phoenix-rebirth","Phoenix Rebirth","♧"]
];
const plates = ["Crimson Royal","Void Glitch","Royal Voltage","Soft Cloud","Berry Pop","Peach Blush","Lilac Dream","Moonlight","Ocean Glass","Mint Charm","Rose Gold","Starlit","Cyber Grid","Dragon Sigil","Abyss King","Solar Overdrive"];
const sampleChats = [{id:"welcome",name:"VYRO",last:"Your new space starts here",initial:"V",online:true},{id:"crew",name:"Design Crew",last:"Group conversations will appear here",initial:"D",online:false}];

async function request(path, options={}) {
  const response = await fetch(API + path, { ...options, credentials:"include", headers:{"Content-Type":"application/json",...(options.headers||{})} });
  if (response.status === 204) return null;
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function App() {
  const [user,setUser] = useState(null);
  const [checking,setChecking] = useState(true);
  const [mode,setMode] = useState("login");
  const [form,setForm] = useState({fullName:"",username:"",password:"",inviteCode:""});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [active,setActive] = useState(sampleChats[0]);
  const [tab,setTab] = useState("chats");
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState([]);
  const [profileTab,setProfileTab] = useState("avatar");
  const [effect,setEffect] = useState("lightning-aura");
  const [plate,setPlate] = useState("Crimson Royal");
  const [location,setLocation] = useState("not-checked");
  const [locationText,setLocationText] = useState("");

  useEffect(()=>{ request("/api/auth/me").then(d=>setUser(d.user)).catch(()=>{}).finally(()=>setChecking(false)); },[]);
  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request("/api/auth/"+mode,{method:"POST",body:JSON.stringify(form)});
      setUser(data.user);
    } catch(err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await request("/api/auth/logout",{method:"POST"}); } catch {}
    setUser(null); setMessages([]); setLocation("not-checked"); setLocationText("");
  }
  function checkLocation() {
    if (!navigator.geolocation) { setLocation("unsupported"); return; }
    setLocation("checking");
    navigator.geolocation.getCurrentPosition(
      p=>{ setLocation("verified"); setLocationText("Location permission granted for this session"); },
      e=>{ setLocation(e.code===1?"denied":"unavailable"); setLocationText(e.code===1?"Permission was declined":"Location is unavailable"); },
      {enableHighAccuracy:false,timeout:10000,maximumAge:60000}
    );
  }
  function sendMessage(e) {
    e.preventDefault();
    const text=message.trim(); if(!text) return;
    setMessages(items=>[...items,{id:Date.now(),text,at:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
    setMessage("");
  }

  if(checking) return <main className="loading-screen"><div className="brand-mark">V</div><p>INITIALIZING VYRO</p></main>;
  if(!user) return <main className="auth-screen">
    <div className="auth-visual"><div className="visual-grid"/><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/>
      <div className="auth-brand"><span>V</span>YRO</div><div className="auth-copy"><div className="eyebrow">PRIVATE • INVITE ONLY</div><h1>Your people.<br/><em>Your universe.</em></h1><p>A quieter, cleaner space to talk with the people who matter.</p></div>
      <div className="auth-footer">CREATED BY AADI <b>ϟ</b></div>
    </div>
    <section className="auth-panel"><div className="mobile-brand">VYRO <span>ϟ</span></div><div className="auth-form-wrap">
      <div className="eyebrow">WELCOME TO VYRO</div><h2>{mode==="login"?"Sign in":"Create your account"}</h2><p className="muted">{mode==="login"?"Pick up where your circle left off.":"VYRO is invite-only. You’ll need an invite code."}</p>
      <form onSubmit={submitAuth} className="auth-form">
        {mode==="register"&&<label>Full name<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required minLength={2} placeholder="Your name"/></label>}
        <label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength={3} maxLength={24} autoCapitalize="none" placeholder="your_username"/></label>
        <label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={mode==="register"?10:1} placeholder={mode==="register"?"At least 10 characters":"Your password"}/></label>
        {mode==="register"&&<label>Invite code<input value={form.inviteCode} onChange={e=>setForm({...form,inviteCode:e.target.value})} required placeholder="Enter your invite code"/></label>}
        {error&&<div className="error-banner">{error}</div>}
        <button className="primary-btn" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in to VYRO":"Create account"} <span>↗</span></button>
      </form>
      <button className="switch-auth" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}> {mode==="login"?"New here? Create an account":"Already have an account? Sign in"}</button>
      <div className="auth-security">Passwords are checked securely by the VYRO server. Never share your password or invite code.</div>
    </div></section>
  </main>;

  return <main className="app">
    <header className="topbar"><div className="brand"><span className="brand-symbol">V</span> VYRO <i>PRIVATE NETWORK</i></div><div className="top-user"><span className="status-dot"/>{user.full_name}<button onClick={logout}>Sign out</button></div></header>
    <div className="app-layout">
      <nav className="rail"><button className={tab==="chats"?"rail-btn active": "rail-btn"} onClick={()=>setTab("chats")} title="Chats">▤</button><button className={tab==="people"?"rail-btn active":"rail-btn"} onClick={()=>setTab("people")} title="People">♧</button><button className={tab==="profile"?"rail-btn active":"rail-btn"} onClick={()=>setTab("profile")} title="Profile">◉</button><div className="rail-spacer"/><div className="rail-avatar">{user.username.slice(0,1).toUpperCase()}</div></nav>
      {tab==="chats"&&<><aside className="chat-sidebar"><div className="side-heading"><div><div className="eyebrow">YOUR SPACE</div><h2>Messages</h2></div><button className="square-btn" title="New chat">＋</button></div><div className="search-box">⌕ <input placeholder="Search conversations"/></div><div className="list-label">RECENT</div>{sampleChats.map(c=><button key={c.id} className={active.id===c.id?"chat-entry selected":"chat-entry"} onClick={()=>{setActive(c);setMessages([]);}}><span className="chat-avatar">{c.initial}</span><span className="chat-entry-copy"><b>{c.name}</b><small>{c.last}</small></span><span className={c.online?"presence online":"presence"}/></button>)}<div className="sidebar-tip"><span>✦</span><b>Your circle, your rules.</b><small>Invite-only conversations</small></div></aside>
      <section className="chat-panel"><div className="chat-head"><div className="chat-avatar large">{active.initial}</div><div><b>{active.name}</b><small>{active.online?"VYRO space":"Group space"}</small></div><div className="chat-head-actions"><button className="square-btn" title="Search">⌕</button><button className="square-btn" title="More">•••</button></div></div><div className="messages-area"><div className="day-divider"><span>START OF CONVERSATION</span></div>{messages.length===0?<div className="empty-chat"><div className="empty-icon">V</div><div className="eyebrow">A FRESH START</div><h2>Say something real.</h2><p>This is your conversation space. Invite a friend to start chatting.</p><span className="demo-note">Live multi-user messaging activates after the VYRO server and database are deployed.</span></div>:messages.map(m=><div className="message-line" key={m.id}><div className="my-message">{m.text}<small>{m.at} <b>✓</b></small></div></div>)}</div><form className="message-composer" onSubmit={sendMessage}><button type="button" className="attach-btn" title="Attachments coming with live chat">＋</button><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write a message…" /><button className="send-btn" disabled={!message.trim()}>↑</button></form></section></>}
      {tab==="people"&&<section className="content-panel"><div className="eyebrow">YOUR CIRCLE</div><h1>People</h1><p className="muted">Invite-only friend discovery will appear here when the live service is connected.</p><div className="feature-card"><span>♧</span><h3>Keep your circle close.</h3><p>Find invited members and start private conversations.</p></div></section>}
      {tab==="profile"&&<section className="content-panel profile-page"><div className="eyebrow">IDENTITY STUDIO</div><h1>Your profile</h1><div className="profile-preview"><div className={"big-avatar effect-"+effect}>{user.username.slice(0,1).toUpperCase()}<i>{effects.find(x=>x[0]===effect)?.[2]}</i></div><div><h2>{user.full_name}</h2><p>@{user.username}</p><span className="plate-chip">{plate}</span></div></div><div className="studio-tabs"><button className={profileTab==="avatar"?"active":""} onClick={()=>setProfileTab("avatar")}>Avatar effects</button><button className={profileTab==="plate"?"active":""} onClick={()=>setProfileTab("plate")}>Nameplates</button></div>{profileTab==="avatar"?<div className="cosmetic-grid">{effects.map(([id,name,symbol])=><button key={id} className={effect===id?"cosmetic-card chosen":"cosmetic-card"} onClick={()=>setEffect(id)}><span className={"cosmetic-symbol effect-"+id}>{symbol}</span><b>{name}</b><small>{effect===id?"EQUIPPED":"TAP TO PREVIEW"}</small></button>)}</div>:<div className="plate-grid">{plates.map(p=><button key={p} className={plate===p?"plate-option chosen":"plate-option"} onClick={()=>setPlate(p)}>{p}{plate===p?" ✓":""}</button>)}</div>}<p className="muted tiny">Cosmetic selection is currently a local preview. Account syncing will be enabled with the live backend.</p></div>}
    </div>
    <footer className="app-footer"><span>VYRO © 2026</span><span>CREATED BY AADI ϟ</span><button onClick={checkLocation}> {location==="verified"?"✓ LOCATION PERMISSION GRANTED":"VERIFY LOCATION"}</button></footer>
    {location!=="not-checked"&&<div className="location-status">{location==="checking"?"Checking location permission…":locationText||"Location status"} <button onClick={()=>{setLocation("not-checked");setLocationText("");}}>×</button><small>Location is requested only when you tap Verify Location. Coordinates are not sent to VYRO.</small></div>}
  </main>;
}
