/**
 * Script pour vérifier les politiques RLS du Storage
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
 * Liste toutes les politiques RLS pour storage.objects
 */
async function listStoragePolicies(supabase) {
  console.log('🔍 Liste des politiques RLS pour storage.objects...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        policyname,
        cmd,
        roles,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
      ORDER BY policyname;
    `
  });
  
  if (error) {
    if (error.message.includes('function exec_sql') || error.code === '42883') {
      console.log('❌ La fonction RPC exec_sql n\'existe pas !');
      console.log('💡 Exécutez d\'abord: npm run supabase:setup-rpc\n');
      return null;
    }
    console.error('❌ Erreur:', error.message);
    return null;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('⚠️  Aucune politique trouvée pour storage.objects\n');
    return [];
  }
  
  console.log(`✅ ${data.length} politique(s) trouvée(s):\n`);
  data.forEach((policy, index) => {
    console.log(`${index + 1}. "${policy.policyname}"`);
    console.log(`   Type: ${policy.cmd}`);
    console.log(`   Rôles: ${policy.roles?.join(', ') || 'N/A'}`);
    if (policy.qual) {
      console.log(`   USING: ${policy.qual.substring(0, 100)}...`);
    }
    if (policy.with_check) {
      console.log(`   WITH CHECK: ${policy.with_check.substring(0, 100)}...`);
    }
    console.log();
  });
  
  return data;
}

/**
 * Crée les politiques RLS correctement
 */
async function createCorrectPolicies(supabase) {
  console.log('📋 Création des politiques RLS...\n');
  
  const policies = [
    {
      name: 'Authenticated users can upload images',
      sql: `
        DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
        CREATE POLICY "Authenticated users can upload images"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = '${BUCKET_NAME}');
      `,
    },
    {
      name: 'Public can view images',
      sql: `
        DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
        CREATE POLICY "Public can view images"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = '${BUCKET_NAME}');
      `,
    },
    {
      name: 'Users can delete their own images',
      sql: `
        DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
        CREATE POLICY "Users can delete their own images"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id = '${BUCKET_NAME}' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
  ];
  
  const results = [];
  
  for (const { name, sql } of policies) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        console.log(`   ❌ ${name}: ${error.message}`);
        results.push({ name, success: false, error: error.message });
      } else {
        console.log(`   ✅ ${name}`);
        results.push({ name, success: true });
      }
    } catch (error) {
      console.log(`   ❌ ${name}: ${error.message}`);
      results.push({ name, success: false, error: error.message });
    }
  }
  
  console.log();
  return results;
}

/**
 * Vérifie que RLS est activé sur storage.objects
 */
async function checkRLSEnabled(supabase) {
  console.log('🔍 Vérification de l\'activation RLS sur storage.objects...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'storage' AND tablename = 'objects';
    `
  });
  
  if (error) {
    console.log(`   ⚠️  Impossible de vérifier: ${error.message}\n`);
    return;
  }
  
  if (data && data.length > 0) {
    const rlsEnabled = data[0].rowsecurity;
    if (rlsEnabled) {
      console.log('   ✅ RLS est activé sur storage.objects\n');
    } else {
      console.log('   ⚠️  RLS n\'est PAS activé sur storage.objects\n');
      console.log('   💡 Activation de RLS...\n');
      
      const { error: enableError } = await supabase.rpc('exec_sql', {
        query: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
      });
      
      if (enableError) {
        console.log(`   ❌ Erreur: ${enableError.message}\n`);
      } else {
        console.log('   ✅ RLS activé avec succès !\n');
      }
    }
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('🔍 Vérification des politiques RLS Storage...\n');
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
    
    // Vérifier que RLS est activé
    await checkRLSEnabled(supabase);
    
    // Lister les politiques existantes
    const existingPolicies = await listStoragePolicies(supabase);
    
    // Vérifier si les politiques nécessaires existent
    const requiredPolicies = [
      'Authenticated users can upload images',
      'Public can view images',
      'Users can delete their own images',
    ];
    
    if (existingPolicies) {
      const policyNames = existingPolicies.map(p => p.policyname);
      const missingPolicies = requiredPolicies.filter(name => !policyNames.includes(name));
      
      if (missingPolicies.length > 0) {
        console.log(`⚠️  Politiques manquantes: ${missingPolicies.join(', ')}\n`);
        console.log('📋 Création des politiques manquantes...\n');
        await createCorrectPolicies(supabase);
      } else {
        console.log('✅ Toutes les politiques requises existent !\n');
      }
    } else {
      // Si on ne peut pas lister, essayons de créer quand même
      console.log('💡 Tentative de création des politiques...\n');
      await createCorrectPolicies(supabase);
    }
    
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Vérification terminée !');
    console.log();
    console.log('💡 Si l\'erreur persiste :');
    console.log('   1. Vérifiez que vous êtes bien connecté (authentifié)');
    console.log('   2. Videz le cache du navigateur');
    console.log('   3. Redéployez sur Cloudflare Pages si nécessaire\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log('\n💡 Assurez-vous d\'avoir SUPABASE_SERVICE_ROLE_KEY dans votre .env.local\n');
    }
    process.exit(1);
  }
}

main();

