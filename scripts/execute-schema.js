/**
 * Script pour exécuter le schéma SQL dans Supabase
 * Utilise l'API REST de Supabase avec la clé service_role
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Pour exécuter du SQL via l'API, on a besoin de la clé service_role
// Obtenez-la depuis: Supabase Dashboard > Settings > API > service_role (secret)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Exécute le schéma SQL via l'API REST de Supabase
 */
async function executeSchema() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Pour exécuter le schéma SQL automatiquement, vous avez besoin:');
    console.log('   1. De la clé service_role (secrète)');
    console.log('   2. Définissez-la comme variable d\'environnement: SUPABASE_SERVICE_ROLE_KEY\n');
    console.log('💡 Méthode alternative (recommandée):');
    console.log('   1. Allez sur https://supabase.com/dashboard');
    console.log('   2. Sélectionnez votre projet');
    console.log('   3. Cliquez sur "SQL Editor"');
    console.log('   4. Cliquez sur "New query"');
    console.log('   5. Copiez le contenu de supabase/schema.sql');
    console.log('   6. Collez et cliquez sur "Run"\n');
    return;
  }

  const schemaPath = join(rootDir, 'supabase', 'schema.sql');
  
  if (!existsSync(schemaPath)) {
    console.error('❌ Fichier schema.sql non trouvé');
    return;
  }

  const schemaSQL = readFileSync(schemaPath, 'utf-8');
  
  console.log('📝 Exécution du schéma SQL via l\'API Supabase...\n');
  
  try {
    // Utiliser l'API REST de Supabase pour exécuter du SQL
    // Note: Cette méthode nécessite la clé service_role
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: schemaSQL }),
    });

    // Alternative: utiliser l'API PostgREST directement
    // Mais cela nécessite des permissions spéciales
    
    console.log('⚠️  L\'exécution directe via API nécessite des permissions spéciales.');
    console.log('💡 Utilisez plutôt le dashboard Supabase ou la CLI Supabase.\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Utilisez le dashboard Supabase pour exécuter le schéma SQL.\n');
  }
}

/**
 * Affiche le schéma SQL formaté pour faciliter la copie
 */
function showSchema() {
  const schemaPath = join(rootDir, 'supabase', 'schema.sql');
  
  if (!existsSync(schemaPath)) {
    console.error('❌ Fichier schema.sql non trouvé');
    return;
  }

  const schemaSQL = readFileSync(schemaPath, 'utf-8');
  
  console.log('📄 Contenu du schéma SQL:\n');
  console.log('─'.repeat(80));
  console.log(schemaSQL);
  console.log('─'.repeat(80));
  console.log('\n💡 Copiez ce contenu dans l\'éditeur SQL de Supabase\n');
}

// Exécution
const command = process.argv[2] || 'show';

if (command === 'execute') {
  executeSchema();
} else if (command === 'show') {
  showSchema();
} else {
  console.log('Usage: node scripts/execute-schema.js [show|execute]\n');
  console.log('  show     - Affiche le schéma SQL (par défaut)');
  console.log('  execute  - Tente d\'exécuter via API (nécessite SUPABASE_SERVICE_ROLE_KEY)\n');
  showSchema();
}
