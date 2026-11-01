import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { pool } from "../db.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait and try again." },
});

const validUsername = (value) => typeof value === "string" && /^[a-zA-Z0-9_]{3,24}$/.test(value);
const validPassword = (value) => typeof value === "string" && value.length >= 10 && value.length <= 72;

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { fullName, username, password, inviteCode } = req.body ?? {};
    if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 60) {
      return res.status(400).json({ error: "Enter a name between 2 and 60 characters." });
    }
    if (!validUsername(username)) {
      return res.status(400).json({ error: "Username must be 3–24 characters: letters, numbers or underscore." });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ error: "Password must be 10–72 characters long." });
    }
    if (typeof inviteCode !== "string" || !inviteCode.trim()) {
      return res.status(400).json({ error: "An invite code is required to create an account." });
    }

    const invite = await pool.query(
      "SELECT id FROM invite_codes WHERE code_hash = encode(digest($1, 'sha256'), 'hex') AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses < max_uses) LIMIT 1",
      [inviteCode.trim()]
    );
    if (!invite.rowCount) return res.status(403).json({ error: "This invite code is invalid or expired." });

    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockedInvite = await client.query(
        "SELECT id FROM invite_codes WHERE id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses < max_uses) FOR UPDATE",
        [invite.rows[0].id]
      );
      if (!lockedInvite.rowCount) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "This invite code is no longer available." });
      }
      const created = await client.query(
        "INSERT INTO profiles (full_name, username, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, username, created_at",
        [fullName.trim(), username.toLowerCase(), passwordHash]
      );
      await client.query("UPDATE invite_codes SET uses = uses + 1 WHERE id = $1", [invite.rows[0].id]);
      await client.query("INSERT INTO user_cosmetics (user_id, cosmetic_slug) VALUES ($1, 'ember-frame'), ($1, 'crimson-nameplate'), ($1, 'red-aura') ON CONFLICT DO NOTHING", [created.rows[0].id]);
      await client.query("COMMIT");
      req.session.regenerate((sessionError) => {
        if (sessionError) return next(sessionError);
        req.session.userId = created.rows[0].id;
        req.session.save((saveError) => {
          if (saveError) return next(saveError);
          return res.status(201).json({ user: created.rows[0] });
        });
      });
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") return res.status(409).json({ error: "That username is already taken." });
      throw error;
    } finally {
      client.release();
    }
  } catch (error) { next(error); }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    if (!validUsername(username) || typeof password !== "string" || password.length > 72) {
      return res.status(400).json({ error: "Enter a valid username and password." });
    }
    const result = await pool.query(
      "SELECT id, full_name, username, password_hash FROM profiles WHERE username = $1 LIMIT 1",
      [username.toLowerCase()]
    );
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) return res.status(401).json({ error: "Incorrect username or password." });
    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);
      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        return res.json({ user: { id: user.id, full_name: user.full_name, username: user.username } });
      });
    });
  } catch (error) { next(error); }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not signed in." });
    const result = await pool.query(
      "SELECT id, full_name, username, created_at FROM profiles WHERE id = $1",
      [req.session.userId]
    );
    if (!result.rowCount) return res.status(401).json({ error: "Not signed in." });
    return res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("vyro.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return res.status(204).end();
  });
});

export default router;
