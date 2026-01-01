/**
 * Script de test pour vérifier l'upload Storage avec une session utilisateur
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
 * Vérifie les politiques RLS
 */
async function checkPolicies(url, serviceRoleKey) {
  const supabase = createClient(url, serviceRoleKey);
  
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
        AND policyname LIKE '%images%' OR policyname LIKE '%authenticated%' OR policyname LIKE '%public%'
      ORDER BY policyname;
    `
  });
  
  if (error) {
    console.log('❌ Erreur lors de la vérification des politiques:', error.message);
    return null;
  }
  
  return data;
}

/**
 * Teste l'upload avec anon key (sans session)
 */
async function testUploadWithoutSession(url, anonKey) {
  console.log('🔍 Test 1: Upload sans session (devrait échouer)...\n');
  
  const supabase = createClient(url, anonKey);
  
  // Créer un fichier test
  const testContent = 'test content';
  const testFile = new Blob([testContent], { type: 'text/plain' });
  const testFileName = `test-${Date.now()}.txt`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(testFileName, testFile);
  
  if (error) {
    console.log(`   ✅ Erreur attendue: ${error.message}`);
    if (error.message.includes('row-level security')) {
      console.log('   ✅ L\'erreur RLS est correcte (pas de session)\n');
    }
  } else {
    console.log('   ⚠️  Upload réussi sans session (anormal)\n');
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('🧪 Test de l\'upload Storage...\n');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    const config = loadConfig();
    
    // Test 1: Vérifier les politiques
    console.log('📋 Vérification des politiques RLS...\n');
    const envPath = join(rootDir, '.env.local');
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
    
    if (vars.SUPABASE_SERVICE_ROLE_KEY) {
      const policies = await checkPolicies(config.url, vars.SUPABASE_SERVICE_ROLE_KEY);
      if (policies && policies.length > 0) {
        console.log(`✅ ${policies.length} politique(s) trouvée(s):\n`);
        policies.forEach(p => {
          console.log(`   - ${p.policyname} (${p.cmd})`);
        });
        console.log();
      } else {
        console.log('⚠️  Aucune politique trouvée\n');
      }
    }
    
    // Test 2: Upload sans session
    await testUploadWithoutSession(config.url, config.anonKey);
    
    console.log('═'.repeat(60));
    console.log();
    console.log('💡 INSTRUCTIONS:');
    console.log();
    console.log('Pour résoudre l\'erreur RLS dans votre application:');
    console.log();
    console.log('1. Créez les politiques manuellement dans Supabase Dashboard:');
    console.log('   - Allez sur https://supabase.com/dashboard');
    console.log('   - SQL Editor > New query');
    console.log('   - Exécutez le SQL dans FIX_RLS_MANUAL.md');
    console.log();
    console.log('2. Vérifiez que vous êtes connecté dans l\'application');
    console.log('3. Vérifiez que le bucket "listing-images" est PUBLIC');
    console.log();
    console.log('4. Testez à nouveau l\'upload\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();

