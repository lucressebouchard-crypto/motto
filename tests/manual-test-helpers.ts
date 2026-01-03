/**
 * Helpers pour les tests manuels - à exécuter dans la console du navigateur
 */

export const testBadges = {
  // Teste le marquage comme lu
  async testMarkAsRead(chatId: string, userId: string) {
    console.log('🧪 TEST: Marquage comme lu');
    console.log('Chat ID:', chatId);
    console.log('User ID:', userId);
    
    // Importer le service depuis la console
    const { chatService } = await import('../services/chatService');
    
    // Obtenir le compteur avant
    const before = await chatService.getUnreadCount(chatId, userId);
    console.log('📊 Avant:', before);
    
    // Marquer comme lu
    await chatService.markMessagesAsRead(chatId, userId);
    
    // Attendre
    await new Promise(r => setTimeout(r, 500));
    
    // Obtenir le compteur après
    const after = await chatService.getUnreadCount(chatId, userId);
    console.log('📊 Après:', after);
    
    if (after === 0 && before > 0) {
      console.log('✅ TEST RÉUSSI: Badge devrait disparaître');
    } else {
      console.log('❌ TEST ÉCHOUÉ: Badge ne devrait pas disparaître');
    }
  },
  
  // Vérifie la table message_reads
  async checkMessageReadsTable() {
    console.log('🧪 TEST: Vérification de la table message_reads');
    
    const { supabase } = await import('../lib/supabase');
    
    const { data, error } = await supabase
      .from('message_reads')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Table message_reads n\'existe pas!', error);
      return false;
    }
    
    console.log('✅ Table message_reads existe');
    console.log('📊 Entrées trouvées:', data?.length || 0);
    return true;
  },
  
  // Vérifie tous les compteurs
  async checkAllUnreadCounts(userId: string) {
    console.log('🧪 TEST: Vérification de tous les compteurs');
    
    const { chatService } = await import('../services/chatService');
    
    const chats = await chatService.getByParticipant(userId);
    console.log(`📋 ${chats.length} chats trouvés`);
    
    for (const chat of chats) {
      const count = await chatService.getUnreadCount(chat.id, userId);
      console.log(`  Chat ${chat.id}: ${count} non lus`);
    }
  }
};

// Exposer dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).testBadges = testBadges;
  console.log('🧪 Helpers de test disponibles: window.testBadges');
}

