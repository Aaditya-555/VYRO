-- VYRO schema for Supabase-hosted PostgreSQL. Apply in Supabase SQL Editor.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS profiles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name VARCHAR(60) NOT NULL,
 username VARCHAR(24) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 bio VARCHAR(160) NOT NULL DEFAULT '', status_text VARCHAR(60) NOT NULL DEFAULT '',
 avatar_url TEXT, banner_url TEXT,
 equipped_frame TEXT NOT NULL DEFAULT 'ember-frame',
 equipped_nameplate TEXT NOT NULL DEFAULT 'crimson-nameplate',
 equipped_avatar_effect TEXT NOT NULL DEFAULT 'red-aura',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio VARCHAR(160) NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_text VARCHAR(60) NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_frame TEXT NOT NULL DEFAULT 'ember-frame';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_nameplate TEXT NOT NULL DEFAULT 'crimson-nameplate';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_avatar_effect TEXT NOT NULL DEFAULT 'red-aura';
CREATE TABLE IF NOT EXISTS invite_codes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code_hash TEXT NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ,
 max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
 uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0), revoked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), kind TEXT NOT NULL CHECK (kind IN ('direct','group')),
 title VARCHAR(80), created_by UUID NOT NULL REFERENCES profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conversation_members (
 conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
 joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (conversation_id,user_id)
);
CREATE TABLE IF NOT EXISTS messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES profiles(id), body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), edited_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages(conversation_id,created_at DESC);
CREATE TABLE IF NOT EXISTS cosmetic_catalog (
 slug TEXT PRIMARY KEY, cosmetic_type TEXT NOT NULL CHECK (cosmetic_type IN ('frame','nameplate','avatar_effect','badge')),
 display_name VARCHAR(40) NOT NULL, rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
 preview_token TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS user_cosmetics (
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 cosmetic_slug TEXT NOT NULL REFERENCES cosmetic_catalog(slug),
 unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id,cosmetic_slug)
);
INSERT INTO cosmetic_catalog (slug,cosmetic_type,display_name,rarity,preview_token) VALUES
('ember-frame','frame','Ember Frame','common','ember'),
('neon-frame','frame','Neon Circuit','rare','neon'),
('inferno-frame','frame','Inferno Crown','epic','inferno'),
('crimson-nameplate','nameplate','Crimson Plate','common','crimson'),
('void-nameplate','nameplate','Void Glitch','rare','void'),
('royal-nameplate','nameplate','Royal Voltage','epic','royal'),
('red-aura','avatar_effect','Red Aura','common','aura'),
('lightning-aura','avatar_effect','Lightning Pulse','rare','lightning'),
('flame-aura','avatar_effect','Flame Orbit','epic','flame'),
('founder-badge','badge','Founder','legendary','founder')
ON CONFLICT (slug) DO NOTHING;

-- 15 additional nameplates and 15 avatar decorations: cute, clean and high-impact styles.
INSERT INTO cosmetic_catalog (slug,cosmetic_type,display_name,rarity,preview_token) VALUES
('soft-cloud','nameplate','Soft Cloud','common','cloud'),
('berry-pop','nameplate','Berry Pop','common','berry'),
('peach-blush','nameplate','Peach Blush','common','peach'),
('lilac-dream','nameplate','Lilac Dream','common','lilac'),
('moonlight','nameplate','Moonlight','rare','moon'),
('ocean-glass','nameplate','Ocean Glass','rare','ocean'),
('mint-charm','nameplate','Mint Charm','common','mint'),
('rose-gold','nameplate','Rose Gold','rare','rosegold'),
('starlit','nameplate','Starlit','rare','stars'),
('crimson-royal','nameplate','Crimson Royal','epic','crimson'),
('void-glitch','nameplate','Void Glitch','epic','glitch'),
('cyber-grid','nameplate','Cyber Grid','epic','cyber'),
('dragon-sigil','nameplate','Dragon Sigil','legendary','dragon'),
('abyss-king','nameplate','Abyss King','legendary','abyss'),
('solar-overdrive','nameplate','Solar Overdrive','legendary','solar'),
('heart-spark','avatar_effect','Heart Spark','common','heart'),
('kitty-halo','avatar_effect','Kitty Halo','common','kitty'),
('butterfly-drift','avatar_effect','Butterfly Drift','common','butterfly'),
('bubble-orbit','avatar_effect','Bubble Orbit','common','bubble'),
('cherry-blossom','avatar_effect','Cherry Blossom','rare','blossom'),
('starry-aura','avatar_effect','Starry Aura','rare','starry'),
('crystal-wings','avatar_effect','Crystal Wings','rare','crystal'),
('angel-ring','avatar_effect','Angel Ring','rare','angel'),
('aurora-ribbon','avatar_effect','Aurora Ribbon','rare','aurora'),
('neon-serpent','avatar_effect','Neon Serpent','epic','serpent'),
('cyber-dragon','avatar_effect','Cyber Dragon','legendary','cyberdragon'),
('inferno-wings','avatar_effect','Inferno Wings','epic','inferno'),
('void-tentacles','avatar_effect','Void Tentacles','legendary','void'),
('thunder-storm','avatar_effect','Thunder Storm','epic','thunder'),
('phoenix-rebirth','avatar_effect','Phoenix Rebirth','legendary','phoenix')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO user_cosmetics (user_id,cosmetic_slug)
SELECT p.id,c.slug FROM profiles p CROSS JOIN cosmetic_catalog c
WHERE c.cosmetic_type IN ('frame','nameplate','avatar_effect') AND c.is_active = true
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS moderation_audit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), moderator_id UUID NOT NULL REFERENCES profiles(id),
 action TEXT NOT NULL, target_user_id UUID REFERENCES profiles(id), conversation_id UUID REFERENCES conversations(id),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Create invite codes out-of-band:
-- INSERT INTO invite_codes (code_hash,max_uses,expires_at)
-- VALUES (encode(digest('ONE-TIME-CODE','sha256'),'hex'),1,now()+interval '7 days');
-- Never store raw invite codes or passwords in source control.
