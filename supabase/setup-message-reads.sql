-- Table pour suivre les messages lus par les utilisateurs
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_chat_user ON message_reads(user_id, message_id);

-- Enable RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own read status" ON message_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark messages as read" ON message_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fonction pour marquer tous les messages d'un chat comme lus
CREATE OR REPLACE FUNCTION mark_chat_messages_as_read(chat_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO message_reads (message_id, user_id)
  SELECT m.id, user_uuid
  FROM messages m
  WHERE m.chat_id = chat_uuid
    AND m.sender_id != user_uuid
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = user_uuid
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

