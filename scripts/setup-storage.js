/**
 * Script pour configurer Supabase Storage pour les images
 */

import { executeSQL } from './db-manager.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Lire le SQL de configuration du storage
const sqlPath = join(rootDir, 'supabase', 'setup-storage.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('📦 Configuration de Supabase Storage pour les images...\n');
console.log('SQL à exécuter:');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));
console.log();

try {
  const result = await executeSQL(sql);
  
  if (result.success) {
    console.log('✅ Storage configuré avec succès !\n');
    console.log('📋 Ce qui a été configuré:');
    console.log('   - Bucket "listing-images" créé (public)');
    console.log('   - Politique d\'upload pour utilisateurs authentifiés');
    console.log('   - Politique de lecture publique');
    console.log('   - Politique de suppression pour les propriétaires\n');
    console.log('✨ Vous pouvez maintenant uploader des images dans vos listings !');
  } else if (result.requiresSetup) {
    console.log('\n⚠️  La fonction RPC exec_sql n\'a pas encore été créée.');
    console.log('💡 Pour la créer, exécutez: npm run supabase:setup-rpc\n');
  }
} catch (error) {
  console.error('❌ Erreur lors de la configuration:', error.message);
  if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('\n💡 Assurez-vous d\'avoir SUPABASE_SERVICE_ROLE_KEY dans votre .env.local');
  }
  process.exit(1);
}

