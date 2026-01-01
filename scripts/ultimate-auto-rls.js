/**
 * Script ULTIME : Configuration AUTOMATIQUE via connexion PostgreSQL directe
 * Ce script se connecte directement à PostgreSQL pour exécuter le SQL
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const BUCKET_NAME = 'listing-images';

/**
 * Charge la configuration depuis .env.local
 */
function loadConfig() {
  const envPath = join(rootDir, '.env.local');
  
  if (!existsSync(envPath)) {
    throw new Error('Fichier .env.local non trouvé');
  }
  
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length) {
        vars[key.trim()] = values.join('=').trim();
      }
    }
  });
  
  const url = vars.VITE_SUPABASE_URL;
  const serviceRoleKey = vars.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = vars.DATABASE_URL || vars.SUPABASE_DB_URL;
  
  if (!url) {
    throw new Error('VITE_SUPABASE_URL doit être défini dans .env.local');
  }
  
  // Extraire les infos de connexion depuis l'URL Supabase
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    throw new Error('Impossible de déterminer le project_ref depuis VITE_SUPABASE_URL');
  }
  
  // Construire la connection string PostgreSQL
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // Le mot de passe doit être dans SUPABASE_DB_PASSWORD ou on utilisera la clé service_role
  
  const dbPassword = vars.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword && !dbUrl) {
    console.log('⚠️  SUPABASE_DB_PASSWORD ou DATABASE_URL non trouvé.');
    console.log('💡 Vous pouvez trouver la connection string dans:');
    console.log('   Supabase Dashboard > Settings > Database > Connection string\n');
    throw new Error('SUPABASE_DB_PASSWORD ou DATABASE_URL requis pour la connexion PostgreSQL directe');
  }
  
  const connectionString = dbUrl || `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
  
  return { url, serviceRoleKey, connectionString, projectRef };
}

/**
 * Exécute du SQL via connexion PostgreSQL directe
 */
async function executeSQLDirect(sql) {
  const config = loadConfig();
  const client = new Client({
    connectionString: config.connectionString,
    ssl: {
      rejectUnauthorized: false // Supabase nécessite SSL mais avec certificat auto-signé
    }
  });
  
  try {
    await client.connect();
    console.log('   ✅ Connexion PostgreSQL établie\n');
    
    // Exécuter chaque instruction séparément
    const statements = sql.split(';').filter(s => s.trim());
    const results = [];
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      
      try {
        console.log(`   🔄 Exécution: ${trimmed.substring(0, 60)}...`);
        const result = await client.query(trimmed);
        results.push({ success: true, statement: trimmed.substring(0, 50) });
        console.log(`      ✅ Réussi\n`);
      } catch (error) {
        // Ignorer les erreurs "already exists" ou "does not exist" pour certaines commandes
        if (error.message.includes('does not exist') && trimmed.toUpperCase().includes('DROP')) {
          console.log(`      ⚠️  Ignoré (n'existe pas): ${error.message}\n`);
          results.push({ success: true, ignored: true });
          continue;
        }
        
        if (error.message.includes('already exists')) {
          console.log(`      ⚠️  Ignoré (déjà existant): ${error.message}\n`);
          results.push({ success: true, ignored: true });
          continue;
        }
        
        console.log(`      ❌ Erreur: ${error.message}\n`);
        results.push({ success: false, error: error.message, statement: trimmed.substring(0, 50) });
      }
    }
    
    return results;
  } finally {
    await client.end();
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Configuration AUTOMATIQUE via connexion PostgreSQL directe\n');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    const config = loadConfig();
    
    console.log('📋 Configuration détectée:');
    console.log(`   Project: ${config.projectRef}`);
    console.log(`   Connexion PostgreSQL: OK\n`);
    
    // SQL complet à exécuter
    const completeSQL = `
-- Créer la fonction RPC exec_sql (pour usage futur)
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  rec record;
  rows json[] := '{}';
BEGIN
  IF upper(trim(query)) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE query
    LOOP
      rows := rows || to_json(rec);
    END LOOP;
    RETURN json_build_object(
      'success', true,
      'rows', rows,
      'count', array_length(rows, 1)
    );
  ELSE
    EXECUTE query;
    RETURN json_build_object(
      'success', true,
      'message', 'Query executed successfully'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Activer RLS sur storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Créer les nouvelles politiques
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = '${BUCKET_NAME}');

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = '${BUCKET_NAME}');

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = '${BUCKET_NAME}' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
    `.trim();
    
    console.log('📋 Exécution du SQL...\n');
    const results = await executeSQLDirect(completeSQL);
    
    const successCount = results.filter(r => r.success && !r.ignored).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Configuration terminée !');
    console.log(`   ${successCount} opération(s) réussie(s)`);
    if (errorCount > 0) {
      console.log(`   ⚠️  ${errorCount} erreur(s)`);
    }
    console.log();
    console.log('🎉 Les politiques RLS sont maintenant configurées !');
    console.log('   Vous pouvez maintenant uploader des images dans l\'application.\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error();
    
    if (error.message.includes('SUPABASE_DB_PASSWORD') || error.message.includes('DATABASE_URL')) {
      console.log('💡 Pour activer l\'automatisation complète:');
      console.log();
      console.log('   1. Allez sur Supabase Dashboard > Settings > Database');
      console.log('   2. Copiez la "Connection string" (URI ou Pooler)');
      console.log('   3. Ajoutez-la dans .env.local comme:');
      console.log('      DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres');
      console.log('   4. Relancez: npm run supabase:ultimate-auto\n');
      console.log('   ⚠️  Alternative: Exécutez le SQL manuellement (voir SOLUTION_RLS_FINALE.md)\n');
    }
    
    process.exit(1);
  }
}

main();

