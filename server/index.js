import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import groupsRouter from "./routes/groups.js";
import messagesRouter from "./routes/messages.js";
import conversationsRouter from "./routes/conversations.js";
import friendsRouter from "./routes/friends.js";

const app = express();
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.");
}
if (!allowedOrigins.length) throw new Error("CLIENT_ORIGIN is required (comma-separated allowed app origins).");

app.set("trust proxy", isProduction ? 1 : 0);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Native Capacitor requests may omit Origin; browser origins must be allow-listed.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This app origin is not allowed by VYRO."));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "20kb" }));
app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  name: "vyro.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    // Android WebView (https://localhost) and a separately hosted web client
    // call the API cross-site, so production cookies must allow credentialed requests.
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", database: "connected", service: "vyro-api" });
  } catch {
    return res.status(503).json({ status: "error", database: "unavailable", service: "vyro-api" });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/friends", friendsRouter);

app.use((err, _req, res, _next) => {
  console.error("Request failed:", err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`VYRO API listening on port ${port}`));
