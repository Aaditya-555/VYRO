import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";

const app = express();
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.");
}
if (!process.env.CLIENT_ORIGIN) throw new Error("CLIENT_ORIGIN is required.");

app.set("trust proxy", isProduction ? 1 : 0);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
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
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "vyro-api" }));
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

app.use((err, _req, res, _next) => {
  console.error("Request failed:", err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`VYRO API listening on port ${port}`));
