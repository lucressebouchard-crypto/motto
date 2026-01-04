-- Activer Realtime pour les tables nécessaires
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Activer Realtime pour les messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Activer Realtime pour les chats
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- Activer Realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Activer Realtime pour message_reads (pour les badges)
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;

-- Activer Realtime pour users (pour le statut en ligne)
ALTER PUBLICATION supabase_realtime ADD TABLE users;

