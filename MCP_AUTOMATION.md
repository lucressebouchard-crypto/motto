# Guide d'automatisation MCP - Supabase et Vercel

Ce guide explique comment utiliser les scripts d'automatisation pour interagir avec Supabase et Vercel.

## 🤖 Ce que permet l'automatisation

Avec ces scripts, je peux automatiquement :
- ✅ Créer des utilisateurs de test
- ✅ Lister les données dans Supabase
- ✅ Créer des annonces de test
- ✅ Afficher les statistiques de la base de données
- ✅ Synchroniser les variables d'environnement avec Vercel
- ✅ Lister les projets Vercel

## 📋 Prérequis

### Pour Supabase
Votre fichier `.env.local` contient déjà :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Pour certaines opérations avancées (comme le nettoyage), ajoutez :
- `SUPABASE_SERVICE_ROLE_KEY` (trouvable dans Supabase Dashboard > Settings > API > service_role)

### Pour Vercel
Ajoutez dans `.env.local` :
- `VERCEL_TOKEN` (obtenez-le sur https://vercel.com/account/tokens)
- `VERCEL_PROJECT_ID` (optionnel, l'ID de votre projet)
- `VERCEL_TEAM_ID` (optionnel, si vous êtes dans une équipe)

## 🚀 Commandes disponibles

### Supabase

```bash
# Afficher les statistiques
npm run supabase:stats

# Lister tous les utilisateurs
npm run supabase:list-users

# Lister toutes les annonces
npm run supabase:list-listings
```

### Vercel

```bash
# Lister tous les projets
npm run vercel:list-projects

# Synchroniser les variables d'environnement (nécessite PROJECT_ID)
node scripts/vercel-automation.js sync-env <PROJECT_ID>
```

## 💡 Utilisation dans les conversations

Vous pouvez me demander :
- "Crée un utilisateur de test dans Supabase"
- "Affiche les statistiques de la base de données"
- "Liste tous les utilisateurs"
- "Synchronise les variables d'environnement avec Vercel"

Et j'exécuterai ces tâches automatiquement via les scripts !

## 🔐 Sécurité

- Les clés sensibles sont stockées dans `.env.local` (qui est ignoré par Git)
- Ne partagez jamais vos clés `service_role` ou `VERCEL_TOKEN`
- Les scripts utilisent uniquement les clés configurées dans `.env.local`

## 📝 Exemple d'utilisation

```bash
# Vérifier l'état de la base de données
npm run supabase:stats

# Créer un utilisateur de test (via script direct)
node scripts/supabase-automation.js create-user test@example.com password123 "Test User" buyer
```
