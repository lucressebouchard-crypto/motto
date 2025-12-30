/**
 * Script d'administration Supabase
 * Utilise l'API REST de Supabase pour automatiser les tâches
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
const envPath = join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseKey;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
      acc[key.trim()] = values.join('=').trim();
    }
    return acc;
  }, {});
  
  supabaseUrl = envVars.VITE_SUPABASE_URL;
  supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
} catch (error) {
  console.error('❌ Erreur lors de la lecture de .env.local:', error.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Exécute le schéma SQL dans Supabase
 */
export async function executeSchema() {
  try {
    const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    
    console.log('📝 Exécution du schéma SQL...');
    
    // Exécuter via l'API REST de Supabase
    // Note: Pour exécuter du SQL arbitraire, on a besoin d'une clé service_role
    // Pour l'instant, cette fonction montre comment on pourrait le faire
    // mais nécessite la clé service_role (pas anon)
    
    console.log('⚠️  Pour exécuter du SQL, utilisez le dashboard Supabase ou la CLI Supabase');
    console.log('📄 Le schéma est disponible dans: supabase/schema.sql');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du schéma:', error.message);
    throw error;
  }
}

/**
 * Vérifie que les tables existent
 */
export async function verifyTables() {
  try {
    console.log('🔍 Vérification des tables...');
    
    const tables = ['users', 'listings', 'chats', 'messages', 'notifications', 'appointments', 'quotes', 'favorites'];
    const results = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        if (error) {
          results[table] = { exists: false, error: error.message };
        } else {
          results[table] = { exists: true };
        }
      } catch (err) {
        results[table] = { exists: false, error: err.message };
      }
    }
    
    console.log('\n📊 Résultats:');
    for (const [table, result] of Object.entries(results)) {
      if (result.exists) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - ${result.error}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    throw error;
  }
}

/**
 * Teste la connexion à Supabase
 */
export async function testConnection() {
  try {
    console.log('🔌 Test de connexion à Supabase...');
    console.log(`📍 URL: ${supabaseUrl}`);
    
    // Test simple: essayer de récupérer les utilisateurs
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Connexion établie mais certaines tables peuvent ne pas exister');
      console.log(`   Erreur: ${error.message}`);
    } else {
      console.log('✅ Connexion réussie!');
    }
    
    return { success: !error, error };
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    throw error;
  }
}

// Si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      testConnection();
      break;
    case 'verify':
      verifyTables();
      break;
    default:
      console.log('Usage: node scripts/supabase-admin.js [test|verify]');
  }
}
