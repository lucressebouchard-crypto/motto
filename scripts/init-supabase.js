/**
 * Script d'initialisation complète de Supabase
 * Exécute tout ce qui est nécessaire en une seule commande
 */

import { executeSQL } from './db-manager.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Initialisation complète de Supabase pour MƆ̆TTO\n');
console.log('═'.repeat(70));
console.log();

const steps = [
  {
    name: 'Fix Users Policy',
    description: 'Ajout de la policy INSERT manquante pour la table users',
    file: 'supabase/fix-users-policy.sql',
  },
  {
    name: 'Storage Configuration',
    description: 'Configuration du bucket et politiques pour les images',
    file: 'supabase/setup-storage.sql',
  },
  {
    name: 'Realtime Configuration',
    description: 'Activation du realtime pour messages, chats et notifications',
    file: 'supabase/setup-realtime.sql',
  },
  {
    name: 'Message Reads System',
    description: 'Configuration du système de badges de messages non lus',
    file: 'supabase/setup-message-reads.sql',
  },
  {
    name: 'Unread Count Function',
    description: 'Fonction SQL pour compter les messages non lus',
    file: 'supabase/get-unread-count-function.sql',
  },
  {
    name: 'User Presence System',
    description: 'Système de présence basé sur la dernière activité',
    file: 'supabase/setup-user-presence.sql',
  },
  {
    name: 'Expertises Table',
    description: 'Table et système pour les expertises véhicules',
    file: 'supabase/create-expertises-table.sql',
  },
  {
    name: 'Expertise Storage Buckets',
    description: 'Buckets de stockage pour médias et rapports PDF des expertises',
    file: 'supabase/setup-expertise-storage.sql',
  },
];

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  console.log(`📋 Étape ${i + 1}/${steps.length} : ${step.name}...`);
  console.log(`   ${step.description}`);
  
  const filePath = join(rootDir, step.file);
  
  if (!existsSync(filePath)) {
    console.log(`   ⚠️  Fichier non trouvé: ${step.file}\n`);
    errorCount++;
    continue;
  }
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    const result = await executeSQL(sql);
    
    if (result.success) {
      console.log(`   ✅ ${step.name} configuré avec succès !\n`);
      successCount++;
    } else if (result.requiresSetup) {
      console.log('\n   ⚠️  La fonction RPC exec_sql n\'a pas encore été créée.');
      console.log('   💡 Exécutez d\'abord: npm run supabase:setup-rpc\n');
      errorCount++;
    } else {
      // Certaines erreurs peuvent être ignorées (déjà configuré)
      if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
        console.log(`   ℹ️  Déjà configuré (${step.name})\n`);
        successCount++;
      } else {
        console.log(`   ⚠️  Erreur: ${result.error || 'Erreur inconnue'}\n`);
        errorCount++;
      }
    }
  } catch (error) {
    // Certaines erreurs peuvent être ignorées (déjà configuré)
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log(`   ℹ️  Déjà configuré (${step.name})\n`);
      successCount++;
    } else {
      console.error(`   ❌ Erreur: ${error.message}\n`);
      errorCount++;
    }
  }
}

console.log('═'.repeat(70));
console.log();
console.log('📊 Résumé:');
console.log(`   ✅ Succès: ${successCount}/${steps.length}`);
if (errorCount > 0) {
  console.log(`   ⚠️  Erreurs: ${errorCount}`);
}
console.log();

if (successCount === steps.length) {
  console.log('✨ Configuration complète terminée avec succès !');
  console.log();
  console.log('🎉 Votre application MƆ̆TTO est maintenant prête :');
  console.log('   ✅ Authentification fonctionnelle');
  console.log('   ✅ Upload d\'images dans les listings');
  console.log('   ✅ Chat en temps réel');
  console.log('   ✅ Notifications en temps réel');
  console.log('   ✅ Favoris synchronisés');
  console.log();
  console.log('💡 Vous pouvez maintenant utiliser toutes les fonctionnalités !');
} else {
  console.log('⚠️  Certaines configurations n\'ont pas pu être appliquées.');
  console.log('💡 Vérifiez les erreurs ci-dessus et réessayez si nécessaire.');
  console.log('💡 Assurez-vous d\'avoir SUPABASE_SERVICE_ROLE_KEY dans .env.local');
}

console.log();

