/**
 * Script pour créer/corriger les politiques RLS pour le Storage
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
 * Crée ou met à jour les politiques RLS pour le Storage
 */
async function fixStoragePolicies(supabase) {
  console.log('📋 Création/Correction des politiques RLS pour le Storage...\n');
  
  const policies = [
    {
      name: 'Authenticated users can upload images',
      // D'abord supprimer si elle existe, puis créer
      sql: `
        DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
        CREATE POLICY "Authenticated users can upload images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = '${BUCKET_NAME}');
      `,
    },
    {
      name: 'Public can view images',
      sql: `
        DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
        CREATE POLICY "Public can view images"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = '${BUCKET_NAME}');
      `,
    },
    {
      name: 'Users can delete their own images',
      sql: `
        DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
        CREATE POLICY "Users can delete their own images"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = '${BUCKET_NAME}' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
    {
      name: 'Users can update their own images',
      sql: `
        DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
        CREATE POLICY "Users can update their own images"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
          bucket_id = '${BUCKET_NAME}' AND
          (storage.foldername(name))[1] = auth.uid()::text
        )
        WITH CHECK (
          bucket_id = '${BUCKET_NAME}' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
  ];
  
  const results = [];
  
  for (const { name, sql } of policies) {
    try {
      // Utiliser la fonction RPC exec_sql
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        if (error.message.includes('function exec_sql') || error.code === '42883') {
          throw new Error('FONCTION_RPC_MANQUANTE');
        }
        results.push({ name, success: false, error: error.message });
        console.log(`   ❌ ${name}: ${error.message}`);
      } else {
        results.push({ name, success: true });
        console.log(`   ✅ ${name}`);
      }
    } catch (error) {
      if (error.message === 'FONCTION_RPC_MANQUANTE') {
        throw error;
      }
      results.push({ name, success: false, error: error.message });
      console.log(`   ❌ ${name}: ${error.message}`);
    }
  }
  
  console.log();
  return results;
}

/**
 * Vérifie que les politiques existent
 */
async function verifyPolicies(supabase) {
  console.log('🔍 Vérification des politiques RLS...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%${BUCKET_NAME}%' OR policyname LIKE '%images%' OR policyname LIKE '%authenticated%' OR policyname LIKE '%public%';
    `
  });
  
  if (error) {
    console.log(`   ⚠️  Impossible de vérifier les politiques: ${error.message}\n`);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`   ✅ ${data.length} politique(s) trouvée(s):`);
    data.forEach((policy, index) => {
      console.log(`      ${index + 1}. ${policy.policyname} (${policy.cmd})`);
    });
  } else {
    console.log('   ⚠️  Aucune politique trouvée\n');
  }
  console.log();
}

/**
 * Script principal
 */
async function main() {
  console.log('🔧 Correction des politiques RLS pour le Storage...\n');
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
    
    // Vérifier d'abord les politiques existantes
    try {
      await verifyPolicies(supabase);
    } catch (error) {
      console.log('   ℹ️  Impossible de vérifier les politiques (normal si la fonction RPC n\'existe pas)\n');
    }
    
    // Créer/Corriger les politiques
    try {
      const results = await fixStoragePolicies(supabase);
      
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        console.log('✅ Toutes les politiques RLS ont été créées/corrigées avec succès !\n');
      } else {
        console.log('⚠️  Certaines politiques n\'ont pas pu être créées.\n');
      }
    } catch (error) {
      if (error.message === 'FONCTION_RPC_MANQUANTE') {
        console.log('❌ La fonction RPC exec_sql n\'existe pas !\n');
        console.log('💡 Exécutez d\'abord: npm run supabase:setup-rpc\n');
        process.exit(1);
      } else {
        throw error;
      }
    }
    
    console.log('═'.repeat(60));
    console.log();
    console.log('🎉 Les politiques RLS sont maintenant configurées !');
    console.log('   Vous pouvez maintenant uploader des images.\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log('\n💡 Assurez-vous d\'avoir SUPABASE_SERVICE_ROLE_KEY dans votre .env.local');
      console.log('   Vous pouvez la trouver dans Supabase Dashboard > Settings > API > service_role key\n');
    }
    process.exit(1);
  }
}

main();

