# Configuration Supabase

## Étapes pour configurer Supabase

1. **Créer un projet Supabase**
   - Allez sur https://supabase.com
   - Créez un compte ou connectez-vous
   - Créez un nouveau projet
   - Notez l'URL du projet et la clé anonyme (anon key)

2. **Exécuter le schéma SQL**
   - Dans votre projet Supabase, allez dans l'éditeur SQL
   - Copiez le contenu du fichier `supabase/schema.sql`
   - Exécutez-le dans l'éditeur SQL

3. **Configurer les variables d'environnement**
   - Créez un fichier `.env.local` à la racine du projet
   - Ajoutez les variables suivantes :
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   ```

4. **Configurer l'authentification**
   - Dans Supabase, allez dans Authentication > Settings
   - Configurez les providers d'authentification selon vos besoins
   - Activez l'authentification par email/password

5. **Vérifier les politiques RLS**
   - Les politiques Row Level Security (RLS) sont déjà configurées dans le schéma
   - Vérifiez qu'elles sont actives dans Supabase > Authentication > Policies

## Structure de la base de données

- **users** : Profils utilisateurs
- **listings** : Annonces de véhicules/accessoires
- **chats** : Conversations entre utilisateurs
- **messages** : Messages dans les chats
- **notifications** : Notifications utilisateurs
- **appointments** : Rendez-vous avec les mécaniciens
- **quotes** : Devis des mécaniciens
- **favorites** : Favoris des utilisateurs

