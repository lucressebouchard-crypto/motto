/**
 * Script pour exposer des outils de débogage dans la console du navigateur
 * À injecter dans index.tsx ou App.tsx en développement
 */

// Exposer de manière dynamique pour éviter les erreurs si les modules changent
if (typeof window !== 'undefined') {
  // Fonction pour charger les services de manière dynamique
  const loadServices = async () => {
    try {
      const { chatService } = await import('../services/chatService');
      const { supabase } = await import('../lib/supabase');
      return { chatService, supabase };
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      return null;
    }
  };

  // Outils de test disponibles dans la console
  (window as any).__TEST_TOOLS__ = {
    // Tester le marquage comme lu
    async testMarkAsRead(chatId: string, userId: string) {
      console.log('🧪 TEST: Marquage comme lu');
      console.log('Chat ID:', chatId);
      console.log('User ID:', userId);
      
      const services = await loadServices();
      if (!services) {
        console.error('❌ Impossible de charger les services');
        return;
      }
      
      const { chatService } = services;
      
      const before = await chatService.getUnreadCount(chatId, userId);
      console.log('📊 Avant:', before);
      
      await chatService.markMessagesAsRead(chatId, userId);
      await new Promise(r => setTimeout(r, 500));
      
      const after = await chatService.getUnreadCount(chatId, userId);
      console.log('📊 Après:', after);
      
      if (after === 0 && before > 0) {
        console.log('✅ TEST RÉUSSI: Badge devrait disparaître');
      } else {
        console.log('❌ TEST ÉCHOUÉ: Badge devrait disparaître mais ne l\'a pas fait');
        console.log('   Avant:', before, 'Après:', after);
      }
    },
    
    // Vérifier la table message_reads
    async checkTable() {
      console.log('🔍 Vérification de la table message_reads...');
      const services = await loadServices();
      if (!services) {
        console.error('❌ Impossible de charger les services');
        return false;
      }
      
      const { supabase } = services;
      const { data, error } = await supabase
        .from('message_reads')
        .select('*')
        .limit(5);
      
      if (error) {
        console.error('❌ Table n\'existe pas!', error);
        console.error('💡 Exécutez: npm run fix:message-reads');
        return false;
      }
      
      console.log('✅ Table existe,', data?.length || 0, 'entrées trouvées');
      return true;
    },
    
    // Vérifier tous les compteurs
    async checkAllCounts(userId: string) {
      console.log('📊 Vérification de tous les compteurs pour user:', userId);
      const services = await loadServices();
      if (!services) {
        console.error('❌ Impossible de charger les services');
        return;
      }
      
      const { chatService } = services;
      const chats = await chatService.getByParticipant(userId);
      console.log(`📋 ${chats.length} chats trouvés\n`);
      
      let total = 0;
      for (const chat of chats) {
        const count = await chatService.getUnreadCount(chat.id, userId);
        total += count;
        console.log(`  Chat ${chat.id.substring(0, 8)}...: ${count} non lus`);
      }
      console.log(`\n📊 Total: ${total} messages non lus`);
    },
    
    // Obtenir les services
    async getServices() {
      return await loadServices();
    }
  };
  
  console.log('🔧 Outils de débogage disponibles dans la console:');
  console.log('  📋 window.__TEST_TOOLS__.checkTable() - Vérifier si la table existe');
  console.log('  📋 window.__TEST_TOOLS__.testMarkAsRead(chatId, userId) - Tester le marquage');
  console.log('  📋 window.__TEST_TOOLS__.checkAllCounts(userId) - Vérifier tous les compteurs');
  console.log('  📋 window.__TEST_TOOLS__.getServices() - Obtenir les services');
}

