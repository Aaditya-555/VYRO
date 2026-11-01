import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not signed in." });
    const results = await Promise.all([
      pool.query("SELECT id,full_name,username,bio,status_text,avatar_url,banner_url,equipped_frame,equipped_nameplate,equipped_avatar_effect FROM profiles WHERE id=$1", [req.session.userId]),
      pool.query("SELECT c.slug,c.cosmetic_type,c.display_name,c.rarity,c.preview_token FROM user_cosmetics u JOIN cosmetic_catalog c ON c.slug=u.cosmetic_slug WHERE u.user_id=$1 AND c.is_active=true ORDER BY c.cosmetic_type,c.display_name", [req.session.userId])
    ]);
    if (!results[0].rowCount) return res.status(404).json({ error: "Profile not found." });
    return res.json({ profile: results[0].rows[0], unlockedCosmetics: results[1].rows });
  } catch (error) { next(error); }
});

router.patch("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not signed in." });
    const { bio, statusText, equippedFrame, equippedNameplate, equippedAvatarEffect } = req.body ?? {};
    if (bio !== undefined && (typeof bio !== "string" || bio.length > 160)) return res.status(400).json({ error: "Bio must be 160 characters or fewer." });
    if (statusText !== undefined && (typeof statusText !== "string" || statusText.length > 60)) return res.status(400).json({ error: "Status must be 60 characters or fewer." });

    const choices = [
      { type: "frame", slug: equippedFrame, column: "equipped_frame" },
      { type: "nameplate", slug: equippedNameplate, column: "equipped_nameplate" },
      { type: "avatar_effect", slug: equippedAvatarEffect, column: "equipped_avatar_effect" }
    ].filter(item => item.slug !== undefined);

    for (const item of choices) {
      if (typeof item.slug !== "string") return res.status(400).json({ error: "Invalid profile decoration." });
      const owned = await pool.query(
        "SELECT 1 FROM user_cosmetics u JOIN cosmetic_catalog c ON c.slug=u.cosmetic_slug WHERE u.user_id=$1 AND u.cosmetic_slug=$2 AND c.cosmetic_type=$3 AND c.is_active=true",
        [req.session.userId, item.slug, item.type]
      );
      if (!owned.rowCount) return res.status(403).json({ error: "That decoration is not unlocked for this account." });
    }

    const sets = [];
    const values = [req.session.userId];
    if (bio !== undefined) { values.push(bio.trim()); sets.push("bio=$" + values.length); }
    if (statusText !== undefined) { values.push(statusText.trim()); sets.push("status_text=$" + values.length); }
    for (const item of choices) { values.push(item.slug); sets.push(item.column + "=$" + values.length); }
    if (!sets.length) return res.status(400).json({ error: "No profile changes provided." });
    sets.push("updated_at=now()");
    const result = await pool.query(
      "UPDATE profiles SET " + sets.join(",") + " WHERE id=$1 RETURNING id,full_name,username,bio,status_text,equipped_frame,equipped_nameplate,equipped_avatar_effect",
      values
    );
    return res.json({ profile: result.rows[0] });
  } catch (error) { next(error); }
});

export default router;
