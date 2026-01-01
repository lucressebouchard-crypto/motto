# ✅ SOLUTION FINALE : Créer les politiques RLS Storage

L'erreur "new row violates row-level security policy" signifie que les politiques RLS ne sont pas créées ou configurées correctement.

## 🎯 Solution : Créer les politiques manuellement dans Supabase

### Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur **https://supabase.com/dashboard**
2. Sélectionnez votre projet **MƆ̆TTO**

### Étape 2 : Ouvrir l'éditeur SQL

1. Dans le menu de gauche, cliquez sur **SQL Editor**
2. Cliquez sur le bouton **New query**

### Étape 3 : Copier et exécuter ce SQL

**⚠️ IMPORTANT : Copiez TOUT le code ci-dessous et exécutez-le d'un coup**

```sql
-- Activer RLS sur storage.objects (nécessaire)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Politique 1 : Les utilisateurs authentifiés peuvent UPLOADER des images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Politique 2 : Tout le monde peut VOIR les images (bucket public)
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-images');

-- Politique 3 : Les utilisateurs peuvent SUPPRIMER leurs propres images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Étape 4 : Exécuter le SQL

1. **Collez** tout le code SQL ci-dessus dans l'éditeur
2. Cliquez sur le bouton **Run** (ou appuyez sur Ctrl+Enter)
3. Vous devriez voir un message de succès : `Success. No rows returned`

### Étape 5 : Vérifier que les politiques existent

Pour vérifier que les politiques ont été créées, exécutez cette requête :

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND bucket_id IS NULL
ORDER BY policyname;
```

Vous devriez voir **3 politiques** listées :
1. ✅ Authenticated users can upload images (INSERT)
2. ✅ Public can view images (SELECT)
3. ✅ Users can delete their own images (DELETE)

### Étape 6 : Vérifier que le bucket est public

1. Allez dans **Storage** > **Buckets**
2. Cliquez sur le bucket **`listing-images`**
3. Vérifiez que **Public bucket** est **activé** (icône de cadenas déverrouillé 🔓)
4. Si ce n'est pas le cas, cliquez sur **Edit** et cochez **Public bucket**, puis **Save**

### Étape 7 : Tester dans l'application

1. Retournez sur votre site Cloudflare Pages
2. **Videz le cache** du navigateur : **Ctrl + Shift + Delete** > Images et fichiers en cache > Effacer
3. **Rechargez** la page avec **Ctrl + F5**
4. **Déconnectez-vous** puis **reconnectez-vous** (pour rafraîchir la session)
5. Essayez d'**uploader une image**

## ✅ Ça devrait fonctionner maintenant !

Si l'erreur persiste après ces étapes :

1. **Vérifiez la console du navigateur** (F12 > Console) pour voir l'erreur exacte
2. **Vérifiez que vous êtes bien connecté** (vous devriez voir votre profil)
3. **Vérifiez les variables d'environnement** sur Cloudflare Pages :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Redéployez** sur Cloudflare Pages après avoir modifié les variables

---

**💡 Note** : Si vous avez toujours des problèmes, envoyez-moi le message d'erreur exact de la console du navigateur (F12 > Console).

