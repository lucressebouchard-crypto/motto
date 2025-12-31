/**
 * Script pour corriger la policy INSERT manquante sur la table users
 * et créer les profils pour les utilisateurs existants dans auth.users
 */

import { executeSQL } from './db-manager.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Lire le SQL de correction
const sqlPath = join(rootDir, 'supabase', 'fix-users-policy.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('🔧 Application du correctif pour la table users...\n');
console.log('SQL à exécuter:');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));
console.log();

try {
  const result = await executeSQL(sql);
  
  if (result.success) {
    console.log('✅ Correctif appliqué avec succès !\n');
    if (result.data) {
      console.log('Résultat:');
      console.log(JSON.stringify(result.data, null, 2));
    }
    console.log('\n✨ Vous pouvez maintenant créer des comptes et vous connecter.');
  } else if (result.requiresSetup) {
    console.log('\n⚠️  La fonction RPC exec_sql n\'a pas encore été créée.');
    console.log('💡 Pour la créer, exécutez: npm run supabase:setup-rpc\n');
  }
} catch (error) {
  console.error('❌ Erreur lors de l\'exécution:', error.message);
  if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('\n💡 Assurez-vous d\'avoir SUPABASE_SERVICE_ROLE_KEY dans votre .env.local');
  }
  process.exit(1);
}

