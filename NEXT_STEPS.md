# Prochaines étapes - Guide de configuration

## ✅ Ce qui a été fait

1. ✅ Dépôt Git initialisé et connecté à GitHub
2. ✅ Backend Supabase configuré (services complets)
3. ✅ Schéma de base de données créé
4. ✅ Configuration Vercel préparée
5. ✅ Code poussé vers GitHub

## 🔄 Étapes suivantes

### 1. Configurer Supabase (OBLIGATOIRE)

1. **Créer un projet Supabase**
   - Allez sur https://supabase.com
   - Créez un compte ou connectez-vous
   - Cliquez sur "New Project"
   - Remplissez les informations :
     - Nom du projet : `motto`
     - Mot de passe de la base de données : (choisissez un mot de passe fort)
     - Région : choisissez la plus proche
   - Attendez que le projet soit créé (2-3 minutes)

2. **Récupérer les clés API**
   - Dans votre projet Supabase, allez dans **Settings** > **API**
   - Copiez :
     - **Project URL** (ex: `https://xxxxx.supabase.co`)
     - **anon public** key (clé publique anonyme)

3. **Exécuter le schéma SQL**
   - Dans Supabase, allez dans **SQL Editor**
   - Cliquez sur **New Query**
   - Ouvrez le fichier `supabase/schema.sql` de ce projet
   - Copiez tout le contenu et collez-le dans l'éditeur SQL
   - Cliquez sur **Run** (ou F5)
   - Vérifiez qu'il n'y a pas d'erreurs

4. **Configurer l'authentification**
   - Allez dans **Authentication** > **Settings**
   - Vérifiez que "Enable Email Signup" est activé
   - Configurez les autres options selon vos besoins

5. **Créer le fichier `.env.local`**
   - À la racine du projet, créez un fichier `.env.local`
   - Ajoutez :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_ici
   ```
   - Remplacez par vos vraies valeurs

### 2. Tester localement

1. **Installer les dépendances** (si pas déjà fait)
   ```bash
   npm install
   ```

2. **Lancer l'application**
   ```bash
   npm run dev
   ```

3. **Vérifier que tout fonctionne**
   - Ouvrez http://localhost:3000
   - Testez l'inscription/connexion
   - Vérifiez que les données se sauvegardent dans Supabase

### 3. Déployer sur Vercel

1. **Connecter le dépôt**
   - Allez sur https://vercel.com
   - Connectez-vous avec votre compte GitHub
   - Cliquez sur "Add New Project"
   - Importez le dépôt `lucressebouchard-crypto/motto`
   - Vercel détectera automatiquement Vite

2. **Configurer les variables d'environnement**
   - Dans les paramètres du projet Vercel
   - Allez dans **Settings** > **Environment Variables**
   - Ajoutez :
     - `VITE_SUPABASE_URL` = votre URL Supabase
     - `VITE_SUPABASE_ANON_KEY` = votre clé anon Supabase
   - Sélectionnez "Production", "Preview", et "Development"
   - Cliquez sur "Save"

3. **Déployer**
   - Cliquez sur "Deploy"
   - Attendez que le déploiement se termine
   - Votre app sera accessible sur une URL Vercel (ex: `motto.vercel.app`)

### 4. Intégrer Supabase dans les composants (À FAIRE)

Les services backend sont prêts, mais il faut maintenant les intégrer dans les composants React existants :

- **AuthPage.tsx** : Utiliser `authService` au lieu du localStorage
- **App.tsx** : Charger les listings depuis `listingService`
- **ChatList.tsx** : Utiliser `chatService` pour les conversations
- **NotificationList.tsx** : Utiliser `notificationService`
- **CreateListingModal.tsx** : Sauvegarder via `listingService`
- **Dashboard.tsx** : Charger les données depuis Supabase

### 5. Prochaines améliorations

- [ ] Intégrer les services dans tous les composants
- [ ] Ajouter la gestion des favoris avec Supabase
- [ ] Implémenter les notifications en temps réel
- [ ] Ajouter la gestion des images (Supabase Storage)
- [ ] Configurer Capacitor pour le mobile
- [ ] Ajouter les tests

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez que Supabase est bien configuré
2. Vérifiez les variables d'environnement
3. Consultez les logs dans la console du navigateur
4. Vérifiez les logs Supabase dans le dashboard

## 🔗 Liens utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation React](https://react.dev)
- [Documentation Vite](https://vitejs.dev)

