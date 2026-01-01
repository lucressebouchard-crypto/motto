# Instructions pour créer le bucket Storage manuellement

Le bucket doit être créé directement dans Supabase Dashboard pour garantir qu'il fonctionne.

## 📋 Étapes à suivre

### 1. Ouvrir Supabase Dashboard

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Connectez-vous si nécessaire
3. Sélectionnez votre projet **MƆ̆TTO**

### 2. Aller dans Storage

1. Dans le menu de gauche, cliquez sur **Storage** (icône 📦)
2. Si vous voyez "No buckets yet", c'est normal - nous allons en créer un

### 3. Créer le bucket

1. Cliquez sur le bouton **"New bucket"** (en haut à droite)
2. Remplissez le formulaire :
   - **Name**: `listing-images` (⚠️ EXACTEMENT ce nom, sans espaces, en minuscules)
   - **Public bucket**: ✅ **Cocher cette case** (très important !)
   - **File size limit**: `50` (MB)
   - **Allowed MIME types**: Laissez vide (ou ajoutez `image/jpeg,image/png,image/webp,image/jpg`)

3. Cliquez sur **"Create bucket"**

### 4. Vérifier la création

Après la création, vous devriez voir le bucket `listing-images` dans la liste avec :
- Un cadenas déverrouillé 🔓 (indiquant qu'il est public)
- Le statut "Public"

### 5. Configurer les politiques RLS (automatique)

Les politiques RLS devraient être créées automatiquement, mais vérifions :

1. Cliquez sur le bucket `listing-images`
2. Allez dans l'onglet **"Policies"** 
3. Vous devriez voir 3 politiques :
   - ✅ "Public can view images" (SELECT)
   - ✅ "Authenticated users can upload images" (INSERT)
   - ✅ "Users can delete their own images" (DELETE)

Si les politiques n'existent pas, exécutez le script suivant :

```bash
npm run supabase:setup-storage
```

## ✅ Vérification finale

Une fois le bucket créé :

1. Rechargez votre site Cloudflare Pages
2. Essayez à nouveau d'uploader une image
3. Cela devrait fonctionner maintenant !

---

**💡 Note**: Si vous avez toujours l'erreur après avoir créé le bucket, c'est probablement un problème de variables d'environnement sur Cloudflare Pages. Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont bien configurées.

