import { Router } from "express";
import { pool } from "../db.js";

const router = Router();
const signedIn = (req, res, next) => req.session.userId ? next() : res.status(401).json({ error: "Not signed in." });

router.get("/:conversationId", signedIn, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const channelId = typeof req.query.channelId === "string" ? req.query.channelId : null;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 40, 1), 100);
    const member = await pool.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",
      [conversationId, req.session.userId]
    );
    if (!member.rowCount) return res.status(404).json({ error: "Conversation not found." });

    if (channelId) {
      const channel = await pool.query(
        "SELECT 1 FROM conversation_channels WHERE id=$1 AND conversation_id=$2",
        [channelId, conversationId]
      );
      if (!channel.rowCount) return res.status(404).json({ error: "Channel not found." });
    }

    const result = await pool.query(
      `SELECT m.id,m.conversation_id,m.channel_id,m.sender_id,p.username,p.display_name,
              m.body,m.created_at,m.edited_at,m.deleted_at,
              COALESCE((SELECT json_agg(json_build_object('emoji',rx.emoji,'count',rx.reaction_count,'reacted',rx.reacted))
                FROM (SELECT mr.emoji,COUNT(*)::int AS reaction_count,
                      BOOL_OR(mr.user_id=$4) AS reacted
                      FROM message_reactions mr WHERE mr.message_id=m.id GROUP BY mr.emoji) rx),'[]'::json) AS reactions
       FROM messages m JOIN profiles p ON p.id=m.sender_id
       WHERE m.conversation_id=$1 AND (($2::uuid IS NULL AND m.channel_id IS NULL) OR m.channel_id=$2)
       ORDER BY m.created_at DESC LIMIT $3`,
      [conversationId, channelId, limit, req.session.userId]
    );
    return res.json({ messages: result.rows.reverse() });
  } catch (error) { next(error); }
});

router.post("/:conversationId", signedIn, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    const channelId = typeof req.body?.channelId === "string" ? req.body.channelId : null;
    if (!body || body.length > 10000) return res.status(400).json({ error: "Message must contain 1–10,000 characters." });

    const member = await pool.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",
      [conversationId, req.session.userId]
    );
    if (!member.rowCount) return res.status(404).json({ error: "Conversation not found." });

    if (channelId) {
      const channel = await pool.query(
        "SELECT 1 FROM conversation_channels WHERE id=$1 AND conversation_id=$2",
        [channelId, conversationId]
      );
      if (!channel.rowCount) return res.status(404).json({ error: "Channel not found." });
    }

    const result = await pool.query(
      `INSERT INTO messages(conversation_id,channel_id,sender_id,body)
       VALUES($1,$2,$3,$4)
       RETURNING id,conversation_id,channel_id,sender_id,body,created_at,edited_at,deleted_at`,
      [conversationId, channelId, req.session.userId, body]
    );
    return res.status(201).json({ message: result.rows[0] });
  } catch (error) { next(error); }
});

router.post("/:conversationId/:messageId/reactions", signedIn, async (req, res, next) => {
  try {
    const emoji = typeof req.body?.emoji === "string" ? req.body.emoji : "";
    const allowed = ["❤️","😂","🔥","👍","😍","😭","✨","🎉"];
    if (!allowed.includes(emoji)) return res.status(400).json({ error: "Choose a supported reaction." });
    const member = await pool.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",
      [req.params.conversationId, req.session.userId]
    );
    if (!member.rowCount) return res.status(404).json({ error: "Conversation not found." });
    const message = await pool.query(
      "SELECT 1 FROM messages WHERE id=$1 AND conversation_id=$2 AND deleted_at IS NULL",
      [req.params.messageId, req.params.conversationId]
    );
    if (!message.rowCount) return res.status(404).json({ error: "Message not found." });
    const removed = await pool.query(
      "DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3 RETURNING message_id",
      [req.params.messageId, req.session.userId, emoji]
    );
    if (!removed.rowCount) await pool.query(
      "INSERT INTO message_reactions(message_id,user_id,emoji) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [req.params.messageId, req.session.userId, emoji]
    );
    return res.json({ ok: true, toggledOff: Boolean(removed.rowCount) });
  } catch (error) { next(error); }
});

router.patch("/:conversationId/:messageId", signedIn, async (req, res, next) => {
  try {
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body || body.length > 10000) return res.status(400).json({ error: "Message must contain 1–10,000 characters." });
    const result = await pool.query(
      `UPDATE messages m SET body=$1,edited_at=now()
       WHERE m.id=$2 AND m.conversation_id=$3 AND m.sender_id=$4 AND m.deleted_at IS NULL
         AND EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=m.conversation_id AND cm.user_id=$4)
       RETURNING m.id,m.conversation_id,m.channel_id,m.sender_id,m.body,m.created_at,m.edited_at,m.deleted_at`,
      [body, req.params.messageId, req.params.conversationId, req.session.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Message not found or cannot be edited." });
    return res.json({ message: result.rows[0] });
  } catch (error) { next(error); }
});

router.delete("/:conversationId/:messageId", signedIn, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE messages m SET deleted_at=now(),body='[message deleted]'
       WHERE m.id=$1 AND m.conversation_id=$2 AND m.sender_id=$3 AND m.deleted_at IS NULL
         AND EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=m.conversation_id AND cm.user_id=$3)
       RETURNING m.id`,
      [req.params.messageId, req.params.conversationId, req.session.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Message not found or cannot be deleted." });
    return res.json({ deleted: true });
  } catch (error) { next(error); }
});

export default router;
