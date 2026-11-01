import { useEffect, useState } from "react";

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
  const [frame, setFrame] = useState("ember");
  const [nameplate, setNameplate] = useState("crimson");
  const [avatarEffect, setAvatarEffect] = useState("aura");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

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
              <span>THIS IS A UI PREVIEW — MESSAGES ARE NOT SENT OR STORED</span>
            </div>
            <div className="bubble received">Hey! Welcome to VYRO.<small>11:26 ✓</small></div>
            <div className="bubble sent">The future of conversations starts here.<small>11:27 ✓✓</small></div>
          </div>
          <form className="composer" onSubmit={(event) => { event.preventDefault(); setMessage(""); }}>
            <button type="button" className="icon-button" aria-label="Attach file">＋</button>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Preview only — messaging will be connected later" />
            <button type="submit" className="send-button" disabled={!message.trim()} aria-label="Send preview message">➤</button>
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
          <div className="cosmetic-group"><strong>NAMEPLATE</strong><div className="cosmetic-options">
            <button className={nameplate === "crimson" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setNameplate("crimson")}>Crimson</button>
            <button className={nameplate === "void" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setNameplate("void")}>Void</button>
            <button className={nameplate === "royal" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setNameplate("royal")}>Royal</button>
          </div></div>
          <div className="cosmetic-group"><strong>AVATAR EFFECT</strong><div className="cosmetic-options">
            <button className={avatarEffect === "aura" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setAvatarEffect("aura")}>Aura</button>
            <button className={avatarEffect === "lightning" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setAvatarEffect("lightning")}>⚡ Pulse</button>
            <button className={avatarEffect === "flame" ? "cosmetic-choice active" : "cosmetic-choice"} onClick={() => setAvatarEffect("flame")}>Flame</button>
          </div></div>
          <div className="preview-note"><b>Live preview</b><br />Try frames, nameplates and avatar effects. Account sync and unlocks connect when the live service is deployed.</div>
        </aside>
      </section>
      <footer className="footer"><span>VYRO © 2026</span><span className="creator-credit">CREATED BY AADI⚡</span><span>EARLY UI FOUNDATION <b>●</b></span></footer>
    </main>
  );
}