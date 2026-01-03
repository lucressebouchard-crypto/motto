import { supabase } from '../lib/supabase';
import { Chat, Message } from '../types';

export interface CreateChatData {
  participantIds: string[];
  listingId?: string;
}

export const chatService = {
  async create(data: CreateChatData): Promise<Chat> {
    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        participant_ids: data.participantIds,
        listing_id: data.listingId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return mapChatFromDB(chat);
  },

  async getById(id: string): Promise<Chat | null> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    // Fetch messages for this chat
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', id)
      .order('timestamp', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      ...mapChatFromDB(data),
      messages: (messages || []).map(mapMessageFromDB),
    };
  },

  async getByParticipant(userId: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const chats = (data || []).map(mapChatFromDB);

    // Fetch messages for each chat
    const chatsWithMessages = await Promise.all(
      chats.map(async (chat) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        return {
          ...chat,
          messages: (messages || []).map(mapMessageFromDB),
        };
      })
    );

    return chatsWithMessages;
  },

  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    // Retry logic pour les opérations critiques
    let lastError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            sender_id: senderId,
            text,
            timestamp: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          lastError = error;
          // Ne pas retry pour les erreurs de validation
          if (error.code === '23505' || error.code === '23503' || error.code === '23514') {
            throw error;
          }
          // Attendre avant de réessayer (backoff exponentiel)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
            continue;
          }
          throw error;
        }

        // Update chat updated_at (ne pas retry cette opération si elle échoue)
        try {
          await supabase
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId);
        } catch (updateError) {
          console.warn('Erreur lors de la mise à jour du chat (non bloquant):', updateError);
        }

        return mapMessageFromDB(message);
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Échec de l\'envoi du message après plusieurs tentatives');
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapMessageFromDB);
  },

  async getUnreadCount(chatId: string, userId: string): Promise<number> {
    // Compter uniquement les messages non lus (non envoyés par l'utilisateur et non marqués comme lus)
    try {
      // Récupérer tous les messages du chat envoyés par d'autres
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('sender_id', userId);

      if (messagesError) {
        console.error('❌ [chatService] Erreur lors de la récupération des messages:', messagesError);
        return 0;
      }

      if (!messages || messages.length === 0) {
        console.log(`📊 [chatService] Chat ${chatId}: 0 messages from others`);
        return 0;
      }

      // Vérifier si la table message_reads existe
      const { data: testRead, error: testError } = await supabase
        .from('message_reads')
        .select('id')
        .limit(1);

      if (testError) {
        // Si la table message_reads n'existe pas encore, compter tous les messages non envoyés
        console.warn('⚠️ [chatService] Table message_reads non disponible, utilisation du fallback');
        console.warn('💡 [chatService] Execute: npm run supabase:init to create the table');
        return messages.length;
      }

      // Récupérer les IDs des messages déjà lus
      const messageIds = messages.map(m => m.id);
      const { data: readMessages, error: readError } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', messageIds);

      if (readError) {
        console.error('❌ [chatService] Error fetching read messages:', readError);
        // Fallback: retourner tous les messages comme non lus
        return messages.length;
      }

      const readMessageIds = new Set((readMessages || []).map(m => m.message_id));
      const unreadCount = messages.filter(m => !readMessageIds.has(m.id)).length;

      console.log(`📊 [chatService] Chat ${chatId}: ${unreadCount} unread (${messages.length} total, ${readMessageIds.size} read)`);

      return unreadCount;
    } catch (error) {
      console.error('❌ [chatService] Exception lors du comptage des messages non lus:', error);
      // Fallback simple en cas d'erreur
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .neq('sender_id', userId);
        return count || 0;
      } catch {
        return 0;
      }
    }
  },

  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      console.log('📊 [chatService] Calculating total unread count for user:', userId);
      
      // Récupérer tous les chats de l'utilisateur
      const chats = await this.getByParticipant(userId);
      console.log('📋 [chatService] Found', chats.length, 'chats');
      
      let totalUnread = 0;
      
      // Pour chaque chat, compter les messages envoyés par les autres
      // Utiliser Promise.all pour paralléliser les requêtes
      const unreadCounts = await Promise.all(
        chats.map(chat => this.getUnreadCount(chat.id, userId))
      );
      
      totalUnread = unreadCounts.reduce((sum, count) => sum + count, 0);
      
      console.log('✅ [chatService] Total unread count:', totalUnread);
      return totalUnread;
    } catch (error) {
      console.error('❌ [chatService] Erreur lors du calcul du total de messages non lus:', error);
      return 0;
    }
  },

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      console.log('📖 [chatService] Marking messages as read for chat:', chatId, 'user:', userId);
      
      // D'abord, vérifier si la table message_reads existe
      const { data: testRead, error: testError } = await supabase
        .from('message_reads')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('❌ [chatService] Table message_reads does not exist!', testError);
        console.error('💡 [chatService] Execute: npm run supabase:init to create the table');
        return; // Sortir sans erreur pour ne pas bloquer
      }

      // Utiliser la fonction SQL si elle existe
      const { error: rpcError } = await supabase.rpc('mark_chat_messages_as_read', {
        chat_uuid: chatId,
        user_uuid: userId
      });

      if (rpcError) {
        console.log('⚠️ [chatService] RPC function not available, using direct insert. Error:', rpcError.message);
        
        // Récupérer tous les messages non lus du chat
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .neq('sender_id', userId);

        if (messagesError) {
          console.error('❌ [chatService] Error fetching messages:', messagesError);
          throw messagesError;
        }

        if (!messages || messages.length === 0) {
          console.log('ℹ️ [chatService] No unread messages to mark');
          return;
        }

        console.log(`📝 [chatService] Found ${messages.length} messages to mark as read`);

        // Insérer les entrées dans message_reads (ignorer les conflits)
        const readEntries = messages.map(msg => ({
          message_id: msg.id,
          user_id: userId,
        }));

        // Insérer par batch pour éviter les limites
        let totalInserted = 0;
        for (let i = 0; i < readEntries.length; i += 100) {
          const batch = readEntries.slice(i, i + 100);
          const { data: inserted, error: insertError } = await supabase
            .from('message_reads')
            .upsert(batch, { onConflict: 'message_id,user_id', ignoreDuplicates: true })
            .select();

          if (insertError) {
            console.error('❌ [chatService] Error marking messages as read:', insertError);
            console.error('❌ [chatService] Error details:', insertError.code, insertError.message);
            // Continuer avec les autres batches même en cas d'erreur
          } else {
            totalInserted += (inserted?.length || 0);
            console.log(`✅ [chatService] Batch ${i / 100 + 1} inserted: ${inserted?.length || 0} entries`);
          }
        }

        console.log(`✅ [chatService] Total messages marked as read: ${totalInserted} (${readEntries.length} attempted)`);
      } else {
        console.log('✅ [chatService] Messages marked as read via RPC');
      }
    } catch (error: any) {
      console.error('❌ [chatService] Exception marking messages as read:', error);
      console.error('❌ [chatService] Error details:', error?.code, error?.message);
      // Ne pas throw pour ne pas bloquer l'interface
    }
  },

  async findChatByListing(userId: string, listingId: string, sellerId: string): Promise<Chat | null> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('listing_id', listingId)
      .contains('participant_ids', [userId])
      .contains('participant_ids', [sellerId])
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la recherche du chat:', error);
      return null;
    }

    if (!data) return null;

    const chat = mapChatFromDB(data);
    const messages = await this.getMessages(chat.id);
    return { ...chat, messages };
  },

  subscribeToMessages(chatId: string, callback: (message: Message) => void) {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          try {
            callback(mapMessageFromDB(payload.new));
          } catch (error) {
            console.error('Erreur dans le callback de message:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonnement aux messages actif pour le chat:', chatId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur de canal pour les messages:', chatId);
        }
      });
    
    return channel;
  },

  subscribeToTyping(chatId: string, userId: string, callback: (isTyping: boolean, typingUserId: string) => void) {
    // Pour l'instant, on désactive l'indicateur de frappe car il nécessite une configuration présence
    // Dans une version future, on pourrait créer une table typing_indicators
    // ou utiliser le système de presence de Supabase avec la bonne configuration
    
    // Retourner un objet avec unsubscribe pour compatibilité
    return {
      unsubscribe: () => {},
      track: (data: any) => {},
    };
  },

  // S'abonner aux changements de compteurs de messages non lus (version améliorée)
  subscribeToUnreadCounts(userId: string, callback: (chatId: string, unreadCount: number) => void) {
    console.log('📊 [chatService] Subscribing to unread count changes for user:', userId);
    
    const channel = supabase
      .channel(`unread-counts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          try {
            const messageId = payload.new?.message_id;
            if (!messageId) return;

            // Récupérer le chat_id du message
            const { data: message, error } = await supabase
              .from('messages')
              .select('chat_id')
              .eq('id', messageId)
              .single();

            if (error || !message) {
              console.error('❌ [chatService] Error fetching message for unread count update:', error);
              return;
            }

            // Recalculer le compteur pour ce chat immédiatement
            const unreadCount = await this.getUnreadCount(message.chat_id, userId);
            console.log('🔄 [chatService] Message marked as read, updating count for chat:', message.chat_id, 'new count:', unreadCount);
            callback(message.chat_id, unreadCount);
          } catch (error) {
            console.error('❌ [chatService] Error in message_reads subscription callback:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          try {
            const message = payload.new as any;
            
            // Vérifier si ce message concerne un chat de l'utilisateur
            const { data: chat, error: chatError } = await supabase
              .from('chats')
              .select('participant_ids')
              .eq('id', message.chat_id)
              .single();

            if (chatError || !chat) {
              return;
            }

            // Si c'est un message reçu (pas envoyé par l'utilisateur)
            if (chat.participant_ids?.includes(userId) && message.sender_id !== userId) {
              // Recalculer le compteur pour ce chat
              const unreadCount = await this.getUnreadCount(message.chat_id, userId);
              console.log('🆕 [chatService] New message received, updating unread count for chat:', message.chat_id, 'count:', unreadCount);
              callback(message.chat_id, unreadCount);
            }
          } catch (error) {
            console.error('❌ [chatService] Error in new message subscription for unread count:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [chatService] Subscribed to unread count changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [chatService] Error subscribing to unread count changes');
        }
      });
    
    return channel;
  },
};

function mapChatFromDB(dbChat: any): Chat {
  return {
    id: dbChat.id,
    participants: dbChat.participant_ids || [],
    listingId: dbChat.listing_id,
    messages: [],
  };
}

function mapMessageFromDB(dbMessage: any): Message {
  return {
    id: dbMessage.id,
    senderId: dbMessage.sender_id,
    text: dbMessage.text,
    timestamp: new Date(dbMessage.timestamp).getTime(),
  };
}

