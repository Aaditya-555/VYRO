import { useEffect, useState } from "react";

const nameplates = [
  ["soft-cloud","☁️ Soft Cloud"],["berry-pop","🍓 Berry Pop"],["peach-blush","🍑 Peach Blush"],
  ["lilac-dream","🪻 Lilac Dream"],["moonlight","🌙 Moonlight"],["ocean-glass","🌊 Ocean Glass"],
  ["mint-charm","🍃 Mint Charm"],["rose-gold","🌹 Rose Gold"],["starlit","✨ Starlit"],
  ["crimson-royal","👑 Crimson Royal"],["void-glitch","🌀 Void Glitch"],["cyber-grid","▦ Cyber Grid"],
  ["dragon-sigil","🐉 Dragon Sigil"],["abyss-king","♛ Abyss King"],["solar-overdrive","☀️ Solar Overdrive"]
];
const avatarDecorations = [
  ["heart-spark","💗 Heart Spark"],["kitty-halo","🐱 Kitty Halo"],["butterfly-drift","🦋 Butterfly Drift"],
  ["bubble-orbit","🫧 Bubble Orbit"],["cherry-blossom","🌸 Cherry Blossom"],["starry-aura","⭐ Starry Aura"],
  ["crystal-wings","💎 Crystal Wings"],["angel-ring","😇 Angel Ring"],["aurora-ribbon","🌈 Aurora Ribbon"],
  ["neon-serpent","🐍 Neon Serpent"],["cyber-dragon","🐲 Cyber Dragon"],["inferno-wings","🔥 Inferno Wings"],
  ["void-tentacles","🖤 Void Tentacles"],["thunder-storm","⚡ Thunder Storm"],["phoenix-rebirth","🪽 Phoenix Rebirth"]
];

const chats = [
  { name: "VYRO Updates", message: "Welcome to the next wave.", time: "Now", unread: 2, avatar: "V", color: "red", online: true },
  { name: "Aarav", message: "That new interface looks clean 🔥", time: "10:42", unread: 1, avatar: "A", color: "violet", online: true },
  { name: "Design Crew", message: "You: Let's review the screens", time: "Yesterday", unread: 0, avatar: "D", color: "blue", online: false },
  { name: "Mira", message: "Sent a photo", time: "Yesterday", unread: 0, avatar: "M", color: "pink", online: false },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState("login");
  const [activeChat, setActiveChat] = useState(chats[0]);
  const [message, setMessage] = useState("");
  const [typingVisible, setTypingVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, chat: "VYRO Updates", name: "VYRO Updates", text: "Hey! Welcome to VYRO.", time: "11:26", kind: "received" },
    { id: 2, chat: "VYRO Updates", name: "You", text: "The future of conversations starts here.", time: "11:27", kind: "sent", status: "read" },
    { id: 3, chat: "Aarav", name: "Aarav", text: "That new interface looks clean 🔥", time: "10:42", kind: "received" },
    { id: 4, chat: "Design Crew", name: "You", text: "Let's review the screens", time: "Yesterday", kind: "sent", status: "delivered" },
    { id: 5, chat: "Mira", name: "Mira", text: "Sent a photo 📷", time: "Yesterday", kind: "received" }
  ]);
  const [frame, setFrame] = useState("ember");
  const [nameplate, setNameplate] = useState("soft-cloud");
  const [avatarEffect, setAvatarEffect] = useState("heart-spark");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setTypingVisible(false);
    const start = window.setTimeout(() => setTypingVisible(true), 900);
    const stop = window.setTimeout(() => setTypingVisible(false), 5200);
    return () => { window.clearTimeout(start); window.clearTimeout(stop); };
  }, [activeChat.name]);

  if (showSplash) {
    return (
      <main className="splash">
        <div className="splash-mark">V<span>Y</span>RO</div>
        <div className="splash-line" />
        <p>CONNECT BEYOND LIMITS</p>
        <small>CREATED BY AADI⚡</small>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="VYRO home"><span className="brand-mark">V</span> VYRO</a>
        <span className="tagline">CONNECT BEYOND LIMITS</span>
        <button className="icon-button" aria-label="Settings">⚙</button>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="profile-row">
            <div className="avatar avatar-red">A</div>
            <div><strong>Your space</strong><small>Preview mode</small></div>
            <span className="online-dot" />
          </div>
          <div className="section-label">MESSAGES <button className="tiny-button" aria-label="New chat">＋</button></div>
          <label className="search"><span>⌕</span><input placeholder="Search chats" /></label>
          <div className="chat-list">
            {chats.map((chat) => (
              <button key={chat.name} className={activeChat.name === chat.name ? "chat-item selected" : "chat-item"} onClick={() => setActiveChat(chat)}>
                <span className={`avatar avatar-${chat.color}`}>{chat.avatar}</span>
                <span className="chat-copy"><strong>{chat.name}</strong><small>{chat.message}</small></span>
                <span className="chat-meta"><small>{chat.time}</small>{chat.unread > 0 && <i>{chat.unread}</i>}</span>
              </button>
            ))}
          </div>
          <div className="sidebar-bottom"><span>✦</span> Your conversations, your control.</div>
        </aside>

        <section className="conversation">
          <div className="conversation-head">
            <div className={`avatar avatar-${activeChat.color}`}>{activeChat.avatar}</div>
            <div><strong>{activeChat.name}</strong><small>{activeChat.online ? "● Online" : "Last seen recently"}</small></div>
            <div className="head-actions"><button className="icon-button" aria-label="Voice call">⌕</button><button className="icon-button" aria-label="More options">•••</button></div>
          </div>
          <div className="message-area">
            <div className="date-chip">TODAY</div>
            <div className="welcome-card">
              <div className="welcome-symbol">V</div>
              <h1>Welcome to <em>VYRO</em></h1>
              <p>A fresh space to connect, share and create.</p>
              <span>UI PREVIEW · MESSAGES STAY ON THIS DEVICE ONLY</span>
            </div>
            <div className="chat-stream">
              {chatMessages.filter((item) => item.chat === activeChat.name).map((item) => (
                <div key={item.id} className={"message-row " + item.kind}>
                  {item.kind === "received" && <span className="message-avatar">{activeChat.avatar}</span>}
                  <div className={"bubble " + item.kind}>
                    {item.kind === "received" && <strong className="bubble-author">{item.name}</strong>}
                    <span className="bubble-text">{item.text}</span>
                    <small className="bubble-meta">{item.time}{item.kind === "sent" && <span className={item.status === "read" ? "read-ticks" : ""}> {item.status === "read" ? "✓✓" : "✓"}</span>}</small>
                  </div>
                </div>
              ))}
              {typingVisible && activeChat.online && (
                <div className="message-row received typing-row">
                  <span className="message-avatar">{activeChat.avatar}</span>
                  <div className="typing-bubble"><span></span><span></span><span></span><small>{activeChat.name} is typing</small></div>
                </div>
              )}
            </div>
          </div>
          <form className="composer" onSubmit={(event) => {
            event.preventDefault();
            const text = message.trim();
            if (!text) return;
            setChatMessages((items) => [...items, { id: Date.now(), chat: activeChat.name, name: "You", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), kind: "sent", status: "sent" }]);
            setMessage("");
          }}>
            <button type="button" className="icon-button" aria-label="Attach file">＋</button>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message..." />
            <button type="submit" className="send-button" disabled={!message.trim()} aria-label="Send message">➤</button>
          </form>
        </section>

        <aside className="details profile-studio">
          <div className="details-glow" />
          <div className="studio-label">PROFILE CUSTOMIZER</div>
          <div className={`details-avatar profile-avatar frame-${frame} effect-${avatarEffect}`}>A</div>
          <div className={`nameplate plate-${nameplate}`}><h2>AADI</h2><span>@your_username</span></div>
          <p className="profile-bio">Building my space in VYRO ⚡</p>
          <div className="profile-badge">✦ EARLY MEMBER</div>
          <div className="detail-rule" />
          <div className="cosmetic-group"><strong>AVATAR FRAME</strong><div className="cosmetic-options">
            <button className={frame === "ember" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setFrame("ember")}>Ember</button>
            <button className={frame === "neon" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setFrame("neon")}>Neon</button>
            <button className={frame === "inferno" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setFrame("inferno")}>Inferno</button>
          </div></div>
          <div className="cosmetic-group"><strong>NAMEPLATES · 15 STYLES</strong><div className="cosmetic-grid">
            {nameplates.map(([id, label]) => <button key={id} className={nameplate === id ? "cosmetic-tile active" : "cosmetic-tile"} onClick={() => setNameplate(id)}>{label}</button>)}
          </div></div>
          <div className="cosmetic-group"><strong>AVATAR DECORATIONS · 15 STYLES</strong><div className="cosmetic-grid">
            {avatarDecorations.map(([id, label]) => <button key={id} className={avatarEffect === id ? "cosmetic-tile active" : "cosmetic-tile"} onClick={() => setAvatarEffect(id)}>{label}</button>)}
          </div></div>
          <div className="preview-note"><b>Live preview</b><br />Try frames, nameplates and avatar effects. Account sync and unlocks connect when the live service is deployed.</div>
        </aside>
      </section>
      <footer className="footer"><span>VYRO © 2026</span><span className="creator-credit">CREATED BY AADI⚡</span><span>EARLY UI FOUNDATION <b>●</b></span></footer>
    </main>
  );
}