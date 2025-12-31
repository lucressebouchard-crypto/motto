# 🚀 Configuration Automatique de Supabase

## Script Principal : `npm run supabase:init`

Ce script configure **automatiquement** tout ce qui est nécessaire dans Supabase :

### Ce qui est configuré automatiquement :

1. ✅ **Fix Users Policy** - Ajoute la policy INSERT manquante pour la table users
2. ✅ **Storage Configuration** - Configure le bucket pour les images avec toutes les politiques de sécurité
3. ✅ **Realtime Configuration** - Active le realtime pour messages, chats et notifications

## Utilisation

### Configuration initiale (une seule fois)

```bash
npm run supabase:init
```

Ce script exécute automatiquement tous les SQL nécessaires via l'API Supabase.

### Prérequis

Avant de lancer ce script, vous devez :

1. **Avoir configuré la fonction RPC exec_sql** (une seule fois) :
   ```bash
   npm run supabase:setup-rpc
   ```
   Puis copier le SQL affiché dans Supabase Dashboard > SQL Editor et l'exécuter.

2. **Avoir SUPABASE_SERVICE_ROLE_KEY dans `.env.local`** :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
   ```

## Autres scripts disponibles

- `npm run supabase:setup-rpc` - Affiche le SQL pour créer la fonction RPC (une seule fois)
- `npm run supabase:setup-complete` - Configure Storage + Realtime uniquement
- `npm run supabase:setup-storage` - Configure uniquement le Storage
- `npm run supabase:fix-users` - Fix uniquement la policy users

## Notes importantes

- La fonction RPC `exec_sql` doit être créée **une seule fois** manuellement
- Après cela, tous les autres scripts fonctionnent automatiquement
- Les scripts gèrent automatiquement les erreurs "déjà configuré"
- Si quelque chose échoue, le script vous indiquera quoi faire

