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
        updated_at: new Date().toISOString(),
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

    // Get last message for sorting
    const lastMessage = messages && messages.length > 0 
      ? mapMessageFromDB(messages[messages.length - 1])
      : undefined;

    return {
      ...mapChatFromDB(data),
      messages: (messages || []).map(mapMessageFromDB),
      lastMessage,
      lastMessageAt: lastMessage?.timestamp,
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

    // Fetch last message for each chat and calculate unread counts in parallel
    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        // Get last message
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        const lastMessage = messages && messages.length > 0 
          ? mapMessageFromDB(messages[0])
          : undefined;

        return {
          ...chat,
          lastMessage,
          lastMessageAt: lastMessage?.timestamp || new Date(chat.createdAt || Date.now()).getTime(),
        };
      })
    );

    // Sort by lastMessageAt (most recent first)
    return chatsWithDetails.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  },

  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const timestamp = new Date().toISOString();
    
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
            timestamp,
          })
          .select()
          .single();

        if (error) {
          lastError = error;
          if (error.code === '23505' || error.code === '23503' || error.code === '23514') {
            throw error;
          }
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
            continue;
          }
          throw error;
        }

        // Update chat updated_at to ensure proper sorting
        await supabase
          .from('chats')
          .update({ updated_at: timestamp })
          .eq('id', chatId);

        // IMPORTANT: Mettre à jour l'activité de l'utilisateur pour le statut en ligne
        // Le trigger SQL devrait le faire automatiquement, mais on le fait aussi explicitement
        try {
          await supabase
            .from('users')
            .update({ updated_at: timestamp })
            .eq('id', senderId);
        } catch (activityError) {
          // Non bloquant si ça échoue
          console.warn('Could not update user activity:', activityError);
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
    try {
      // Get all messages in chat not sent by user
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('sender_id', userId);

      if (messagesError) {
        console.error('❌ [chatService] Error fetching messages:', messagesError);
        return 0;
      }

      if (!messages || messages.length === 0) {
        return 0;
      }

      // Check if message_reads table exists
      const { error: testError } = await supabase
        .from('message_reads')
        .select('id')
        .limit(1);

      if (testError) {
        // Fallback: return all messages as unread
        return messages.length;
      }

      // Get read message IDs
      const messageIds = messages.map(m => m.id);
      const { data: readMessages, error: readError } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', messageIds);

      if (readError) {
        console.error('❌ [chatService] Error fetching read messages:', readError);
        return messages.length;
      }

      const readMessageIds = new Set((readMessages || []).map(m => m.message_id));
      const unreadCount = messages.filter(m => !readMessageIds.has(m.id)).length;

      return unreadCount;
    } catch (error) {
      console.error('❌ [chatService] Exception counting unread:', error);
      return 0;
    }
  },

  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const chats = await this.getByParticipant(userId);
      const unreadCounts = await Promise.all(
        chats.map(chat => this.getUnreadCount(chat.id, userId))
      );
      return unreadCounts.reduce((sum, count) => sum + count, 0);
    } catch (error) {
      console.error('❌ [chatService] Error calculating total unread:', error);
      return 0;
    }
  },

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      // Check if message_reads table exists
      const { error: testError } = await supabase
        .from('message_reads')
        .select('id')
        .limit(1);

      if (testError) {
        console.warn('⚠️ [chatService] message_reads table not available');
        return;
      }

      // Try RPC function first
      const { error: rpcError } = await supabase.rpc('mark_chat_messages_as_read', {
        chat_uuid: chatId,
        user_uuid: userId
      });

      if (rpcError) {
        // Fallback: direct insert
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .neq('sender_id', userId);

        if (messagesError || !messages || messages.length === 0) {
          return;
        }

        const readEntries = messages.map(msg => ({
          message_id: msg.id,
          user_id: userId,
        }));

        // Insert in batches
        for (let i = 0; i < readEntries.length; i += 100) {
          const batch = readEntries.slice(i, i + 100);
          await supabase
            .from('message_reads')
            .upsert(batch, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
        }
      }
    } catch (error) {
      console.error('❌ [chatService] Error marking as read:', error);
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

    if (error || !data) return null;

    const chat = mapChatFromDB(data);
    const messages = await this.getMessages(chat.id);
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
    
    return { 
      ...chat, 
      messages,
      lastMessage,
      lastMessageAt: lastMessage?.timestamp,
    };
  },

  // Subscribe to new messages in a specific chat
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
            const message = mapMessageFromDB(payload.new);
            callback(message);
          } catch (error) {
            console.error('❌ [chatService] Error in message callback:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [chatService] Subscribed to messages for chat:', chatId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [chatService] Channel error for chat:', chatId);
        }
      });
    
    return channel;
  },

  // Subscribe to all messages for a user (for real-time updates across all chats)
  subscribeToAllUserMessages(userId: string, callback: (message: Message, chatId: string) => void) {
    const channel = supabase
      .channel(`all-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          try {
            const message = mapMessageFromDB(payload.new);
            const chatId = payload.new.chat_id;
            
            // Check if user is participant in this chat
            const { data: chat } = await supabase
              .from('chats')
              .select('participant_ids')
              .eq('id', chatId)
              .single();
            
            if (chat && chat.participant_ids?.includes(userId)) {
              callback(message, chatId);
            }
          } catch (error) {
            console.error('❌ [chatService] Error in all messages callback:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [chatService] Subscribed to all messages for user:', userId);
        }
      });
    
    return channel;
  },

  // Subscribe to typing indicators
  subscribeToTyping(chatId: string, userId: string, onTypingChange: (typingUserId: string, isTyping: boolean) => void) {
    const channel = supabase
      .channel(`typing:${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState();
          const typingUsers: Record<string, any> = {};
          
          Object.values(state).forEach((presences: any) => {
            if (Array.isArray(presences)) {
              presences.forEach((presence: any) => {
                if (presence?.userId && presence.userId !== userId && presence.typing) {
                  typingUsers[presence.userId] = presence;
                }
              });
            }
          });
          
          Object.keys(typingUsers).forEach(typingUserId => {
            onTypingChange(typingUserId, true);
          });
        } catch (error) {
          console.error('Error in presence sync:', error);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }: any) => {
        try {
          if (Array.isArray(newPresences)) {
            newPresences.forEach((presence: any) => {
              if (presence?.userId && presence.userId !== userId && presence.typing) {
                onTypingChange(presence.userId, true);
              }
            });
          }
        } catch (error) {
          console.error('Error in presence join:', error);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
        try {
          if (Array.isArray(leftPresences)) {
            leftPresences.forEach((presence: any) => {
              if (presence?.userId && presence.userId !== userId) {
                onTypingChange(presence.userId, false);
              }
            });
          }
        } catch (error) {
          console.error('Error in presence leave:', error);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              userId,
              typing: false,
              online: true,
            });
            console.log('✅ [chatService] Typing subscription active for chat:', chatId);
          } catch (error) {
            console.error('Error tracking presence:', error);
          }
        }
      });
    
    return {
      channel,
      setTyping: async (isTyping: boolean) => {
        try {
          await channel.track({
            userId,
            typing: isTyping,
            online: true,
          });
        } catch (error) {
          console.error('Error setting typing:', error);
        }
      },
      unsubscribe: () => {
        channel.unsubscribe();
      },
    };
  },

  // Subscribe to typing indicators for multiple chats (for chat list)
  subscribeToAllChatsTyping(chatIds: string[], userId: string, onTypingChange: (chatId: string, typingUserId: string, isTyping: boolean) => void) {
    console.log('📝 [chatService] Subscribing to typing for', chatIds.length, 'chats:', chatIds);
    
    const subscriptions: Array<{ chatId: string; subscription: any }> = [];
    
    chatIds.forEach(chatId => {
      const subscription = this.subscribeToTyping(chatId, userId, (typingUserId, isTyping) => {
        console.log('📝 [chatService] Typing event from subscribeToAllChatsTyping:', chatId, typingUserId, isTyping);
        onTypingChange(chatId, typingUserId, isTyping);
      });
      subscriptions.push({ chatId, subscription });
    });
    
    return {
      subscriptions,
      unsubscribe: () => {
        console.log('📝 [chatService] Unsubscribing from all chats typing');
        subscriptions.forEach(({ chatId, subscription }) => {
          if (subscription?.unsubscribe) {
            subscription.unsubscribe();
          }
        });
      },
    };
  },

  // Get user online status based on last activity (updated_at from users table)
  async getUserOnlineStatus(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('updated_at')
        .eq('id', userId)
        .single();
      
      if (error || !user || !user.updated_at) {
        console.log('⚠️ [chatService] Could not get user activity for:', userId, error);
        return false;
      }
      
      // Un utilisateur est considéré en ligne s'il a été actif dans les 5 dernières minutes
      const lastActivity = new Date(user.updated_at).getTime();
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const isOnline = lastActivity > fiveMinutesAgo;
      
      console.log(`📊 [chatService] User ${userId} activity check:`, {
        lastActivity: new Date(lastActivity).toISOString(),
        now: new Date(now).toISOString(),
        fiveMinutesAgo: new Date(fiveMinutesAgo).toISOString(),
        isOnline,
      });
      
      return isOnline;
    } catch (error) {
      console.error('❌ [chatService] Error checking user online status:', error);
      return false;
    }
  },

  // Get online status for multiple users
  async getUsersOnlineStatus(userIds: string[]): Promise<Record<string, boolean>> {
    if (userIds.length === 0) {
      console.log('⚠️ [chatService] No user IDs provided for online status check');
      return {};
    }
    
    try {
      console.log('📊 [chatService] Checking online status for', userIds.length, 'users');
      const { data: users, error } = await supabase
        .from('users')
        .select('id, updated_at')
        .in('id', userIds);
      
      if (error) {
        console.error('❌ [chatService] Error fetching users for online status:', error);
        return {};
      }
      
      if (!users || users.length === 0) {
        console.log('⚠️ [chatService] No users found for online status check');
        return {};
      }
      
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      const statusMap: Record<string, boolean> = {};
      users.forEach(user => {
        if (!user.updated_at) {
          statusMap[user.id] = false;
          return;
        }
        const lastActivity = new Date(user.updated_at).getTime();
        const isOnline = lastActivity > fiveMinutesAgo;
        statusMap[user.id] = isOnline;
        console.log(`📊 [chatService] User ${user.id}: ${isOnline ? 'ONLINE' : 'OFFLINE'} (last activity: ${new Date(lastActivity).toISOString()})`);
      });
      
      const onlineCount = Object.values(statusMap).filter(Boolean).length;
      console.log(`✅ [chatService] Online status check complete: ${onlineCount}/${userIds.length} users online`);
      
      return statusMap;
    } catch (error) {
      console.error('❌ [chatService] Error checking users online status:', error);
      return {};
    }
  },

  // Subscribe to online status changes (monitor user updated_at changes)
  subscribeToOnlineStatus(userIds: string[], callback: (userId: string, isOnline: boolean) => void) {
    if (userIds.length === 0) {
      return {
        channel: null,
        unsubscribe: () => {},
      };
    }
    
    console.log('📡 [chatService] Subscribing to online status for:', userIds.length, 'users');
    
    const channel = supabase
      .channel(`online-status:${userIds.join(',')}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=in.(${userIds.join(',')})`,
        },
        async (payload) => {
          try {
            const user = payload.new as any;
            if (user && user.updated_at) {
              const lastActivity = new Date(user.updated_at).getTime();
              const now = Date.now();
              const fiveMinutesAgo = now - (5 * 60 * 1000);
              const isOnline = lastActivity > fiveMinutesAgo;
              
              callback(user.id, isOnline);
            }
          } catch (error) {
            console.error('Error in online status callback:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [chatService] Subscribed to online status changes');
        }
      });
    
    return {
      channel,
      unsubscribe: () => {
        channel.unsubscribe();
      },
    };
  },

  // Subscribe to unread count changes (improved version with immediate updates)
  subscribeToUnreadCounts(userId: string, callback: (chatId: string, unreadCount: number) => void) {
    console.log('📊 [chatService] Subscribing to unread counts for user:', userId);
    
    const channel = supabase
      .channel(`unread-counts:${userId}-${Date.now()}`)
      // Listen for new messages - CRITICAL: This must fire immediately
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          try {
            console.log('📨 [chatService] Realtime event received - INSERT in messages table:', payload.new?.id);
            const message = payload.new as any;
            const chatId = message.chat_id;
            
            console.log('🔍 [chatService] Processing message for chat:', chatId, 'sender:', message.sender_id, 'userId:', userId);
            
            // Check if user is participant
            const { data: chat } = await supabase
              .from('chats')
              .select('participant_ids')
              .eq('id', chatId)
              .single();
            
            if (chat && chat.participant_ids?.includes(userId)) {
              console.log('✅ [chatService] User is participant in chat');
              // Only count if message is not from user
              if (message.sender_id !== userId) {
                // Get actual count immediately and callback
                const actualCount = await this.getUnreadCount(chatId, userId);
                console.log('🆕 [chatService] New message detected, actual unread count for chat:', chatId, 'is:', actualCount);
                callback(chatId, actualCount);
              } else {
                console.log('ℹ️ [chatService] Message from self, ignoring');
              }
            } else {
              console.log('ℹ️ [chatService] User is not participant in this chat, ignoring');
            }
          } catch (error) {
            console.error('❌ [chatService] Error in message insert callback:', error);
          }
        }
      )
      // Listen for message reads
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

            const { data: message } = await supabase
              .from('messages')
              .select('chat_id')
              .eq('id', messageId)
              .single();

            if (message) {
              // Get actual count immediately
              const unreadCount = await this.getUnreadCount(message.chat_id, userId);
              console.log('📖 [chatService] Message read, updating count for chat:', message.chat_id, 'new count:', unreadCount);
              callback(message.chat_id, unreadCount);
            }
          } catch (error) {
            console.error('❌ [chatService] Error in read callback:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [chatService] Subscription status changed:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [chatService] Successfully subscribed to unread count changes - Realtime is ACTIVE');
          console.log('🎯 [chatService] Ready to receive real-time message updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [chatService] Channel error for unread counts - Realtime NOT working');
          console.error('💡 [chatService] Check Supabase Realtime configuration');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ [chatService] Channel timed out - Realtime connection failed');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [chatService] Channel closed');
        } else {
          console.log('ℹ️ [chatService] Subscription status:', status);
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
    createdAt: dbChat.created_at ? new Date(dbChat.created_at).getTime() : Date.now(),
  };
}

function mapMessageFromDB(dbMessage: any): Message {
  return {
    id: dbMessage.id,
    chatId: dbMessage.chat_id,
    senderId: dbMessage.sender_id,
    text: dbMessage.text,
    timestamp: new Date(dbMessage.timestamp).getTime(),
  };
}
