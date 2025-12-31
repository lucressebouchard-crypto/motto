-- Fix: Add missing INSERT policy for users table
-- Supprimer la policy si elle existe déjà (pour éviter les doublons)
DROP POLICY IF EXISTS "Users can create their own profile" ON users;

CREATE POLICY "Users can create their own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Fix: Create profile for existing user in auth.users but not in users table
-- Replace '9101af7c-01c8-4d70-9ce4-b129f251c23a' with the actual user ID from Auth if different
INSERT INTO users (id, email, name, role, avatar)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
  COALESCE(raw_user_meta_data->>'role', 'buyer')::text as role,
  'https://ui-avatars.com/api/?name=' || split_part(email, '@', 1) || '&background=6366f1&color=fff' as avatar
FROM auth.users
WHERE id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;

