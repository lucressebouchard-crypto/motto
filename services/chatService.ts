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
    // Compter uniquement les messages envoyés par les autres participants
    // Pour l'instant, on considère tous les messages non envoyés par l'utilisateur comme non lus
    // Dans une version future, on pourrait ajouter une table message_reads pour un suivi précis
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId);

      if (error) {
        console.error('❌ [chatService] Erreur lors du comptage des messages non lus:', error);
        return 0;
      }
      
      const unreadCount = count || 0;
      console.log(`📊 [chatService] Unread count for chat ${chatId}:`, unreadCount);
      return unreadCount;
    } catch (error) {
      console.error('❌ [chatService] Exception lors du comptage des messages non lus:', error);
      return 0;
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
    // Pour l'instant, on ne fait rien car on n'a pas de table message_reads
    // Cette fonction sera utile quand on implémentera le système de lecture
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

