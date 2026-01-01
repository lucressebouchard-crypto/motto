# 🔧 Solution : Erreur "Bucket listing-images n'existe pas" sur Cloudflare Pages

## ✅ Le bucket existe bien en local

Le diagnostic confirme que le bucket est accessible avec vos variables d'environnement locales.

## 🎯 Solution en 3 étapes

### Étape 1 : Vérifier les variables d'environnement sur Cloudflare Pages

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** > **motto** > **Settings** > **Variables and Secrets**
3. Vérifiez que ces **2 variables exactes** existent (avec ces noms exacts) :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **⚠️ IMPORTANT** : Les valeurs doivent être **identiques** à celles dans `.env.local` :
   - `VITE_SUPABASE_URL` = `https://ywzmwbxxvjibunnklrag.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = votre clé complète (commence par `eyJhbGciOiJIUzI1NiIs...`)

### Étape 2 : Redéployer le projet

Après avoir vérifié/corrigé les variables :

1. Dans Cloudflare Pages, allez dans **Deployments**
2. Cliquez sur les **3 points** (...) du dernier déploiement
3. Cliquez sur **Retry deployment** OU créez un nouveau commit et poussez-le :
   ```bash
   git add .
   git commit -m "fix: retry deployment"
   git push origin main
   ```

### Étape 3 : Vider le cache du navigateur

1. Ouvrez votre site sur Cloudflare Pages
2. Appuyez sur **Ctrl + Shift + Delete** (Windows) ou **Cmd + Shift + Delete** (Mac)
3. Sélectionnez "Images et fichiers en cache"
4. Cliquez sur **Effacer les données**
5. Rechargez la page avec **Ctrl + F5**

## 🚨 Si ça ne fonctionne toujours pas

### Vérifier que le bucket existe vraiment dans Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Storage** > **Buckets**
4. Vérifiez que vous voyez un bucket nommé **`listing-images`** avec :
   - ✅ Statut **Public** (icône de cadenas déverrouillé)
   - ✅ Visible dans la liste

Si le bucket **n'existe pas** :
1. Cliquez sur **New bucket**
2. **Name** : `listing-images` (exactement, sans espaces)
3. **Public bucket** : ✅ **Cocher** (très important !)
4. **File size limit** : `50` MB
5. Cliquez sur **Create bucket**
6. Exécutez : `npm run supabase:setup-storage`

## 📝 Vérification finale

1. Rechargez votre site Cloudflare Pages
2. Connectez-vous si nécessaire
3. Essayez d'uploader une image
4. Cela devrait fonctionner maintenant !

---

**💡 Note** : Si le problème persiste, vérifiez la console du navigateur (F12) pour voir l'erreur exacte. Cela peut aider à diagnostiquer le problème.

