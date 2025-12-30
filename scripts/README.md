# Scripts d'administration MƆ̆TTO

Ce dossier contient des scripts pour automatiser la configuration et la gestion de Supabase et Vercel.

## 📋 Scripts disponibles

### Supabase

#### `setup-supabase.js`
Teste la connexion et vérifie l'état de Supabase.

```bash
# Tester la connexion
npm run supabase:test

# Vérifier que toutes les tables existent
npm run supabase:verify

# Afficher les instructions pour exécuter le schéma SQL
npm run supabase:schema
```

#### `create-env.js`
Crée le fichier `.env.local` avec les clés Supabase.

```bash
node scripts/create-env.js <SUPABASE_URL> <SUPABASE_ANON_KEY>
```

#### `execute-schema.js`
Affiche le schéma SQL pour faciliter la copie.

```bash
npm run supabase:exec-schema
```

### Vercel

Les scripts Vercel sont disponibles dans `vercel-admin.js` mais nécessitent un token d'accès Vercel.

## 🔧 Configuration

### Variables d'environnement

Le fichier `.env.local` doit contenir:
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### Exécution du schéma SQL

Pour exécuter le schéma SQL dans Supabase:

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor"
4. Cliquez sur "New query"
5. Exécutez: `npm run supabase:exec-schema` pour voir le schéma
6. Copiez le contenu et collez-le dans l'éditeur
7. Cliquez sur "Run"

## 🚀 Workflow recommandé

1. **Créer le fichier .env.local**
   ```bash
   node scripts/create-env.js <URL> <KEY>
   ```

2. **Tester la connexion**
   ```bash
   npm run supabase:test
   ```

3. **Exécuter le schéma SQL** (via dashboard Supabase)

4. **Vérifier les tables**
   ```bash
   npm run supabase:verify
   ```

5. **Continuer avec la configuration Vercel**
