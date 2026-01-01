/**
 * Script pour créer automatiquement le bucket Supabase Storage
 * Utilise l'API Supabase avec service_role pour créer le bucket
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
 * Vérifie si le bucket existe
 */
async function checkBucketExists(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Erreur lors de la vérification des buckets:', error.message);
    return false;
  }
  
  return buckets?.some(bucket => bucket.id === BUCKET_NAME) || false;
}

/**
 * Crée le bucket via SQL (meilleure méthode)
 */
async function createBucketViaSQL(supabase) {
  const sql = `
    -- Créer le bucket (si il n'existe pas déjà)
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', true)
    ON CONFLICT (id) DO NOTHING;
  `;
  
  try {
    // Utiliser la fonction RPC exec_sql
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      if (error.message.includes('function exec_sql') || error.code === '42883') {
        throw new Error('FONCTION_RPC_MANQUANTE');
      }
      throw error;
    }
    
    if (data && data.success) {
      return true;
    }
    
    return false;
  } catch (error) {
    if (error.message === 'FONCTION_RPC_MANQUANTE') {
      throw error;
    }
    // Si le bucket existe déjà, c'est OK
    if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      return true;
    }
    throw error;
  }
}

/**
 * Crée le bucket via l'API REST (méthode alternative)
 */
async function createBucketViaAPI(supabase, url, serviceRoleKey) {
  // Supabase Storage API pour créer un bucket
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
    },
    body: JSON.stringify({
      id: BUCKET_NAME,
      name: BUCKET_NAME,
      public: true,
      file_size_limit: 52428800, // 50MB
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    }),
  });
  
  if (response.ok) {
    return true;
  }
  
  const errorText = await response.text();
  // Si le bucket existe déjà, c'est OK
  if (response.status === 409 || errorText.includes('already exists')) {
    return true;
  }
  
  throw new Error(`Erreur API: ${response.status} - ${errorText}`);
}

/**
 * Crée les politiques RLS pour le bucket
 */
async function createStoragePolicies(supabase) {
  const policies = [
    {
      name: 'Authenticated users can upload images',
      policy: `
        CREATE POLICY IF NOT EXISTS "Authenticated users can upload images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = '${BUCKET_NAME}');
      `,
    },
    {
      name: 'Public can view images',
      policy: `
        CREATE POLICY IF NOT EXISTS "Public can view images"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = '${BUCKET_NAME}');
      `,
    },
    {
      name: 'Users can delete their own images',
      policy: `
        CREATE POLICY IF NOT EXISTS "Users can delete their own images"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = '${BUCKET_NAME}' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
  ];
  
  const results = [];
  
  for (const { name, policy } of policies) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: policy });
      
      if (error) {
        if (error.message.includes('function exec_sql') || error.code === '42883') {
          throw new Error('FONCTION_RPC_MANQUANTE');
        }
        // Si la politique existe déjà, c'est OK
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          results.push({ name, success: true, message: 'Déjà existante' });
        } else {
          results.push({ name, success: false, error: error.message });
        }
      } else {
        results.push({ name, success: true });
      }
    } catch (error) {
      if (error.message === 'FONCTION_RPC_MANQUANTE') {
        throw error;
      }
      results.push({ name, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Script principal
 */
async function main() {
  console.log('📦 Configuration du bucket Supabase Storage...\n');
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
    
    // Étape 1: Vérifier si le bucket existe
    console.log(`🔍 Vérification du bucket "${BUCKET_NAME}"...`);
    const bucketExists = await checkBucketExists(supabase);
    
    if (bucketExists) {
      console.log(`✅ Le bucket "${BUCKET_NAME}" existe déjà !\n`);
    } else {
      console.log(`⚠️  Le bucket "${BUCKET_NAME}" n'existe pas. Création...\n`);
      
      // Essayer de créer via SQL
      try {
        await createBucketViaSQL(supabase);
        console.log(`✅ Bucket "${BUCKET_NAME}" créé avec succès via SQL !\n`);
      } catch (error) {
        if (error.message === 'FONCTION_RPC_MANQUANTE') {
          console.log('⚠️  La fonction RPC exec_sql n\'existe pas.');
          console.log('💡 Création du bucket via l\'API REST...\n');
          
          try {
            await createBucketViaAPI(supabase, config.url, config.serviceRoleKey);
            console.log(`✅ Bucket "${BUCKET_NAME}" créé avec succès via API !\n`);
          } catch (apiError) {
            console.error('❌ Erreur lors de la création du bucket:', apiError.message);
            console.log('\n💡 Vous devez créer le bucket manuellement dans Supabase Dashboard:');
            console.log('   1. Allez dans Storage > Buckets');
            console.log(`   2. Cliquez sur "New bucket"`);
            console.log(`   3. Nom: ${BUCKET_NAME}`);
            console.log(`   4. Public: Oui`);
            console.log(`   5. Cliquez sur "Create bucket"\n`);
            process.exit(1);
          }
        } else {
          throw error;
        }
      }
    }
    
    // Étape 2: Créer les politiques RLS
    console.log('📋 Création des politiques RLS pour le Storage...\n');
    
    try {
      const policyResults = await createStoragePolicies(supabase);
      
      for (const result of policyResults) {
        if (result.success) {
          console.log(`   ✅ ${result.name}`);
        } else {
          console.log(`   ⚠️  ${result.name}: ${result.error || result.message}`);
        }
      }
      console.log();
    } catch (error) {
      if (error.message === 'FONCTION_RPC_MANQUANTE') {
        console.log('⚠️  Impossible de créer les politiques automatiquement.');
        console.log('💡 Vous devrez les créer manuellement dans Supabase Dashboard.\n');
      } else {
        console.error('❌ Erreur lors de la création des politiques:', error.message);
      }
    }
    
    // Vérification finale
    console.log('🔍 Vérification finale...');
    const finalCheck = await checkBucketExists(supabase);
    
    if (finalCheck) {
      console.log('✅ Configuration terminée avec succès !\n');
      console.log('═'.repeat(60));
      console.log();
      console.log('🎉 Le bucket Storage est maintenant prêt pour l\'upload d\'images !');
      console.log();
    } else {
      console.log('❌ Le bucket n\'existe toujours pas après la configuration.');
      console.log('💡 Veuillez le créer manuellement dans Supabase Dashboard.\n');
      process.exit(1);
    }
    
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

