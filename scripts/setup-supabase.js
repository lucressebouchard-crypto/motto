/**
 * Script de configuration Supabase
 * Vérifie la connexion et aide à configurer Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Charge les variables d'environnement depuis .env.local
 */
function loadEnv() {
  const envPath = join(rootDir, '.env.local');
  
  if (!existsSync(envPath)) {
    console.log('⚠️  Fichier .env.local non trouvé');
    return null;
  }
  
  try {
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
    
    return vars;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture de .env.local:', error.message);
    return null;
  }
}

/**
 * Teste la connexion à Supabase
 */
async function testConnection() {
  console.log('🔌 Test de connexion à Supabase...\n');
  
  const env = loadEnv();
  if (!env) {
    console.log('💡 Créez le fichier .env.local avec:');
    console.log('   VITE_SUPABASE_URL=votre_url');
    console.log('   VITE_SUPABASE_ANON_KEY=votre_cle\n');
    return false;
  }
  
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = env;
  
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    console.log('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants dans .env.local\n');
    return false;
  }
  
  console.log(`📍 URL: ${VITE_SUPABASE_URL}`);
  console.log(`🔑 Clé: ${VITE_SUPABASE_ANON_KEY.substring(0, 20)}...\n`);
  
  try {
    const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
    
    // Test de connexion basique
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Connexion OK mais la table "users" n\'existe pas encore');
        console.log('💡 Exécutez le schéma SQL dans le dashboard Supabase\n');
        return false;
      } else {
        console.log(`❌ Erreur: ${error.message}\n`);
        return false;
      }
    }
    
    console.log('✅ Connexion réussie!\n');
    return true;
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}\n`);
    return false;
  }
}

/**
 * Vérifie que toutes les tables existent
 */
async function verifyTables() {
  console.log('🔍 Vérification des tables...\n');
  
  const env = loadEnv();
  if (!env || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    console.log('❌ Configuration manquante. Exécutez d\'abord: npm run supabase:test\n');
    return;
  }
  
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  
  const tables = [
    'users',
    'listings', 
    'chats',
    'messages',
    'notifications',
    'appointments',
    'quotes',
    'favorites'
  ];
  
  const results = [];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        results.push({ table, exists: false, error: error.message });
        console.log(`  ❌ ${table} - ${error.message}`);
      } else {
        results.push({ table, exists: true });
        console.log(`  ✅ ${table}`);
      }
    } catch (err) {
      results.push({ table, exists: false, error: err.message });
      console.log(`  ❌ ${table} - ${err.message}`);
    }
  }
  
  console.log();
  
  const allExist = results.every(r => r.exists);
  if (allExist) {
    console.log('✅ Toutes les tables existent!\n');
  } else {
    console.log('⚠️  Certaines tables manquent. Exécutez le schéma SQL.\n');
  }
  
  return results;
}

/**
 * Affiche les instructions pour exécuter le schéma SQL
 */
function showSchemaInstructions() {
  console.log('📝 Pour exécuter le schéma SQL:\n');
  console.log('1. Allez sur https://supabase.com/dashboard');
  console.log('2. Sélectionnez votre projet');
  console.log('3. Cliquez sur "SQL Editor" dans le menu de gauche');
  console.log('4. Cliquez sur "New query"');
  console.log('5. Ouvrez le fichier: supabase/schema.sql');
  console.log('6. Copiez tout le contenu et collez-le dans l\'éditeur');
  console.log('7. Cliquez sur "Run" (ou appuyez sur F5)');
  console.log('8. Vérifiez qu\'il n\'y a pas d\'erreurs\n');
}

// Exécution du script
const command = process.argv[2] || 'test';

switch (command) {
  case 'test':
    testConnection().then(success => {
      if (!success) {
        process.exit(1);
      }
    });
    break;
    
  case 'verify':
    verifyTables();
    break;
    
  case 'schema':
    showSchemaInstructions();
    break;
    
  default:
    console.log('Usage: node scripts/setup-supabase.js [test|verify|schema]\n');
    console.log('  test   - Teste la connexion à Supabase');
    console.log('  verify - Vérifie que toutes les tables existent');
    console.log('  schema - Affiche les instructions pour exécuter le schéma SQL\n');
}
