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

  // Subscribe to online status (simplified version - basic implementation)
  subscribeToOnlineStatus(userIds: string[], callback: (userId: string, isOnline: boolean) => void) {
    // For now, return a basic implementation
    // Full presence requires more complex setup in Supabase
    console.log('📡 [chatService] Online status subscription requested for:', userIds.length, 'users');
    
    // Return a mock subscription that tracks online status locally
    // In a production app, you'd use Supabase Presence or a dedicated presence service
    return {
      channel: null,
      setOnline: async () => {},
      unsubscribe: () => {},
    };
  },

  // Subscribe to unread count changes (improved version with immediate updates)
  subscribeToUnreadCounts(userId: string, callback: (chatId: string, unreadCount: number) => void) {
    console.log('📊 [chatService] Subscribing to unread counts for user:', userId);
    
    // Track unread counts locally for immediate updates
    const unreadCountsCache: Record<string, number> = {};
    
    const channel = supabase
      .channel(`unread-counts:${userId}`)
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
                // Update cache immediately for instant badge update
                const currentCount = unreadCountsCache[chatId] || 0;
                unreadCountsCache[chatId] = currentCount + 1;
                
                // Callback immediately with new count
                console.log('🆕 [chatService] New message detected, updating count immediately for chat:', chatId, 'old count:', currentCount, 'new count:', unreadCountsCache[chatId]);
                callback(chatId, unreadCountsCache[chatId]);
                
                // Then verify with actual count (async, non-blocking)
                this.getUnreadCount(chatId, userId).then(actualCount => {
                  console.log('✅ [chatService] Verified count for chat', chatId, 'actual:', actualCount, 'cached:', unreadCountsCache[chatId]);
                  if (actualCount !== unreadCountsCache[chatId]) {
                    unreadCountsCache[chatId] = actualCount;
                    callback(chatId, actualCount);
                  }
                }).catch((err) => {
                  console.error('❌ [chatService] Error verifying count:', err);
                });
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
              // Update cache optimistically
              const currentCount = unreadCountsCache[message.chat_id] || 0;
              if (currentCount > 0) {
                unreadCountsCache[message.chat_id] = currentCount - 1;
                callback(message.chat_id, unreadCountsCache[message.chat_id]);
              }
              
              // Verify with actual count
              const unreadCount = await this.getUnreadCount(message.chat_id, userId);
              unreadCountsCache[message.chat_id] = unreadCount;
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
          console.log('✅ [chatService] Successfully subscribed to unread count changes');
          // Initialize cache by loading current counts
          this.getByParticipant(userId).then(chats => {
            console.log('📋 [chatService] Initializing cache for', chats.length, 'chats');
            chats.forEach(chat => {
              this.getUnreadCount(chat.id, userId).then(count => {
                unreadCountsCache[chat.id] = count;
                console.log(`📊 [chatService] Cache initialized for chat ${chat.id}: ${count} unread`);
              });
            });
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [chatService] Channel error for unread counts');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ [chatService] Channel timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [chatService] Channel closed');
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
