import { useEffect, useState } from "react";
import "./styles.css";
import VyroScene from "./VyroScene.jsx";
import CallCenter from "./CallCenter.jsx";

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
const chatThemes = ["Crimson Pulse","Violet Haze","Ocean Depth","Emerald Night","Rose Quartz","Solar Flare","Arctic Glass","Cyber Lime","Midnight Blue","Amethyst","Cherry Blossom","Golden Hour","Toxic Neon","Deep Space","Lavender Mist","Copper Ember","Glacier","Berry Velvet","Monochrome","Aurora"];


async function request(path, options={}) {
  // The Vite dev server proxies /api locally. A production Android build must
  // have an explicit HTTPS API origin; relative URLs point back to the phone.
  if (!API && !import.meta.env.DEV) {
    throw new Error("VYRO server is not connected to this app yet. The online API URL must be configured before login can work.");
  }
  let response;
  try {
    response = await fetch(API + path, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error("Can't reach the VYRO server. Check your internet connection or ask the app admin to finish server setup.");
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function App() {
  const [user,setUser] = useState(null);
  const [checking,setChecking] = useState(true);
  const [mode,setMode] = useState("login");
  const [form,setForm] = useState({fullName:"",username:"",password:""});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [conversations,setConversations] = useState([]);
  const [active,setActive] = useState(null);
  const [chatError,setChatError] = useState("");
  const [chatTheme,setChatTheme] = useState(0);
  const [showThemes,setShowThemes] = useState(false);
  const [cosmetics,setCosmetics] = useState([]);
  const [friends,setFriends] = useState({friends:[],incoming:[],outgoing:[]});
  const [friendUsername,setFriendUsername] = useState("");
  const [peopleError,setPeopleError] = useState("");
  const [tab,setTab] = useState("chats");
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState([]);
  const [reactionBusy,setReactionBusy] = useState("");
  const [profileTab,setProfileTab] = useState("avatar");
  const [effect,setEffect] = useState("lightning-aura");
  const [plate,setPlate] = useState("Crimson Royal");
  const [location,setLocation] = useState("not-checked");
  const [locationText,setLocationText] = useState("");

  useEffect(()=>{ request("/api/auth/me").then(d=>setUser(d.user)).catch(()=>{}).finally(()=>setChecking(false)); },[]);
  useEffect(()=>{ if(!user)return; request("/api/friends").then(setFriends).catch(e=>setPeopleError(e.message)); request("/api/conversations").then(d=>{setConversations(d.conversations||[]);setActive(null);setMessages([]);}).catch(e=>setChatError(e.message)); request("/api/profile/me").then(d=>{setCosmetics(d.unlockedCosmetics||[]);if(d.profile?.equipped_avatar_effect)setEffect(d.profile.equipped_avatar_effect);if(d.profile?.equipped_nameplate)setPlate(d.unlockedCosmetics?.find(c=>c.slug===d.profile.equipped_nameplate)?.display_name||d.profile.equipped_nameplate);}).catch(()=>{}); },[user]);
  useEffect(()=>{ if(!user||!active)return; let alive=true; const load=()=>request("/api/messages/"+active.id).then(d=>{if(alive)setMessages(d.messages||[]);}).catch(e=>{if(alive)setChatError(e.message);}); load(); const timer=window.setInterval(load,2500); return()=>{alive=false;window.clearInterval(timer);}; },[user,active?.id]);
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
  async function sendMessage(e) {
    e.preventDefault(); const body=message.trim(); if(!body||!active)return;
    try { const d=await request("/api/messages/"+active.id,{method:"POST",body:JSON.stringify({body})}); setMessages(items=>[...items,d.message]); setMessage(""); }
    catch(err){setChatError(err.message);}
  }
  async function toggleReaction(messageId,emoji){const key=messageId+emoji;if(reactionBusy)return;setReactionBusy(key);try{await request("/api/messages/"+active.id+"/"+messageId+"/reactions",{method:"POST",body:JSON.stringify({emoji})});const d=await request("/api/messages/"+active.id);setMessages(d.messages||[]);}catch(e){setChatError(e.message);}finally{setReactionBusy("");}}
  async function newDirectChat(username){if(!username)return;try{const d=await request("/api/conversations/direct",{method:"POST",body:JSON.stringify({username})});const list=await request("/api/conversations");setConversations(list.conversations||[]);setActive((list.conversations||[]).find(c=>c.id===d.conversation.id)||d.conversation);setMessages([]);setChatError("");}catch(e){setChatError(e.message);}}
  async function sendFriendRequest(e){e.preventDefault();setPeopleError("");try{await request("/api/friends/requests",{method:"POST",body:JSON.stringify({username:friendUsername})});setFriendUsername("");setFriends(await request("/api/friends"));}catch(e){setPeopleError(e.message);}}
  async function respondFriend(id,action){setPeopleError("");try{await request("/api/friends/requests/"+id,{method:"PATCH",body:JSON.stringify({action})});setFriends(await request("/api/friends"));}catch(e){setPeopleError(e.message);}}
  async function saveCosmetic(field,value){try{const apiField=field==="equipped_avatar_effect"?"equippedAvatarEffect":"equippedNameplate";await request("/api/profile/me",{method:"PATCH",body:JSON.stringify({[apiField]:value})});if(field==="equipped_avatar_effect")setEffect(value);if(field==="equipped_nameplate")setPlate(cosmetics.find(c=>c.slug===value)?.display_name||value);setChatError("");}catch(e){setChatError(e.message);}}

  if(checking) return <main className="loading-screen"><div className="brand-mark">V</div><p>INITIALIZING VYRO</p></main>;
  if(!user) return <main className="auth-screen">
    <div className="auth-visual"><div className="visual-grid"/><div className="scene-wrap"><VyroScene /></div><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/>
      <div className="auth-brand"><span>V</span>YRO</div><div className="auth-copy"><div className="eyebrow">OPEN COMMUNITY</div><h1>Your people.<br/><em>Your universe.</em></h1><p>A quieter, cleaner space to talk with the people who matter.</p></div>
      <div className="auth-footer">CREATED BY AADI <b>⚡</b></div>
    </div>
    <section className="auth-panel"><div className="mobile-brand">VYRO <span>ϟ</span></div><div className="auth-form-wrap">
      <div className="eyebrow">WELCOME TO VYRO</div><h2>{mode==="login"?"Sign in":"Create your account"}</h2><p className="muted">{mode==="login"?"Pick up where your circle left off.":"Join VYRO and create your account."}</p>
      <form onSubmit={submitAuth} className="auth-form">
        {mode==="register"&&<label>Full name<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required minLength={2} placeholder="Your name"/></label>}
        <label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength={3} maxLength={24} autoCapitalize="none" placeholder="your_username"/></label>
        <label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={mode==="register"?10:1} placeholder={mode==="register"?"At least 10 characters":"Your password"}/></label>
        {error&&<div className="error-banner">{error}</div>}
        <button className="primary-btn" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in to VYRO":"Create account"} <span>↗</span></button>
      </form>
      <button className="switch-auth" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}> {mode==="login"?"New here? Create an account":"Already have an account? Sign in"}</button>
      <div className="auth-security">Passwords are protected by the VYRO server. Never share your password.</div>
    </div></section>
  </main>;

  return <main className="app">
    <header className="topbar"><div className="brand"><span className="brand-symbol">V</span> VYRO <i>CHAT NETWORK</i></div><div className="top-user"><span className="status-dot"/>{user.full_name}<button onClick={logout}>Sign out</button></div></header>
    <div className="app-layout">
      <nav className="rail"><button className={tab==="chats"?"rail-btn active": "rail-btn"} onClick={()=>setTab("chats")} title="Chats">▤</button><button className={tab==="people"?"rail-btn active":"rail-btn"} onClick={()=>setTab("people")} title="People">♧</button><button className={tab==="profile"?"rail-btn active":"rail-btn"} onClick={()=>setTab("profile")} title="Profile">◉</button><div className="rail-spacer"/><div className="rail-avatar">{user.username.slice(0,1).toUpperCase()}</div></nav>
      {tab==="chats"&&<><aside className="chat-sidebar"><div className="side-heading"><div><div className="eyebrow">YOUR SPACE</div><h2>Messages</h2></div><button className="square-btn" title="New direct chat" onClick={()=>setTab("people")}>＋</button></div><div className="search-box">⌕ <input placeholder="Search conversations"/></div><div className="list-label">RECENT</div>{conversations.map(c=><button key={c.id} className={active?.id===c.id?"chat-entry selected":"chat-entry"} onClick={()=>setActive(c)}><span className="chat-avatar">{(c.peer?.username||c.title||"V").slice(0,1).toUpperCase()}</span><span className="chat-entry-copy"><b>{c.kind==="direct"?(c.peer?.display_name||c.peer?.full_name||c.peer?.username):c.title}</b><small>{c.last_message||"No messages yet"}</small></span></button>)}{!conversations.length&&<p className="muted tiny">＋ dabakar friend ka username add karo.</p>}<div className="sidebar-tip"><span>✦</span><b>Your circle, your rules.</b><small>Your conversations</small></div></aside>
      {active?<section className="chat-panel"><div className="chat-head"><div className="chat-avatar large">{(active.peer?.username||active.title||"V").slice(0,1).toUpperCase()}</div><div><b>{active.kind==="direct"?(active.peer?.display_name||active.peer?.full_name||active.peer?.username):active.title}</b><small>{active.kind==="direct"?"Direct message":"Group space"}</small></div><div className="chat-head-actions"><button className="square-btn" title="Search">⌕</button><button className="square-btn" title="Chat appearance" onClick={()=>setShowThemes(v=>!v)}>◐</button></div></div>{showThemes&&<div className="theme-picker"><div><b>Chat atmosphere</b><small>Choose a two-tone gradient</small></div><div className="theme-swatches">{chatThemes.map((name,index)=><button key={name} className={chatTheme===index?"theme-swatch selected":"theme-swatch"} onClick={()=>setChatTheme(index)} title={name}><i className={"swatch-fill swatch-"+index}/><span>{name}</span></button>)}</div></div>}<div className={"messages-area theme-"+chatTheme}><div className="day-divider"><span>START OF CONVERSATION</span></div>{messages.length===0?<div className="empty-chat"><div className="empty-icon">V</div><div className="eyebrow">A FRESH START</div><h2>Say something real.</h2><p>This is your conversation space. Send the first message.</p></div>:messages.map(m=><div className={"message-line "+(m.sender_id===user.id?"mine":"theirs")} key={m.id}><div className={m.sender_id===user.id?"my-message":"their-message"}><span>{m.body}</span><small>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}{m.edited_at?" · edited":""}</small></div><div className="message-reaction-row">{(m.reactions||[]).map(rx=><button key={rx.emoji} className={rx.reacted?"reaction-chip reacted":"reaction-chip"} onClick={()=>toggleReaction(m.id,rx.emoji)} disabled={reactionBusy===m.id+rx.emoji}>{rx.emoji} <span>{rx.count}</span></button>)}<div className="quick-reactions">{["❤️","😂","🔥","👍","😍","✨"].map(emoji=><button key={emoji} onClick={()=>toggleReaction(m.id,emoji)} disabled={!!reactionBusy} aria-label={"React "+emoji}>{emoji}</button>)}</div></div></div>)}</div><form className="message-composer" onSubmit={sendMessage}><button type="button" className="attach-btn" title="Attachments coming with live chat">＋</button><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write a message…" /><button className="send-btn" disabled={!message.trim()}>↑</button></form></section>:<section className="chat-panel"><div className="empty-chat"><h2>No conversations yet</h2><p>＋ dabakar friend ka username add karo.</p></div></section>}</>}
      {tab==="people"&&<section className="content-panel"><div className="eyebrow">YOUR CIRCLE</div><h1>People</h1><p className="muted">Friend requests first. Chat starts only after both people accept.</p>
        <form className="friend-add-form" onSubmit={sendFriendRequest}><input value={friendUsername} onChange={e=>setFriendUsername(e.target.value)} placeholder="Friend's exact VYRO username" minLength={3} maxLength={24} required/><button className="primary-btn" disabled={!friendUsername.trim()}>Send request ↗</button></form>
        {peopleError&&<div className="error-banner">{peopleError}</div>}
        <div className="people-section"><h3>Friend requests <span>{friends.incoming.length}</span></h3>{friends.incoming.length?friends.incoming.map(f=><div className="person-row" key={f.id}><div><b>{f.full_name}</b><small>@{f.username}</small></div><button onClick={()=>respondFriend(f.id,"accept")}>Accept</button><button className="secondary-person" onClick={()=>respondFriend(f.id,"decline")}>Decline</button></div>):<p className="muted tiny">No pending requests.</p>}</div>
        <div className="people-section"><h3>Your friends <span>{friends.friends.length}</span></h3>{friends.friends.length?friends.friends.map(f=><div className="person-row" key={f.id}><div><b>{f.display_name||f.full_name}</b><small>@{f.username}</small></div><button onClick={()=>newDirectChat(f.username)}>Message</button></div>):<p className="muted tiny">No friends added yet. Send a request above.</p>}</div>
        <div className="people-section"><h3>Sent requests <span>{friends.outgoing.length}</span></h3>{friends.outgoing.map(f=><div className="person-row" key={f.id}><div><b>{f.full_name}</b><small>@{f.username} · Pending</small></div></div>)}</div></section>}
      {tab==="profile"&&<section className="content-panel profile-page"><div className="eyebrow">VYRO / PROFILE STUDIO</div><h1>Build your identity.</h1><p className="studio-intro">Your avatar, animated effects and nameplates live here — separate from your chats.</p><div className="profile-preview"><div className={"big-avatar effect-"+effect}>{user.username.slice(0,1).toUpperCase()}<i>{effects.find(x=>x[0]===effect)?.[2]}</i></div><div><h2>{user.full_name}</h2><p>@{user.username}</p><span className="plate-chip">{plate}</span></div></div><div className="studio-tabs"><button className={profileTab==="avatar"?"active":""} onClick={()=>setProfileTab("avatar")}>Avatar effects</button><button className={profileTab==="plate"?"active":""} onClick={()=>setProfileTab("plate")}>Nameplates</button></div>{profileTab==="avatar"?<div className="cosmetic-grid">{effects.map(([id,name,symbol])=><button key={id} className={effect===id?"cosmetic-card chosen":"cosmetic-card"} onClick={()=>saveCosmetic("equipped_avatar_effect",id)}><span className={"cosmetic-symbol effect-"+id}><i>{symbol}</i><b>{symbol}</b></span><b>{name}</b><small>{effect===id?"EQUIPPED":"TAP TO EQUIP"}</small></button>)}</div>:<div className="plate-grid">{plates.map(p=><button key={p} className={plate===p?"plate-option chosen":"plate-option"} onClick={()=>{const item=cosmetics.find(c=>c.cosmetic_type==="nameplate"&&c.display_name===p);if(item)saveCosmetic("equipped_nameplate",item.slug);}}>{p}{plate===p?" ✓":""}</button>)}</div>}<p className="muted tiny">Selections save to your account when the server is connected.</p></section>}
    </div>
    <CallCenter conversation={active} user={user} />
    <footer className="app-footer"><span>VYRO © 2026</span><span>CREATED BY AADI ⚡</span><button onClick={checkLocation}> {location==="verified"?"✓ LOCATION PERMISSION GRANTED":"CHECK LOCATION PERMISSION"}</button></footer>
    {location!=="not-checked"&&<div className="location-status">{location==="checking"?"Checking location permission…":locationText||"Location status"} <button onClick={()=>{setLocation("not-checked");setLocationText("");}}>×</button><small>Location permission is checked only when you tap this button. This does not verify identity, and coordinates are not sent to VYRO.</small></div>}
  </main>;
}
