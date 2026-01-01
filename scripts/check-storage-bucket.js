/**
 * Script pour vérifier si le bucket Storage existe et est accessible
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
  
  return {
    url: vars.VITE_SUPABASE_URL,
    anonKey: vars.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: vars.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function main() {
  console.log('🔍 Vérification du bucket Storage...\n');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    const config = loadConfig();
    
    if (!config.url || !config.serviceRoleKey) {
      console.error('❌ VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local');
      process.exit(1);
    }
    
    // Test avec service_role (admin)
    console.log('📦 Test avec service_role (admin)...');
    const adminClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erreur lors de la récupération des buckets:', bucketsError.message);
      console.error('   Code:', bucketsError.statusCode);
      process.exit(1);
    }
    
    console.log(`✅ ${buckets?.length || 0} bucket(s) trouvé(s):`);
    if (buckets && buckets.length > 0) {
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.id} (public: ${bucket.public})`);
      });
    }
    console.log();
    
    const bucketExists = buckets?.some(b => b.id === BUCKET_NAME) || false;
    
    if (!bucketExists) {
      console.error(`❌ Le bucket "${BUCKET_NAME}" n'existe pas !\n`);
      console.log('💡 Exécutez: npm run supabase:setup-storage\n');
      process.exit(1);
    }
    
    console.log(`✅ Le bucket "${BUCKET_NAME}" existe !\n`);
    
    // Test avec anon key (comme l'application)
    if (config.anonKey) {
      console.log('📦 Test avec anon key (comme l\'application)...');
      const anonClient = createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      // Essayer de lister les fichiers du bucket (test d'accès)
      const { data: files, error: filesError } = await anonClient.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: 1,
        });
      
      if (filesError) {
        console.error(`⚠️  Erreur lors de l'accès au bucket avec anon key:`, filesError.message);
        console.error('   Cela peut indiquer un problème de permissions RLS.\n');
      } else {
        console.log(`✅ Accès au bucket réussi avec anon key !\n`);
      }
    }
    
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Vérification terminée !');
    console.log();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();

