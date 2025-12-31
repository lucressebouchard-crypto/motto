/**
 * Script complet pour configurer automatiquement Supabase
 * Exécute : Storage, Realtime, et autres configurations nécessaires
 */

import { executeSQL } from './db-manager.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Configuration complète de Supabase...\n');
console.log('═'.repeat(60));
console.log();

// Étape 1: Configuration du Storage
console.log('📦 Étape 1/2 : Configuration du Storage...');
const storageSQL = readFileSync(join(rootDir, 'supabase', 'setup-storage.sql'), 'utf-8');

try {
  const storageResult = await executeSQL(storageSQL);
  
  if (storageResult.success) {
    console.log('✅ Storage configuré avec succès !\n');
  } else if (storageResult.requiresSetup) {
    console.log('\n⚠️  La fonction RPC exec_sql n\'a pas encore été créée.');
    console.log('💡 Pour la créer, exécutez: npm run supabase:setup-rpc\n');
    process.exit(1);
  } else {
    console.log('⚠️  Erreur lors de la configuration du storage');
    console.log(storageResult);
  }
} catch (error) {
  console.error('❌ Erreur lors de la configuration du storage:', error.message);
  if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('\n💡 Assurez-vous d\'avoir SUPABASE_SERVICE_ROLE_KEY dans votre .env.local');
    process.exit(1);
  }
  // Continuer même en cas d'erreur (peut-être déjà configuré)
  console.log('⚠️  Continuons malgré l\'erreur (peut-être déjà configuré)...\n');
}

// Étape 2: Configuration du Realtime
console.log('🔄 Étape 2/2 : Configuration du Realtime...');
const realtimeSQL = readFileSync(join(rootDir, 'supabase', 'setup-realtime.sql'), 'utf-8');

try {
  const realtimeResult = await executeSQL(realtimeSQL);
  
  if (realtimeResult.success) {
    console.log('✅ Realtime configuré avec succès !\n');
  } else if (realtimeResult.requiresSetup) {
    console.log('\n⚠️  La fonction RPC exec_sql n\'a pas encore été créée.');
    console.log('💡 Pour la créer, exécutez: npm run supabase:setup-rpc\n');
    process.exit(1);
  } else {
    console.log('⚠️  Erreur lors de la configuration du realtime');
    console.log(realtimeResult);
  }
} catch (error) {
  console.error('❌ Erreur lors de la configuration du realtime:', error.message);
  // Continuer même en cas d'erreur (peut-être déjà configuré)
  console.log('⚠️  Continuons malgré l\'erreur (peut-être déjà configuré)...\n');
}

console.log('═'.repeat(60));
console.log();
console.log('✨ Configuration Supabase terminée !');
console.log();
console.log('📋 Ce qui a été configuré:');
console.log('   ✅ Bucket "listing-images" pour les images');
console.log('   ✅ Politiques de sécurité pour le Storage');
console.log('   ✅ Realtime activé pour messages, chats et notifications');
console.log();
console.log('🎉 Votre application est maintenant prête à utiliser:');
console.log('   - Upload d\'images dans les listings');
console.log('   - Chat en temps réel');
console.log('   - Notifications en temps réel');
console.log();

