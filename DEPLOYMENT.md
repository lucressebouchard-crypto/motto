# Guide de déploiement - MƆ̆TTO

Ce guide vous accompagne pour déployer votre application sur Cloudflare Pages (gratuit).

## 🎯 Stack de déploiement

- **Frontend**: Cloudflare Pages (gratuit, illimité)
- **Backend/DB**: Supabase (gratuit jusqu'à 500MB DB)
- **Backend API** (optionnel): Render (gratuit si nécessaire)

## 📋 Prérequis

- ✅ Compte GitHub (déjà fait si vous avez poussé le code)
- ✅ Compte Supabase configuré (déjà fait)
- ⚠️ Compte Cloudflare (à créer)

---

## 🚀 ÉTAPE 1 : Créer un compte Cloudflare

1. Allez sur [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Créez un compte (gratuit)
3. Connectez-vous

**Dites "Je suis connecté à Cloudflare" quand c'est fait.**

---

## 🌐 ÉTAPE 2 : Créer un projet Cloudflare Pages

1. Dans le dashboard Cloudflare, allez dans **Pages** (dans le menu de gauche)
2. Cliquez sur **"Create a project"**
3. Cliquez sur **"Connect to Git"**
4. Autorisez Cloudflare à accéder à votre compte GitHub si demandé
5. Sélectionnez le dépôt **`lucressebouchard-crypto/motto`**

**Dites "J'ai sélectionné le dépôt" quand c'est fait.**

---

## ⚙️ ÉTAPE 3 : Configurer le build

Une fois le dépôt sélectionné, vous verrez la page de configuration :

1. **Project name**: Laissez `motto` (ou changez si vous voulez)

2. **Production branch**: Laissez `main`

3. **Framework preset**: 
   - Cliquez sur le champ et sélectionnez **"Vite"**
   - Ou laissez "None" et configurez manuellement

4. **Build command**: `npm run build`

5. **Build output directory**: `dist`

6. **Root directory**: Laissez vide (ou `/`)

**⚠️ NE CLIQUEZ PAS ENCORE SUR "Save and Deploy"** - on doit d'abord configurer les variables d'environnement !

**Dites "Build configuré" quand c'est fait.**

---

## 🔐 ÉTAPE 4 : Configurer les variables d'environnement

1. Sur la page de configuration, allez dans la section **"Environment variables"** (en bas)

2. Cliquez sur **"Add variable"** et ajoutez :

   **Variable 1 :**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://ywzmwbxxvjibunnklrag.supabase.co`
   - **Environment**: Cochez ✅ **Production**, ✅ **Preview**, ✅ **Development**

   **Variable 2 :**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Votre clé anon (celle dans `.env.local`)
   - **Environment**: Cochez ✅ **Production**, ✅ **Preview**, ✅ **Development**

   **Variable 3 (optionnelle) :**
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Votre clé Gemini (si vous en avez une)
   - **Environment**: ✅ **Production**

**Dites "Variables configurées" quand c'est fait.**

---

## 🚢 ÉTAPE 5 : Déployer

1. Une fois les variables configurées, cliquez sur **"Save and Deploy"** en bas de la page

2. ⏳ Attendez 1-2 minutes que le build se termine

3. Une fois terminé, vous verrez votre site avec une URL comme :
   - `https://motto-xxxxx.pages.dev`
   - Ou votre domaine personnalisé si configuré

**Dites "Déploiement terminé" quand c'est fait.**

---

## 🔄 ÉTAPE 6 : Configurer les Redirect URLs dans Supabase

Maintenant que votre site est déployé, il faut dire à Supabase d'accepter les redirections depuis Cloudflare Pages :

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **URL Configuration**
4. Dans **Redirect URLs**, cliquez sur **"Add URL"** et ajoutez :
   - `https://votre-projet.pages.dev/**`
   - `https://*.pages.dev/**` (pour accepter tous les sous-domaines Cloudflare Pages)

5. Cliquez sur **"Save"**

**Dites "Redirect URLs configurées" quand c'est fait.**

---

## ✅ C'est terminé !

Votre application est maintenant :
- ✅ Déployée sur Cloudflare Pages (gratuit)
- ✅ Connectée à Supabase
- ✅ Accessible en ligne
- ✅ Déploie automatiquement à chaque push sur `main`

---

## 🎯 Déploiements automatiques

À chaque fois que vous pousserez du code sur GitHub :
1. Cloudflare Pages détectera automatiquement le changement
2. Il construira automatiquement votre application
3. Il déploiera la nouvelle version
4. Votre site sera mis à jour en quelques minutes

---

## 🔧 Custom Domain (optionnel)

Si vous voulez utiliser votre propre domaine :

1. Dans Cloudflare Pages > Votre projet > **Custom domains**
2. Cliquez sur **"Set up a custom domain"**
3. Entrez votre domaine
4. Suivez les instructions pour configurer le DNS

---

## 🆘 En cas de problème

### Le build échoue
- Vérifiez les logs dans Cloudflare Pages > **Deployments**
- Vérifiez que `npm run build` fonctionne localement
- Vérifiez que toutes les variables d'environnement sont configurées

### L'application ne se connecte pas à Supabase
- Vérifiez que les variables d'environnement sont bien configurées dans Cloudflare Pages
- Vérifiez que les Redirect URLs sont configurées dans Supabase
- Vérifiez la console du navigateur pour les erreurs

### L'authentification ne fonctionne pas
- Vérifiez que l'URL de votre site Cloudflare Pages est dans les Redirect URLs de Supabase
- Vérifiez que le Site URL dans Supabase pointe vers votre site déployé (ou `http://localhost:5173` pour le dev)

---

## 📊 Coûts

- **Cloudflare Pages**: Gratuit (illimité)
- **Supabase**: Gratuit jusqu'à 500MB de base de données
- **Total**: **0€** pour commencer ! 🎉

