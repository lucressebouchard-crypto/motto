-- Fonction pour obtenir le nombre de messages non lus dans un chat
CREATE OR REPLACE FUNCTION get_unread_message_count(p_chat_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM messages m
    WHERE m.chat_id = p_chat_id
      AND m.sender_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 
        FROM message_reads mr 
        WHERE mr.message_id = m.id 
          AND mr.user_id = p_user_id
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

