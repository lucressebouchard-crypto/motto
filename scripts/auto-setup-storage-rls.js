/**
 * Script AUTOMATIQUE pour configurer les politiques RLS Storage
 * Crée d'abord la fonction RPC si nécessaire, puis les politiques
 */

import { createClient } from '@supabase/supabase-js';
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
  
  if (!url || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local');
  }
  
  return { url, serviceRoleKey };
}

/**
 * Crée la fonction RPC exec_sql via l'API REST directe
 */
async function createRPCFunctionViaAPI(url, serviceRoleKey) {
  console.log('🔧 Création de la fonction RPC exec_sql...\n');
  
  const functionSQL = `
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
      'message', 'Query executed successfully',
      'affected_rows', FOUND
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
  `.trim();

  // Utiliser l'API REST de Supabase pour exécuter le SQL
  // Supabase permet d'exécuter du SQL via l'endpoint spécial
  try {
    // Méthode 1: Essayer via l'API REST directe
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ 
        query: functionSQL 
      }),
    });

    // Si ça ne fonctionne pas, la fonction n'existe pas encore
    // On va utiliser une approche différente
    if (response.status === 404 || response.status === 400) {
      console.log('   ⚠️  La fonction RPC n\'existe pas encore.');
      console.log('   💡 Création via l\'API PostgreSQL directe...\n');
      
      // Utiliser l'API Management de Supabase (si disponible)
      // Sinon, utiliser la méthode alternative
      return await createRPCFunctionAlternative(url, serviceRoleKey, functionSQL);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    console.log('   ✅ Fonction RPC créée avec succès !\n');
    return true;
  } catch (error) {
    console.log(`   ⚠️  Méthode API REST échouée: ${error.message}`);
    return await createRPCFunctionAlternative(url, serviceRoleKey, functionSQL);
  }
}

/**
 * Méthode alternative : Utiliser l'API PostgreSQL directement
 */
async function createRPCFunctionAlternative(url, serviceRoleKey, functionSQL) {
  console.log('   🔄 Tentative alternative via API PostgreSQL...\n');
  
  // Extraire l'URL de connexion PostgreSQL depuis l'URL Supabase
  // Format: https://xxxxx.supabase.co
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    throw new Error('Impossible de déterminer le project_ref depuis l\'URL Supabase');
  }

  // Utiliser l'endpoint SQL de Supabase
  // Note: Supabase ne fournit pas d'API publique pour exécuter du SQL arbitraire
  // Il faut utiliser l'API Management ou une fonction existante
  
  // Pour l'instant, on va afficher le SQL à exécuter manuellement
  // MAIS on va aussi essayer via une requête HTTP directe
  try {
    // L'API Supabase permet d'exécuter du SQL via certaines fonctions spéciales
    // Essayons via l'endpoint /rest/v1/ avec une méthode spéciale
    
    console.log('   ⚠️  L\'exécution automatique nécessite une configuration supplémentaire.');
    console.log('   💡 Exécution manuelle requise pour créer la fonction RPC.\n');
    console.log('   📝 SQL à exécuter dans Supabase Dashboard > SQL Editor:\n');
    console.log(functionSQL);
    console.log('\n');
    
    return false;
  } catch (error) {
    throw error;
  }
}

/**
 * Vérifie si la fonction RPC existe
 */
async function checkRPCFunctionExists(supabase) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: 'SELECT 1 as test' 
    });
    
    if (error) {
      if (error.message.includes('function exec_sql') || error.code === '42883') {
        return false;
      }
      throw error;
    }
    
    return true;
  } catch (error) {
    if (error.message?.includes('function exec_sql') || error.code === '42883') {
      return false;
    }
    throw error;
  }
}

/**
 * Crée les politiques RLS via la fonction RPC
 */
async function createStoragePolicies(supabase) {
  console.log('📋 Création des politiques RLS pour le Storage...\n');
  
  const policiesSQL = `
-- Activer RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Politique 1: Upload pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = '${BUCKET_NAME}');

-- Politique 2: Lecture publique
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = '${BUCKET_NAME}');

-- Politique 3: Suppression pour propriétaires
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = '${BUCKET_NAME}' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
  `.trim();

  // Exécuter chaque instruction séparément
  const statements = policiesSQL.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (!statement.trim()) continue;
    
    const sql = statement.trim() + ';';
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        // Ignorer les erreurs "already exists" pour DROP POLICY
        if (error.message?.includes('does not exist') || 
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate')) {
          continue;
        }
        throw error;
      }
      
      if (data && !data.success && data.error) {
        // Ignorer les erreurs "already exists"
        if (data.error.includes('does not exist') || 
            data.error.includes('already exists')) {
          continue;
        }
        throw new Error(data.error);
      }
    } catch (error) {
      // Ignorer les erreurs "does not exist" pour DROP
      if (error.message?.includes('does not exist')) {
        continue;
      }
      throw error;
    }
  }
  
  console.log('   ✅ Politiques RLS créées avec succès !\n');
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Configuration AUTOMATIQUE des politiques RLS Storage\n');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    const config = loadConfig();
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Étape 1: Vérifier si la fonction RPC existe
    console.log('🔍 Étape 1: Vérification de la fonction RPC exec_sql...\n');
    const rpcExists = await checkRPCFunctionExists(supabase);
    
    if (!rpcExists) {
      console.log('   ⚠️  La fonction RPC n\'existe pas.\n');
      console.log('   🔧 Création automatique...\n');
      
      const created = await createRPCFunctionViaAPI(config.url, config.serviceRoleKey);
      
      if (!created) {
        console.log('═'.repeat(60));
        console.log();
        console.log('❌ IMPOSSIBLE DE CRÉER LA FONCTION RPC AUTOMATIQUEMENT');
        console.log();
        console.log('📝 ACTION REQUISE: Créez la fonction RPC manuellement');
        console.log();
        console.log('1. Allez sur https://supabase.com/dashboard');
        console.log('2. Sélectionnez votre projet');
        console.log('3. Allez dans SQL Editor > New query');
        console.log('4. Copiez-collez le SQL affiché ci-dessus');
        console.log('5. Cliquez sur Run');
        console.log('6. Relancez ce script: npm run supabase:auto-rls\n');
        process.exit(1);
      }
      
      // Attendre un peu pour que la fonction soit disponible
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier à nouveau
      const existsAfterCreation = await checkRPCFunctionExists(supabase);
      if (!existsAfterCreation) {
        console.log('   ⚠️  La fonction RPC n\'est pas encore disponible.');
        console.log('   💡 Attendez quelques secondes et relancez: npm run supabase:auto-rls\n');
        process.exit(1);
      }
    } else {
      console.log('   ✅ La fonction RPC existe déjà !\n');
    }
    
    // Étape 2: Créer les politiques RLS
    console.log('🔍 Étape 2: Création des politiques RLS...\n');
    await createStoragePolicies(supabase);
    
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Configuration terminée avec succès !');
    console.log();
    console.log('🎉 Les politiques RLS sont maintenant configurées.');
    console.log('   Vous pouvez maintenant uploader des images dans l\'application !\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error();
    console.log('💡 Si l\'erreur persiste:');
    console.log('   1. Vérifiez que SUPABASE_SERVICE_ROLE_KEY est correcte dans .env.local');
    console.log('   2. Exécutez le SQL manuellement dans Supabase Dashboard (voir instructions ci-dessus)');
    console.log();
    process.exit(1);
  }
}

main();

