/**
 * Script de diagnostic pour vérifier le Storage bucket
 * Utilise les mêmes variables que l'application en production
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
  const anonKey = vars.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis dans .env.local');
  }
  
  return { url, anonKey };
}

/**
 * Script principal
 */
async function main() {
  console.log('🔍 Diagnostic du Storage Bucket...\n');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    const config = loadConfig();
    
    console.log('📋 Configuration:');
    console.log(`   URL: ${config.url}`);
    console.log(`   Anon Key: ${config.anonKey.substring(0, 20)}...`);
    console.log();
    
    // Créer un client avec anon key (comme l'application)
    const supabase = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Test 1: Essayer de lister les buckets (ne fonctionnera pas avec anon key)
    console.log('🔍 Test 1: Lister les buckets avec anon key...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log(`   ⚠️  Erreur attendue (anon key n'a pas accès): ${bucketsError.message}`);
      console.log('   ℹ️  C\'est normal, on va tester autrement...\n');
    } else {
      const bucketExists = buckets?.some(b => b.id === BUCKET_NAME);
      if (bucketExists) {
        console.log(`   ✅ Le bucket "${BUCKET_NAME}" existe !\n`);
      } else {
        console.log(`   ❌ Le bucket "${BUCKET_NAME}" n'existe pas !\n`);
      }
    }
    
    // Test 2: Essayer d'accéder directement au bucket (upload d'un fichier test)
    console.log('🔍 Test 2: Accéder au bucket directement...');
    const testFileName = `test-access-${Date.now()}.txt`;
    
    // Essayer de lister les fichiers (test d'accès SELECT)
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });
    
    if (listError) {
      console.log(`   ❌ Erreur lors de l'accès au bucket: ${listError.message}`);
      console.log(`   Code: ${listError.statusCode || 'N/A'}`);
      
      if (listError.message.includes('Bucket not found') || listError.statusCode === 404) {
        console.log('\n   ⚠️  PROBLÈME IDENTIFIÉ: Le bucket n\'existe pas !\n');
        console.log('💡 SOLUTION:');
        console.log('   1. Allez sur https://supabase.com/dashboard');
        console.log('   2. Sélectionnez votre projet');
        console.log('   3. Allez dans Storage > Buckets');
        console.log(`   4. Cliquez sur "New bucket"`);
        console.log(`   5. Nom: ${BUCKET_NAME}`);
        console.log(`   6. Public bucket: ✅ Cocher (très important !)`);
        console.log(`   7. File size limit: 50 MB`);
        console.log(`   8. Cliquez sur "Create bucket"`);
        console.log('\n   9. Ensuite, exécutez: npm run supabase:setup-storage\n');
      } else if (listError.message.includes('RLS') || listError.message.includes('permission')) {
        console.log('\n   ⚠️  PROBLÈME IDENTIFIÉ: Problème de permissions RLS !\n');
        console.log('💡 SOLUTION:');
        console.log('   1. Exécutez: npm run supabase:setup-storage');
        console.log('   2. Ou créez les politiques manuellement dans Supabase Dashboard\n');
      } else {
        console.log('\n   ⚠️  Erreur inconnue. Vérifiez vos variables d\'environnement.\n');
      }
    } else {
      console.log(`   ✅ Le bucket est accessible ! (${files?.length || 0} fichier(s) trouvé(s))`);
      console.log('   ℹ️  Le bucket existe et les permissions sont correctes.\n');
    }
    
    // Test 3: Vérifier les variables d'environnement Cloudflare
    console.log('🔍 Test 3: Variables d\'environnement Cloudflare Pages');
    console.log('   ℹ️  Vérifiez que ces variables sont définies sur Cloudflare Pages:');
    console.log(`      - VITE_SUPABASE_URL = ${config.url}`);
    console.log(`      - VITE_SUPABASE_ANON_KEY = ${config.anonKey.substring(0, 20)}...`);
    console.log();
    console.log('   📝 Étapes:');
    console.log('      1. Allez sur https://dash.cloudflare.com');
    console.log('      2. Workers & Pages > motto > Settings > Variables and Secrets');
    console.log('      3. Vérifiez que les 2 variables ci-dessus sont présentes');
    console.log('      4. Si elles existent, redéployez le projet');
    console.log('      5. Videz le cache de votre navigateur (Ctrl+Shift+Delete)\n');
    
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Diagnostic terminé !');
    console.log();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('.env.local')) {
      console.log('\n💡 Assurez-vous d\'avoir un fichier .env.local avec:');
      console.log('   VITE_SUPABASE_URL=...');
      console.log('   VITE_SUPABASE_ANON_KEY=...\n');
    }
    process.exit(1);
  }
}

main();

