/**
 * Script pour créer et configurer la table message_reads automatiquement
 */

import { executeSQL } from './db-manager.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔧 Configuration automatique de la table message_reads\n');

const sqlFiles = [
  {
    name: 'Message Reads Table',
    file: 'supabase/setup-message-reads.sql',
  },
  {
    name: 'Unread Count Function',
    file: 'supabase/get-unread-count-function.sql',
  },
];

for (const { name, file } of sqlFiles) {
  console.log(`📋 Configuration: ${name}...`);
  
  const filePath = join(rootDir, file);
  
  if (!existsSync(filePath)) {
    console.log(`   ⚠️  Fichier non trouvé: ${file}\n`);
    continue;
  }
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    const result = await executeSQL(sql);
    
    if (result.success) {
      console.log(`   ✅ ${name} configuré avec succès !\n`);
    } else if (result.requiresSetup) {
      console.log('\n   ⚠️  La fonction RPC exec_sql n\'a pas encore été créée.');
      console.log('   💡 Exécutez d\'abord: npm run supabase:setup-rpc\n');
    } else {
      // Certaines erreurs peuvent être ignorées (déjà configuré)
      if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
        console.log(`   ℹ️  Déjà configuré (${name})\n`);
      } else {
        console.log(`   ⚠️  Erreur: ${result.error || 'Erreur inconnue'}\n`);
      }
    }
  } catch (error) {
    // Certaines erreurs peuvent être ignorées (déjà configuré)
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log(`   ℹ️  Déjà configuré (${name})\n`);
    } else {
      console.error(`   ❌ Erreur: ${error.message}\n`);
    }
  }
}

console.log('✅ Configuration terminée !\n');

