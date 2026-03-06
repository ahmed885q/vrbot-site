-- VRBOT CHAT - Supabase Migration
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'ðŸ’¬',
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  edited_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_seen TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT false
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_msg ON chat_reactions(message_id);
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE chat_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_read" ON chat_channels FOR SELECT USING (true);
CREATE POLICY "channels_admin" ON chat_channels FOR ALL USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);
CREATE POLICY "messages_read" ON chat_messages FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = false);
CREATE POLICY "messages_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "messages_update" ON chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reactions_read" ON chat_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "reactions_insert" ON chat_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON chat_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "presence_read" ON chat_presence FOR SELECT USING (true);
CREATE POLICY "presence_write" ON chat_presence FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
INSERT INTO chat_channels (slug, name, icon, description) VALUES
  ('general','Ø¹Ø§Ù…','âš”ï¸','Ù‚Ù†Ø§Ø© Ø§Ù„Ù†Ù‚Ø§Ø´ Ø§Ù„Ø¹Ø§Ù…'),
  ('strategies','Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª','ðŸ—ºï¸','Ø´Ø§Ø±Ùƒ Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§ØªÙƒ'),
  ('support','Ù…Ø³Ø§Ø¹Ø¯Ø© ØªÙ‚Ù†ÙŠØ©','ðŸ”§','Ù…Ø´Ø§ÙƒÙ„ ØªÙ‚Ù†ÙŠØ©ØŸ Ù†Ø­Ù† Ù‡Ù†Ø§'),
  ('farms','Ø§Ù„Ù…Ø²Ø§Ø±Ø¹','ðŸ°','Ù…Ù†Ø§Ù‚Ø´Ø© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø²Ø§Ø±Ø¹')
ON CONFLICT (slug) DO NOTHING;
CREATE OR REPLACE FUNCTION update_presence(p_online BOOLEAN) RETURNS void AS $$
BEGIN
  INSERT INTO chat_presence (user_id, is_online, last_seen) VALUES (auth.uid(), p_online, now())
  ON CONFLICT (user_id) DO UPDATE SET is_online = p_online, last_seen = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE VIEW chat_messages_with_users AS
SELECT m.id, m.channel_id, m.content, m.created_at, m.edited_at, m.user_id,
  u.raw_user_meta_data->>'username' AS username,
  u.raw_user_meta_data->>'role' AS role,
  u.email
FROM chat_messages m LEFT JOIN auth.users u ON m.user_id = u.id WHERE m.deleted = false;