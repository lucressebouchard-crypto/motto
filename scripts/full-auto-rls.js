/**
 * Script COMPLETEMENT AUTOMATIQUE pour configurer les politiques RLS Storage
 * Utilise la connection PostgreSQL directe pour exécuter le SQL
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  const dbUrl = vars.DATABASE_URL || vars.SUPABASE_DB_URL; // Connection string PostgreSQL
  
  if (!url || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local');
  }
  
  return { url, serviceRoleKey, dbUrl };
}

/**
 * Exécute du SQL via l'API REST Supabase en créant une fonction temporaire
 */
async function executeSQLViaAPI(url, serviceRoleKey, sql) {
  // Créer d'abord la fonction RPC si elle n'existe pas
  const createRPCFunction = `
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
  `;

  // Pour créer la fonction, on doit utiliser l'API SQL de Supabase
  // Mais Supabase ne permet pas cela directement via REST
  // On va utiliser une approche différente : créer via l'endpoint SQL spécial
  
  try {
    // Utiliser l'endpoint SQL de Supabase (nécessite la clé service_role)
    // Format: https://[project-ref].supabase.co/rest/v1/rpc/exec_sql
    // Mais d'abord, on doit créer cette fonction...
    
    // Solution: Utiliser l'API Management de Supabase ou l'endpoint SQL direct
    const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      throw new Error('Impossible de déterminer le project_ref');
    }

    // Essayer d'exécuter le SQL via une requête HTTP directe
    // L'endpoint SQL de Supabase nécessite une authentification spéciale
    // Pour l'instant, on va utiliser l'approche via la fonction RPC si elle existe
    
    console.log('   ⚠️  Tentative d\'exécution via API REST...');
    
    // Essayer d'appeler exec_sql
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success === false) {
        throw new Error(result.error || 'Erreur lors de l\'exécution SQL');
      }
      return result;
    }

    // Si la fonction n'existe pas (404), on doit la créer
    if (response.status === 404 || response.status === 400) {
      console.log('   💡 La fonction RPC n\'existe pas encore.');
      throw new Error('RPC_FUNCTION_NOT_FOUND');
    }

    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
    
  } catch (error) {
    if (error.message === 'RPC_FUNCTION_NOT_FOUND') {
      throw error;
    }
    throw error;
  }
}

/**
 * Crée la fonction RPC et les politiques en une seule fois
 */
async function setupComplete() {
  console.log('🚀 Configuration COMPLÈTE et AUTOMATIQUE des politiques RLS\n');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    const config = loadConfig();
    
    // SQL complet à exécuter
    const completeSQL = `
-- Créer la fonction RPC exec_sql
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

    console.log('📋 Tentative d\'exécution automatique du SQL...\n');
    
    try {
      // Essayer d'exécuter via l'API REST (si la fonction existe déjà)
      await executeSQLViaAPI(config.url, config.serviceRoleKey, completeSQL);
      console.log('✅ Configuration terminée automatiquement !\n');
    } catch (error) {
      if (error.message === 'RPC_FUNCTION_NOT_FOUND') {
        console.log('═'.repeat(60));
        console.log();
        console.log('⚠️  PREMIER DÉPLOIEMENT : Action manuelle requise UNE SEULE FOIS');
        console.log();
        console.log('📝 Pour activer l\'automatisation complète, exécutez ce SQL dans Supabase Dashboard:');
        console.log();
        console.log('═'.repeat(60));
        console.log();
        console.log(completeSQL);
        console.log();
        console.log('═'.repeat(60));
        console.log();
        console.log('💡 Étapes:');
        console.log('   1. Allez sur https://supabase.com/dashboard');
        console.log('   2. Sélectionnez votre projet');
        console.log('   3. SQL Editor > New query');
        console.log('   4. Copiez-collez TOUT le SQL ci-dessus');
        console.log('   5. Cliquez sur Run');
        console.log('   6. Relancez: npm run supabase:full-auto\n');
        console.log('🎯 Après cette étape, tout sera automatique !\n');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

setupComplete();

