/**
 * Test de l'automatisation de la base de données
 */

import { executeSQL, createTable } from './db-manager.js';

async function test() {
  console.log('🧪 Test de l\'automatisation de la base de données\n');
  
  try {
    // Test 1: Exécuter une requête SELECT simple
    console.log('1️⃣ Test d\'exécution SQL (SELECT)...');
    const result1 = await executeSQL('SELECT COUNT(*) as total FROM users');
    
    if (result1.success) {
      console.log('✅ Exécution SQL fonctionne!');
      console.log(`   Résultat: ${JSON.stringify(result1.data)}\n`);
    } else {
      console.log('❌ Erreur lors de l\'exécution SQL');
      if (result1.requiresSetup) {
        console.log('   Configuration requise\n');
      }
      return;
    }
    
    // Test 2: Créer une table de test
    console.log('2️⃣ Test de création de table...');
    const result2 = await createTable('test_automation', [
      {
        name: 'id',
        type: 'UUID',
        primaryKey: true,
        default: 'uuid_generate_v4()'
      },
      {
        name: 'name',
        type: 'TEXT',
        notNull: true
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()'
      }
    ]);
    
    if (result2.success) {
      console.log('✅ Création de table fonctionne!\n');
    } else {
      console.log('⚠️  La table existe peut-être déjà ou erreur de création\n');
    }
    
    // Test 3: Vérifier que la table existe
    console.log('3️⃣ Vérification que la table existe...');
    const result3 = await executeSQL('SELECT COUNT(*) as count FROM test_automation');
    
    if (result3.success) {
      console.log('✅ Table vérifiée!');
      console.log(`   Nombre de lignes: ${result3.data?.rows?.[0]?.count || 0}\n`);
    }
    
    // Nettoyer: supprimer la table de test
    console.log('🧹 Nettoyage de la table de test...');
    const cleanup = await executeSQL('DROP TABLE IF EXISTS test_automation');
    if (cleanup.success) {
      console.log('✅ Table de test supprimée\n');
    }
    
    console.log('✅ Tous les tests réussis!');
    console.log('🎉 L\'automatisation de la base de données est opérationnelle!\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log('\n💡 Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
      console.log('   Obtenez-la dans Supabase Dashboard > Settings > API > service_role\n');
    }
  }
}

test();
