# Guide de configuration complète - MƆ̆TTO

Ce guide vous accompagne étape par étape pour configurer Supabase et déployer sur Vercel.

## 📋 Checklist de configuration

- [ ] **Étape 1**: Créer un compte et un projet Supabase
- [ ] **Étape 2**: Exécuter le schéma SQL
- [ ] **Étape 3**: Configurer l'authentification
- [ ] **Étape 4**: Créer le fichier .env.local
- [ ] **Étape 5**: Tester l'application localement
- [ ] **Étape 6**: Créer un projet Vercel
- [ ] **Étape 7**: Configurer les variables d'environnement sur Vercel
- [ ] **Étape 8**: Déployer sur Vercel

---

## 🚀 ÉTAPE 1 : Créer un projet Supabase

### 1.1 Créer un compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"** ou **"Sign in"**
3. Créez un compte avec GitHub, Google ou votre email

### 1.2 Créer un nouveau projet

1. Une fois connecté, cliquez sur **"New Project"** (bouton vert en haut à droite)
2. Remplissez les informations :
   - **Name**: `motto` (ou le nom de votre choix)
   - **Database Password**: Choisissez un mot de passe fort (⚠️ **SAVEZ-LE**, vous en aurez besoin si vous voulez vous connecter directement à la DB)
   - **Region**: Choisissez la région la plus proche (ex: `West US` pour les USA, `West EU` pour l'Europe)
   - **Pricing Plan**: Sélectionnez **Free** pour commencer
3. Cliquez sur **"Create new project"**
4. ⏳ Attendez 2-3 minutes que le projet soit créé

### 1.3 Récupérer les clés API

1. Dans votre projet Supabase, allez dans **Settings** (icône ⚙️ dans la barre latérale gauche)
2. Cliquez sur **API** dans le menu Settings
3. Vous verrez deux informations importantes :
   - **Project URL** : Une URL comme `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key : Une longue clé commençant par `eyJ...`
4. ⚠️ **COPIEZ ces deux valeurs** - vous en aurez besoin pour le fichier `.env.local`

---

## 🗄️ ÉTAPE 2 : Exécuter le schéma SQL

### 2.1 Ouvrir l'éditeur SQL

1. Dans votre projet Supabase, cliquez sur **SQL Editor** dans la barre latérale gauche
2. Cliquez sur **"New query"** (bouton vert)

### 2.2 Copier et exécuter le schéma

1. Ouvrez le fichier `supabase/schema.sql` de ce projet
2. **Sélectionnez TOUT le contenu** (Ctrl+A / Cmd+A)
3. **Copiez** (Ctrl+C / Cmd+C)
4. Collez dans l'éditeur SQL de Supabase
5. Cliquez sur **"Run"** (ou appuyez sur F5)
6. ✅ Vous devriez voir un message de succès : "Success. No rows returned"

### 2.3 Vérifier que les tables sont créées

1. Dans Supabase, allez dans **Table Editor** (icône 📊 dans la barre latérale)
2. Vous devriez voir toutes ces tables :
   - `users`
   - `listings`
   - `chats`
   - `messages`
   - `notifications`
   - `appointments`
   - `quotes`
   - `favorites`

✅ Si toutes les tables sont présentes, l'étape 2 est terminée !

---

## 🔐 ÉTAPE 3 : Configurer l'authentification

### 3.1 Activer l'authentification par email

1. Dans Supabase, allez dans **Authentication** (icône 🔐 dans la barre latérale)
2. Cliquez sur **Settings** (ou "Providers")
3. Vérifiez que **Email** est activé (il devrait l'être par défaut)
4. **Enable email signup** doit être coché ✅

### 3.2 (Optionnel) Configurer d'autres providers

Vous pouvez activer d'autres méthodes d'authentification :
- **Google** : Cliquez sur Google et suivez les instructions
- **GitHub** : Cliquez sur GitHub et suivez les instructions
- **Facebook**, etc.

Pour l'instant, l'email est suffisant.

### 3.3 Configurer l'URL de redirection (important pour la production)

1. Toujours dans **Authentication > Settings**
2. Dans **Site URL**, mettez : `http://localhost:5173` (pour le développement local)
3. Dans **Redirect URLs**, ajoutez :
   - `http://localhost:5173/**`
   - Vous ajouterez votre URL Vercel plus tard

✅ L'authentification est maintenant configurée !

---

## 💻 ÉTAPE 4 : Créer le fichier .env.local

### 4.1 Créer le fichier

1. À la racine du projet (`D:\PERSONNELS\motto`), créez un nouveau fichier nommé `.env.local`
   - ⚠️ Le point `.` au début est important !
   - Sur Windows, si vous avez du mal à créer un fichier commençant par un point, utilisez un éditeur de texte ou la commande PowerShell

### 4.2 Ajouter les variables d'environnement

1. Ouvrez le fichier `.env.local`
2. Ajoutez ce contenu (remplacez par vos VRAIES valeurs) :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

3. Remplacez :
   - `https://votre-projet.supabase.co` par votre **Project URL** (étape 1.3)
   - `votre_cle_anon_ici` par votre **anon public key** (étape 1.3)

**Exemple :**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY...
```

### 4.3 Vérifier le fichier

Votre fichier `.env.local` doit maintenant contenir exactement :
- 2 lignes (pas de lignes vides supplémentaires)
- Pas d'espaces autour du `=`
- Pas de guillemets autour des valeurs

✅ Le fichier `.env.local` est créé et configuré !

---

## 🧪 ÉTAPE 5 : Tester l'application localement

### 5.1 Installer les dépendances (si pas déjà fait)

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install
```

### 5.2 Lancer l'application

```bash
npm run dev
```

Vous devriez voir quelque chose comme :
```
  VITE v6.2.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 5.3 Tester dans le navigateur

1. Ouvrez votre navigateur et allez sur `http://localhost:5173`
2. L'application devrait se charger
3. Essayez de vous inscrire :
   - Cliquez sur le bouton profil
   - Créez un compte
   - Vérifiez que vous pouvez vous connecter

### 5.4 Vérifier dans Supabase

1. Dans Supabase, allez dans **Authentication > Users**
2. Vous devriez voir votre nouvel utilisateur apparaître
3. Allez dans **Table Editor > users**
4. Vous devriez voir votre profil utilisateur

✅ Si tout fonctionne, vous êtes prêt pour le déploiement !

---

## 🚀 ÉTAPE 6 : Créer un projet Vercel

### 6.1 Créer un compte Vercel

1. Allez sur [https://vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Choisissez **"Continue with GitHub"** (recommandé si votre code est sur GitHub)

### 6.2 Importer le projet

1. Une fois connecté, cliquez sur **"Add New Project"** (ou "Import Project")
2. Si votre dépôt est déjà sur GitHub, vous le verrez dans la liste
3. Cliquez sur le dépôt `motto` (ou votre nom de dépôt)
4. Si le dépôt n'apparaît pas :
   - Cliquez sur **"Adjust GitHub App Permissions"**
   - Autorisez l'accès au dépôt
   - Rafraîchissez la page

### 6.3 Configurer le projet

1. **Project Name** : Laissez `motto` (ou changez si vous voulez)
2. **Framework Preset** : Vercel devrait détecter automatiquement **Vite**
3. **Root Directory** : Laissez vide (ou `./` si demandé)
4. **Build Command** : Devrait être `npm run build` (auto-détecté)
5. **Output Directory** : Devrait être `dist` (auto-détecté)
6. **Install Command** : Devrait être `npm install` (auto-détecté)

⚠️ **NE CLIQUEZ PAS ENCORE SUR "DEPLOY"** - on doit d'abord configurer les variables d'environnement !

---

## ⚙️ ÉTAPE 7 : Configurer les variables d'environnement sur Vercel

### 7.1 Ajouter les variables

1. Dans la page de configuration du projet Vercel, allez dans la section **"Environment Variables"**
2. Cliquez pour ajouter une variable, puis ajoutez :

   **Variable 1 :**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Votre Project URL Supabase (la même que dans `.env.local`)
   - Cochez : ✅ Production, ✅ Preview, ✅ Development

   **Variable 2 :**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Votre anon public key Supabase (la même que dans `.env.local`)
   - Cochez : ✅ Production, ✅ Preview, ✅ Development

### 7.2 Vérifier les variables

Vous devriez maintenant avoir 2 variables d'environnement configurées.

---

## 🚢 ÉTAPE 8 : Déployer sur Vercel

### 8.1 Lancer le déploiement

1. Cliquez sur **"Deploy"** (bouton en bas de la page)
2. ⏳ Attendez 1-2 minutes que le déploiement se termine
3. Vous verrez un message de succès avec une URL comme : `motto.vercel.app`

### 8.2 Tester l'application déployée

1. Cliquez sur le lien de votre site déployé
2. Testez l'application :
   - Créez un compte
   - Connectez-vous
   - Vérifiez que tout fonctionne

### 8.3 Configurer les Redirect URLs dans Supabase (IMPORTANT)

1. Retournez dans Supabase > **Authentication > Settings**
2. Dans **Redirect URLs**, ajoutez votre URL Vercel :
   - `https://votre-projet.vercel.app/**`
   - `https://*.vercel.app/**` (pour les preview deployments aussi)
3. Cliquez sur **Save**

### 8.4 Déploiements automatiques

✅ Maintenant, à chaque fois que vous pousserez du code sur GitHub :
- Vercel déploiera automatiquement une nouvelle version
- Les variables d'environnement seront automatiquement utilisées

---

## ✅ C'est terminé !

Votre application MƆ̆TTO est maintenant :
- ✅ Configurée avec Supabase
- ✅ Déployée sur Vercel
- ✅ Accessible en ligne

### Prochaines étapes

Maintenant que tout est configuré, nous pouvons :
1. Intégrer les services Supabase dans les composants React
2. Ajouter la gestion des images avec Supabase Storage
3. Implémenter les fonctionnalités en temps réel
4. Et bien plus encore !

---

## 🆘 En cas de problème

### L'application ne se connecte pas à Supabase
- Vérifiez que `.env.local` contient les bonnes valeurs
- Vérifiez qu'il n'y a pas d'espaces avant/après les `=`
- Redémarrez le serveur de développement (`npm run dev`)

### Erreur lors de l'exécution du SQL
- Vérifiez que vous avez copié TOUT le contenu de `schema.sql`
- Vérifiez qu'il n'y a pas d'erreurs de syntaxe
- Essayez d'exécuter le script par sections

### Problème de déploiement sur Vercel
- Vérifiez les logs de build dans Vercel
- Vérifiez que les variables d'environnement sont bien configurées
- Vérifiez que `vercel.json` est présent

### Problème d'authentification
- Vérifiez que les Redirect URLs sont bien configurées dans Supabase
- Vérifiez que l'authentification email est activée
- Vérifiez la console du navigateur pour les erreurs
