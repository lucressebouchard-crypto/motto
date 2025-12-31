-- Activer Realtime pour les tables nécessaires
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Activer Realtime pour les messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Activer Realtime pour les chats
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- Activer Realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

