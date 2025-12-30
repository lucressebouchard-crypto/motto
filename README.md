<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MƆ̆TTO - Marketplace pour véhicules et accessoires

Une marketplace mobile-first moderne pour l'achat et la vente de voitures, motos et accessoires avec options de boost et chat intégré.

## 🚀 Technologies

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Hébergement**: Vercel
- **Mobile**: Capacitor (à venir)

## 📋 Prérequis

- Node.js 18+ 
- Compte Supabase
- Compte Vercel (pour le déploiement)

## 🛠️ Installation locale

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/lucressebouchard-crypto/motto.git
   cd motto
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer Supabase**
   - Créez un projet sur [Supabase](https://supabase.com)
   - Exécutez le schéma SQL dans `supabase/schema.sql` via l'éditeur SQL de Supabase
   - Consultez [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) pour plus de détails

4. **Configurer les variables d'environnement**
   - Créez un fichier `.env.local` à la racine
   - Ajoutez vos clés Supabase :
   ```env
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   GEMINI_API_KEY=votre_cle_gemini (optionnel)
   ```

5. **Lancer l'application**
   ```bash
   npm run dev
   ```

L'application sera accessible sur http://localhost:3000

## 🗄️ Structure de la base de données

- **users** : Profils utilisateurs (acheteurs, vendeurs, mécaniciens)
- **listings** : Annonces de véhicules et accessoires
- **chats** : Conversations entre utilisateurs
- **messages** : Messages dans les chats
- **notifications** : Notifications utilisateurs
- **appointments** : Rendez-vous avec les mécaniciens
- **quotes** : Devis des mécaniciens
- **favorites** : Favoris des utilisateurs

## 🚢 Déploiement sur Vercel

1. **Connecter le dépôt GitHub à Vercel**
   - Allez sur [Vercel](https://vercel.com)
   - Importez le dépôt GitHub
   - Vercel détectera automatiquement la configuration Vite

2. **Configurer les variables d'environnement sur Vercel**
   - Dans les paramètres du projet Vercel, ajoutez :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY` (si nécessaire)

3. **Déployer**
   - Vercel déploiera automatiquement à chaque push sur la branche principale

## 📱 Mobile (à venir)

L'application sera rendue mobile avec Capacitor une fois le backend complet.

## 📝 Scripts disponibles

- `npm run dev` : Lancer le serveur de développement
- `npm run build` : Construire pour la production
- `npm run preview` : Prévisualiser le build de production

## 🔐 Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Authentification sécurisée via Supabase Auth
- Variables d'environnement pour les clés sensibles

## 📄 Licence

Projet privé
