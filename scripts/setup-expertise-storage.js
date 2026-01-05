/**
 * Script pour créer automatiquement les buckets Supabase Storage pour les expertises
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const BUCKETS = [
  {
    id: 'expertise-media',
    name: 'expertise-media',
    public: true,
    file_size_limit: 52428800, // 50MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime'],
  },
  {
    id: 'expertise-reports',
    name: 'expertise-reports',
    public: true,
    file_size_limit: 10485760, // 10MB
    allowed_mime_types: ['application/pdf'],
  },
];

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

async function checkBucketExists(supabase, bucketId) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Erreur lors de la vérification des buckets:', error.message);
    return false;
  }
  
  return buckets?.some(bucket => bucket.id === bucketId) || false;
}

async function createBucketViaAPI(url, serviceRoleKey, bucketConfig) {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
    },
    body: JSON.stringify(bucketConfig),
  });
  
  const responseText = await response.text();
  
  if (response.ok) {
    return true;
  }
  
  if (response.status === 409) {
    return true; // Déjà existant
  }
  
  if (response.status === 404) {
    throw new Error('ENDPOINT_NOT_FOUND');
  }
  
  throw new Error(`Erreur API: ${response.status} - ${responseText}`);
}

async function main() {
  console.log('📦 Configuration des buckets Storage pour les expertises...\n');
  console.log('═'.repeat(70));
  console.log();
  
  try {
    const config = loadConfig();
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    let createdCount = 0;
    let existingCount = 0;
    
    for (const bucket of BUCKETS) {
      console.log(`🔍 Vérification du bucket "${bucket.id}"...`);
      const exists = await checkBucketExists(supabase, bucket.id);
      
      if (exists) {
        console.log(`✅ Le bucket "${bucket.id}" existe déjà !\n`);
        existingCount++;
      } else {
        console.log(`⚠️  Le bucket "${bucket.id}" n'existe pas. Création...`);
        
        try {
          await createBucketViaAPI(config.url, config.serviceRoleKey, bucket);
          console.log(`✅ Bucket "${bucket.id}" créé avec succès !\n`);
          createdCount++;
        } catch (error) {
          if (error.message === 'ENDPOINT_NOT_FOUND') {
            console.log(`⚠️  L'endpoint API n'est pas disponible pour "${bucket.id}".`);
            console.log(`💡 Vous devrez créer ce bucket manuellement dans Supabase Dashboard.\n`);
          } else {
            console.error(`❌ Erreur lors de la création de "${bucket.id}":`, error.message);
            console.log(`💡 Vous devrez créer ce bucket manuellement.\n`);
          }
        }
      }
    }
    
    console.log('═'.repeat(70));
    console.log();
    console.log('📊 Résumé:');
    console.log(`   ✅ Créés: ${createdCount}`);
    console.log(`   ℹ️  Existants: ${existingCount}`);
    console.log();
    
    if (createdCount + existingCount === BUCKETS.length) {
      console.log('🎉 Tous les buckets sont prêts !');
      console.log('💡 Assurez-vous d\'exécuter le SQL des politiques dans supabase/setup-expertise-storage.sql\n');
    } else {
      console.log('⚠️  Certains buckets n\'ont pas pu être créés automatiquement.');
      console.log('💡 Créez-les manuellement dans Supabase Dashboard > Storage > Buckets\n');
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

