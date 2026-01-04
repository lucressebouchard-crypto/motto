-- Table pour tracker la présence des utilisateurs
-- Basée sur la dernière activité dans les messages

-- Fonction pour mettre à jour la dernière activité d'un utilisateur
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour updated_at de l'utilisateur lors de l'envoi d'un message
  UPDATE users
  SET updated_at = NOW()
  WHERE id = NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement la dernière activité
DROP TRIGGER IF EXISTS trigger_update_user_activity ON messages;
CREATE TRIGGER trigger_update_user_activity
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_user_last_activity();

