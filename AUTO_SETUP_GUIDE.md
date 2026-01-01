# 🚀 Configuration Automatique Supabase - Guide Complet

## ✅ Ce que vous devez faire UNE SEULE FOIS

Pour que je puisse automatiquement gérer Supabase sans que vous ayez à y aller, il faut juste ajouter **une seule variable** dans votre `.env.local`.

### Étape 1 : Récupérer la connection string PostgreSQL

1. Allez sur **https://supabase.com/dashboard**
2. Sélectionnez votre projet **MƆ̆TTO**
3. Allez dans **Settings** (Paramètres) > **Database**
4. Dans la section **Connection string**, vous verrez plusieurs options
5. Cliquez sur l'onglet **URI** (pas Transaction pooler)
6. Copiez la connection string complète (elle commence par `postgresql://postgres:[YOUR-PASSWORD]@db...`)

### Étape 2 : Ajouter dans .env.local

Ouvrez votre fichier `.env.local` et ajoutez cette ligne (en remplaçant par votre connection string) :

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**⚠️ IMPORTANT** : Remplacez `[YOUR-PASSWORD]` par votre mot de passe PostgreSQL (celui qui est masqué dans la connection string affichée).

**💡 Astuce** : Si vous ne voyez pas le mot de passe dans Supabase Dashboard :
1. Allez dans **Settings** > **Database**
2. Regardez la section **Database password**
3. Si vous ne vous en souvenez pas, cliquez sur **Reset database password** pour en créer un nouveau

### Étape 3 : Exécuter le script automatique

Une fois que `DATABASE_URL` est dans `.env.local`, exécutez simplement :

```bash
npm run supabase:ultimate-auto
```

**🎉 C'est tout !** Le script va :
- ✅ Se connecter automatiquement à PostgreSQL
- ✅ Créer la fonction RPC `exec_sql` (si elle n'existe pas)
- ✅ Créer toutes les politiques RLS Storage
- ✅ Tout configurer en moins de 30 secondes

## 🔄 Utilisation future

Une fois cette configuration faite, vous pouvez utiliser ces commandes pour tout gérer automatiquement :

- `npm run supabase:ultimate-auto` - Configure tout (fonction RPC + politiques RLS)
- `npm run supabase:fix-storage-rls` - Recrée les politiques RLS seulement
- `npm run supabase:init` - Configure tout (bucket, storage, realtime, etc.)

**Plus besoin d'aller dans Supabase Dashboard ! 🎉**

---

## 📝 Structure complète de .env.local

Votre `.env.local` devrait ressembler à ceci :

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**⚠️ SÉCURITÉ** : Ne commitez jamais `.env.local` dans Git ! Il est déjà dans `.gitignore`.

