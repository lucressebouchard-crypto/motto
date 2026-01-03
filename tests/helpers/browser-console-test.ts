/**
 * Script à copier-coller dans la console du navigateur pour tester les badges
 * 
 * Instructions:
 * 1. Ouvrez votre application dans le navigateur
 * 2. Ouvrez la console (F12)
 * 3. Copiez-collez ce script
 * 4. Exécutez les fonctions de test
 */

// Fonction pour tester le système de badges
async function testBadgeSystem() {
  console.log('🧪 DÉBUT DES TESTS DE BADGES\n');
  
  // Vérifier que nous avons accès à l'app
  if (typeof window === 'undefined') {
    console.error('❌ Ce script doit être exécuté dans la console du navigateur');
    return;
  }
  
  // Attendre que l'app soit chargée
  await new Promise(r => setTimeout(r, 1000));
  
  // Fonction pour obtenir le service chatService
  // Note: Vous devrez peut-être adapter cela selon votre structure
  const getChatService = async () => {
    // Essayer d'accéder via window si exposé
    if ((window as any).__CHAT_SERVICE__) {
      return (window as any).__CHAT_SERVICE__;
    }
    
    // Sinon, utiliser fetch pour appeler directement l'API Supabase
    // (Cette partie nécessiterait d'exposer les services)
    return null;
  };
  
  console.log('📋 Instructions pour tester:');
  console.log('1. Ouvrez un chat avec des messages non lus');
  console.log('2. Notez le nombre sur le badge');
  console.log('3. Ouvrez le chat');
  console.log('4. Attendez 2 secondes');
  console.log('5. Retournez à la liste');
  console.log('6. Vérifiez que le badge a disparu\n');
  
  // Test automatique si possible
  try {
    // Vérifier la table message_reads
    console.log('🔍 Vérification de la table message_reads...');
    
    // Cette partie nécessiterait d'exposer supabase dans window
    if ((window as any).__SUPABASE__) {
      const supabase = (window as any).__SUPABASE__;
      const { data, error } = await supabase
        .from('message_reads')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Table message_reads n\'existe pas!', error);
        console.error('💡 Exécutez: npm run fix:message-reads');
      } else {
        console.log('✅ Table message_reads existe');
      }
    } else {
      console.log('⚠️ Supabase non exposé dans window.__SUPABASE__');
      console.log('💡 Vérifiez manuellement dans la console les logs [chatService]');
    }
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
  
  console.log('\n✅ Test terminé. Vérifiez les logs ci-dessus.');
}

// Exposer la fonction
(window as any).testBadgeSystem = testBadgeSystem;

console.log('🧪 Script de test chargé!');
console.log('💡 Exécutez: testBadgeSystem()');

