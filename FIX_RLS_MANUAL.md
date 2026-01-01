# 🔧 Solution manuelle : Créer les politiques RLS Storage dans Supabase

Si vous avez toujours l'erreur de permissions après avoir exécuté le script automatique, créez les politiques manuellement dans Supabase Dashboard.

## 📋 Étapes

### 1. Ouvrir Supabase Dashboard

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **MƆ̆TTO**

### 2. Ouvrir l'éditeur SQL

1. Dans le menu de gauche, cliquez sur **SQL Editor** (ou **SQL**)
2. Cliquez sur **New query**

### 3. Copier et exécuter ce SQL

Copiez tout ce code SQL et collez-le dans l'éditeur, puis cliquez sur **Run** :

```sql
-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

-- Activer RLS sur storage.objects (si ce n'est pas déjà fait)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Politique 1: Les utilisateurs authentifiés peuvent uploader des images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Politique 2: Tout le monde peut voir les images (bucket public)
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-images');

-- Politique 3: Les utilisateurs peuvent supprimer leurs propres images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique 4: Les utilisateurs peuvent modifier leurs propres images
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'listing-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 4. Vérifier l'exécution

Vous devriez voir un message de succès comme :
```
Success. No rows returned
```

### 5. Vérifier les politiques

1. Allez dans **Storage** > **Policies**
2. Ou exécutez cette requête pour voir toutes les politiques :

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;
```

Vous devriez voir 4 politiques listées.

### 6. Tester à nouveau

1. Retournez sur votre site Cloudflare Pages
2. Rechargez la page (Ctrl + F5)
3. Essayez d'uploader une image

## ✅ Vérifications supplémentaires

Si ça ne fonctionne toujours pas, vérifiez :

1. **Le bucket existe et est public** :
   - Storage > Buckets > `listing-images` doit avoir un cadenas déverrouillé 🔓

2. **Vous êtes bien connecté** :
   - Vérifiez que vous voyez votre profil dans l'application
   - Déconnectez-vous et reconnectez-vous si nécessaire

3. **Les variables d'environnement Cloudflare** :
   - Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont correctes
   - Redéployez si vous les avez modifiées

## 🆘 Si le problème persiste

Ouvrez la console du navigateur (F12) et regardez les erreurs détaillées. Cela vous donnera plus d'informations sur le problème exact.

