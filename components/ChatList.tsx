import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, Search, MoreVertical, Send, Loader2, ArrowRight, Package } from 'lucide-react';
import { Chat, Message, User, Listing } from '../types';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { listingService } from '../services/listingService';
import { useAppCache } from '../contexts/AppCache';

interface ChatListProps {
  onClose: () => void;
  currentUser: User | null;
  selectedChatId?: string | null;
  onChatSelected?: (chatId: string | null) => void;
  onSelectListing?: (listing: Listing) => void;
  onUnreadCountChange?: (count: number) => void;
}

const ChatList: React.FC<ChatListProps> = ({ 
  onClose, 
  currentUser, 
  selectedChatId, 
  onChatSelected, 
  onSelectListing, 
  onUnreadCountChange 
}) => {
  const { getChats, setChats: setCacheChats, getUser, setUser } = useAppCache();
  
  // States
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatParticipants, setChatParticipants] = useState<Record<string, User>>({});
  const [chatListings, setChatListings] = useState<Record<string, Listing>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // chatId -> userId
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const listingCardRef = useRef<HTMLDivElement>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const allMessagesSubscriptionRef = useRef<any>(null);
  const typingSubscriptionRef = useRef<any>(null);
  const onlineSubscriptionRef = useRef<any>(null);
  const unreadCountSubscriptionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendLockRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  // Format date separator
  const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = messageDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    if (diffDays > -7) return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Handle select chat
  const handleSelectChat = useCallback((chat: Chat | null) => {
    setSelectedChat(chat);
    if (onChatSelected) {
      onChatSelected(chat?.id || null);
    }
  }, [onChatSelected]);

  // Load chats and participants
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      return;
    }

    const loadChats = async () => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      
      setLoading(true);
      try {
        // Load chats
        let userChats = await chatService.getByParticipant(currentUser.id);
        
        // Sort by lastMessageAt (most recent first)
        userChats = userChats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
        
        setChats(userChats);
        setCacheChats(userChats);

        // Load participants and listings in parallel
        const participantsMap: Record<string, User> = {};
        const listingsMap: Record<string, Listing> = {};
        const unreadMap: Record<string, number> = {};
        
        const promises: Promise<void>[] = [];

        for (const chat of userChats) {
          // Load participants
          for (const participantId of chat.participants) {
            if (participantId !== currentUser.id && !participantsMap[participantId]) {
              const cachedUser = getUser(participantId);
              if (cachedUser) {
                participantsMap[participantId] = cachedUser;
              } else {
                promises.push(
                  userService.getById(participantId).then(user => {
                    if (user) {
                      participantsMap[participantId] = user;
                      setUser(participantId, user);
                    }
                  }).catch(() => {})
                );
              }
            }
          }

          // Load listing
          if (chat.listingId && !listingsMap[chat.id]) {
            promises.push(
              listingService.getById(chat.listingId).then(listing => {
                if (listing) {
                  listingsMap[chat.id] = listing;
                }
              }).catch(() => {})
            );
          }

          // Load unread count
          promises.push(
            chatService.getUnreadCount(chat.id, currentUser.id).then(count => {
              unreadMap[chat.id] = count;
            }).catch(() => {})
          );
        }

        await Promise.all(promises);

        setChatParticipants(prev => ({ ...prev, ...participantsMap }));
        setChatListings(prev => ({ ...prev, ...listingsMap }));
        setUnreadCounts(unreadMap);
        
        const total = Object.values(unreadMap).reduce((sum, count) => sum + count, 0);
        setTotalUnreadCount(total);
        if (onUnreadCountChange) {
          onUnreadCountChange(total);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [currentUser?.id, getChats, setCacheChats, getUser, setUser, onUnreadCountChange]);

  // Subscribe to all user messages for real-time updates
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to unread count changes
    unreadCountSubscriptionRef.current = chatService.subscribeToUnreadCounts(
      currentUser.id,
      (chatId, unreadCount) => {
        setUnreadCounts(prev => {
          const updated = { ...prev, [chatId]: unreadCount };
          const total = Object.values(updated).reduce((sum, count) => sum + count, 0);
          setTotalUnreadCount(total);
          if (onUnreadCountChange) {
            onUnreadCountChange(total);
          }
          return updated;
        });
      }
    );

    // Subscribe to all messages for real-time chat list updates
    allMessagesSubscriptionRef.current = chatService.subscribeToAllUserMessages(
      currentUser.id,
      async (message, chatId) => {
        // Update chat list: move chat to top and update last message
        setChats(prev => {
          const chatIndex = prev.findIndex(c => c.id === chatId);
          if (chatIndex === -1) {
            // Chat not in list, might be new - reload
            chatService.getByParticipant(currentUser.id).then(newChats => {
              setChats(newChats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0)));
            });
            return prev;
          }
          
          const updatedChats = [...prev];
          const chat = updatedChats[chatIndex];
          
          // Update chat with new last message
          const updatedChat = {
            ...chat,
            lastMessage: message,
            lastMessageAt: message.timestamp,
          };
          
          // Remove from current position
          updatedChats.splice(chatIndex, 1);
          // Add to beginning
          updatedChats.unshift(updatedChat);
          
          // Sort by lastMessageAt (most recent first)
          return updatedChats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
        });

        // If this is the selected chat, add message
        if (selectedChat?.id === chatId) {
          setSelectedChat(prev => {
            if (!prev) return prev;
            const exists = prev.messages.some(m => m.id === message.id);
            if (exists) return prev;
            return {
              ...prev,
              messages: [...prev.messages, message].sort((a, b) => a.timestamp - b.timestamp),
              lastMessage: message,
              lastMessageAt: message.timestamp,
            };
          });
          
          // Mark as read if chat is open and message is not from user
          if (message.senderId !== currentUser.id) {
            chatService.markMessagesAsRead(chatId, currentUser.id).then(async () => {
              const newCount = await chatService.getUnreadCount(chatId, currentUser.id);
              setUnreadCounts(prev => {
                const updated = { ...prev, [chatId]: newCount };
                const total = Object.values(updated).reduce((sum, count) => sum + count, 0);
                setTotalUnreadCount(total);
                if (onUnreadCountChange) {
                  onUnreadCountChange(total);
                }
                return updated;
              });
            });
          }
          
          scrollToBottom();
        }
      }
    );

    return () => {
      if (unreadCountSubscriptionRef.current) {
        unreadCountSubscriptionRef.current.unsubscribe();
      }
      if (allMessagesSubscriptionRef.current) {
        allMessagesSubscriptionRef.current.unsubscribe();
      }
    };
  }, [currentUser?.id, selectedChat?.id, scrollToBottom, onUnreadCountChange]);

  // Subscribe to online status for participants
  useEffect(() => {
    if (!currentUser || chats.length === 0) return;

    const participantIds = new Set<string>();
    chats.forEach(chat => {
      chat.participants.forEach(id => {
        if (id !== currentUser.id) {
          participantIds.add(id);
        }
      });
    });

    if (participantIds.size === 0) {
      setOnlineUsers(new Set());
      return;
    }

    // Charger le statut en ligne initial
    const loadOnlineStatus = async () => {
      try {
        const statusMap = await chatService.getUsersOnlineStatus(Array.from(participantIds));
        const onlineSet = new Set<string>();
        Object.entries(statusMap).forEach(([userId, isOnline]) => {
          if (isOnline) {
            onlineSet.add(userId);
          }
        });
        setOnlineUsers(onlineSet);
      } catch (error) {
        console.error('Error loading online status:', error);
        // En cas d'erreur, marquer tous comme hors ligne
        setOnlineUsers(new Set());
      }
    };

    loadOnlineStatus();

    // S'abonner aux changements de statut
    const onlineSubscription = chatService.subscribeToOnlineStatus(
      Array.from(participantIds),
      (userId, isOnline) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          if (isOnline) {
            updated.add(userId);
          } else {
            updated.delete(userId);
          }
          return updated;
        });
      }
    );

    // Rafraîchir le statut plus fréquemment (toutes les 15 secondes) pour plus de précision
    const refreshInterval = setInterval(() => {
      loadOnlineStatus();
    }, 15000);

    return () => {
      if (onlineSubscription?.unsubscribe) {
        onlineSubscription.unsubscribe();
      }
      clearInterval(refreshInterval);
    };
  }, [currentUser?.id, chats]);

  // Open specific chat if selectedChatId is set
  useEffect(() => {
    if (selectedChatId && currentUser && chats.length > 0) {
      const chatToOpen = chats.find(c => c.id === selectedChatId);
      if (chatToOpen && (!selectedChat || selectedChat.id !== selectedChatId)) {
        handleSelectChat(chatToOpen);
      }
    }
  }, [selectedChatId, chats, selectedChat, handleSelectChat, currentUser]);

  // Load messages and subscribe when chat is selected
  useEffect(() => {
    if (!selectedChat || !currentUser) {
      // Cleanup
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
        messageSubscriptionRef.current = null;
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
        typingSubscriptionRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Load messages
    const loadMessages = async () => {
      try {
        const messages = await chatService.getMessages(selectedChat.id);
        if (isMounted) {
          setSelectedChat(prev => prev ? { ...prev, messages } : null);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    // Mark as read
    const markAsRead = async () => {
      await chatService.markMessagesAsRead(selectedChat.id, currentUser.id);
      const newCount = await chatService.getUnreadCount(selectedChat.id, currentUser.id);
      if (isMounted) {
        setUnreadCounts(prev => {
          const updated = { ...prev, [selectedChat.id]: newCount };
          const total = Object.values(updated).reduce((sum, count) => sum + count, 0);
          setTotalUnreadCount(total);
          if (onUnreadCountChange) {
            onUnreadCountChange(total);
          }
          return updated;
        });
      }
    };

    markAsRead();
    const markInterval = setInterval(markAsRead, 2000);

    // Subscribe to new messages in this chat
    messageSubscriptionRef.current = chatService.subscribeToMessages(selectedChat.id, (message) => {
      if (!isMounted) return;
      
      setSelectedChat(prev => {
        if (!prev) return prev;
        const exists = prev.messages.some(m => m.id === message.id);
        if (exists) return prev;
        const updated = {
          ...prev,
          messages: [...prev.messages, message].sort((a, b) => a.timestamp - b.timestamp),
          lastMessage: message,
          lastMessageAt: message.timestamp,
        };
        
        // Mark as read if message is not from user
        if (message.senderId !== currentUser.id) {
          chatService.markMessagesAsRead(selectedChat.id, currentUser.id).then(async () => {
            const newCount = await chatService.getUnreadCount(selectedChat.id, currentUser.id);
            setUnreadCounts(prev => {
              const updated = { ...prev, [selectedChat.id]: newCount };
              const total = Object.values(updated).reduce((sum, count) => sum + count, 0);
              setTotalUnreadCount(total);
              if (onUnreadCountChange) {
                onUnreadCountChange(total);
              }
              return updated;
            });
          });
        }
        
        return updated;
      });
      
      scrollToBottom();
    });

    // Subscribe to typing indicators
    typingSubscriptionRef.current = chatService.subscribeToTyping(
      selectedChat.id,
      currentUser.id,
      (typingUserId, isTyping) => {
        if (!isMounted) return;
        setTypingUsers(prev => {
          const updated = { ...prev };
          if (isTyping) {
            updated[selectedChat.id] = typingUserId;
          } else {
            delete updated[selectedChat.id];
          }
          return updated;
        });
      }
    );

    return () => {
      isMounted = false;
      clearInterval(markInterval);
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
        messageSubscriptionRef.current = null;
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
        typingSubscriptionRef.current = null;
      }
    };
  }, [selectedChat?.id, currentUser?.id, scrollToBottom, onUnreadCountChange]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!selectedChat || !currentUser || !typingSubscriptionRef.current) return;
    
    if (typingSubscriptionRef.current.setTyping) {
      typingSubscriptionRef.current.setTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (typingSubscriptionRef.current?.setTyping) {
        typingSubscriptionRef.current.setTyping(false);
      }
    }, 3000);
  }, [selectedChat, currentUser]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser || sendingMessage || sendLockRef.current) return;

    sendLockRef.current = true;
    setSendingMessage(true);
    
    const messageToSend = messageText.trim();
    setMessageText('');
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingSubscriptionRef.current?.setTyping) {
      typingSubscriptionRef.current.setTyping(false);
    }

    try {
      await chatService.sendMessage(selectedChat.id, currentUser.id, messageToSend);
      
      // Update chat list - move to top
      setChats(prev => {
        const chatIndex = prev.findIndex(c => c.id === selectedChat.id);
        if (chatIndex === -1) return prev;
        
        const updated = [...prev];
        const chat = updated[chatIndex];
        updated.splice(chatIndex, 1);
        
        // Update lastMessageAt
        const now = Date.now();
        updated.unshift({
          ...chat,
          lastMessageAt: now,
        });
        
        return updated.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      });
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(messageToSend);
    } finally {
      setSendingMessage(false);
      sendLockRef.current = false;
    }
  };

  // Helpers
  const getOtherParticipant = (chat: Chat): User | null => {
    if (!currentUser) return null;
    const otherId = chat.participants.find(id => id !== currentUser.id);
    return otherId ? chatParticipants[otherId] || null : null;
  };

  const getListingForChat = (chat: Chat): Listing | null => {
    return chat.listingId ? (chatListings[chat.id] || null) : null;
  };

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    let filtered = chats.filter(chat => {
      const otherParticipant = getOtherParticipant(chat);
      if (!otherParticipant) return false;
      
      const lastMessage = chat.lastMessage || (chat.messages?.length > 0 ? chat.messages[chat.messages.length - 1] : null);
      if (!lastMessage || !lastMessage.text?.trim()) return false;
      
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        otherParticipant.name?.toLowerCase().includes(query) ||
        lastMessage.text.toLowerCase().includes(query) ||
        chatListings[chat.id]?.title.toLowerCase().includes(query)
      );
    });
    
    // Sort by lastMessageAt (most recent first)
    return filtered.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  }, [chats, searchQuery, chatParticipants, chatListings, currentUser]);

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    
    messages.forEach((message) => {
      const messageDate = formatDateSeparator(message.timestamp);
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(message);
    });
    
    return groups;
  };

  // Render listing card inline
  const renderListingCardInline = (listing: Listing) => {
    if (!onSelectListing) return null;
    
    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onSelectListing(listing);
        }}
        className="mt-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors"
      >
        <div className="flex gap-3">
          {listing.images?.[0] && (
            <img 
              src={listing.images[0]} 
              alt={listing.title}
              className="w-16 h-16 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-gray-900 truncate">{listing.title}</h4>
            <p className="text-xs text-gray-500 mt-1">
              {listing.year} • {listing.mileage ? `${listing.mileage.toLocaleString()} km` : 'N/A'}
            </p>
            <p className="text-sm font-black text-indigo-600 mt-1">
              {listing.price.toLocaleString()} FCFA
            </p>
          </div>
          <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  };

  // Render listing card sticky
  const renderListingCardSticky = (listing: Listing) => {
    if (!onSelectListing) return null;
    
    return (
      <div 
        ref={listingCardRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectListing(listing);
        }}
        className="sticky top-[73px] z-10 mx-4 mt-4 mb-2 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border-2 border-indigo-200 cursor-pointer hover:border-indigo-400 hover:shadow-lg transition-all group"
      >
        <div className="flex items-start gap-4">
          {listing.images?.[0] && (
            <div className="relative flex-shrink-0">
              <img 
                src={listing.images[0]} 
                alt={listing.title}
                className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-md"
              />
              <div className="absolute -top-1 -right-1 bg-indigo-600 text-white p-1 rounded-full">
                <Package size={12} />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-full">
                Article concerné
              </span>
            </div>
            <h4 className="font-black text-base text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {listing.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span>{listing.year}</span>
              {listing.mileage && listing.mileage > 0 && (
                <>
                  <span>•</span>
                  <span>{listing.mileage.toLocaleString()} km</span>
                </>
              )}
            </div>
            <p className="text-lg font-black text-indigo-600">
              {listing.price.toLocaleString()} FCFA
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <ArrowRight size={20} className="text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            <span className="text-[10px] text-gray-500 font-medium">Voir</span>
          </div>
        </div>
      </div>
    );
  };

  // Conversation view
  if (selectedChat) {
    const otherParticipant = getOtherParticipant(selectedChat);
    const listing = getListingForChat(selectedChat);
    const messageGroups = groupMessagesByDate(selectedChat.messages || []);
    const typingUserId = typingUsers[selectedChat.id];
    const typingParticipant = typingUserId ? chatParticipants[typingUserId] : null;

    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white p-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button 
            onClick={() => handleSelectChat(null)} 
            className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
          {otherParticipant && (
            <>
              <div className="relative">
                <img 
                  src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name)}&background=6366f1&color=fff`} 
                  className="w-10 h-10 rounded-full border-2 border-indigo-100" 
                  alt="" 
                />
                {onlineUsers.has(otherParticipant.id) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">{otherParticipant.name}</h3>
                <div className="flex items-center gap-1">
                  {typingParticipant ? (
                    <span className="text-[10px] text-indigo-600 font-medium">en train d'écrire...</span>
                  ) : onlineUsers.has(otherParticipant.id) ? (
                    <span className="text-[10px] text-green-500 font-bold">EN LIGNE</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-medium">Hors ligne</span>
                  )}
                </div>
              </div>
            </>
          )}
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical size={20} />
          </button>
        </header>

        {/* Listing card */}
        {listing && renderListingCardSticky(listing)}

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messageGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 px-3 py-1 rounded-full">
                  <span className="text-[10px] text-gray-600 font-bold uppercase">
                    {group.date}
                  </span>
                </div>
              </div>
              
              {group.messages.map((message, messageIndex) => {
                const isOwnMessage = message.senderId === currentUser?.id;
                const showTime = messageIndex === group.messages.length - 1 || 
                  (messageIndex < group.messages.length - 1 && 
                   group.messages[messageIndex + 1].senderId !== message.senderId);
                
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isOwnMessage ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                      <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                        isOwnMessage 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                      }`}>
                        {message.text}
                        {message.listingCard && renderListingCardInline(message.listingCard)}
                      </div>
                      {showTime && (
                        <span className={`text-[10px] text-gray-400 mt-1 px-2 ${
                          isOwnMessage ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          
          {/* Typing indicator */}
          {typingParticipant && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 p-4 safe-bottom sticky bottom-0 z-10">
          <div className="flex gap-2 items-end">
            <input 
              type="text" 
              placeholder="Écrivez un message..." 
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !messageText.trim() || sendLockRef.current}
              className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-indigo-700 active:scale-95"
            >
              {sendingMessage ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat list view
  if (!currentUser) {
    return (
      <div className="bg-white min-h-full flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-gray-400 text-sm font-bold">Veuillez vous connecter pour voir vos conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full flex flex-col">
      <header className="p-6 pb-4 space-y-4 sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-black text-gray-900">Messages</h2>
          {totalUnreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher une conversation..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-gray-400 text-sm font-bold">
              {searchQuery.trim() ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </p>
            <p className="text-gray-300 text-xs mt-2">
              {searchQuery.trim() ? 'Essayez un autre terme de recherche' : 'Commencez une conversation depuis une annonce'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredChats.map(chat => {
              const otherParticipant = getOtherParticipant(chat);
              const lastMessage = chat.lastMessage || (chat.messages?.length > 0 ? chat.messages[chat.messages.length - 1] : null);
              const unreadCount = unreadCounts[chat.id] || 0;
              const listing = getListingForChat(chat);
              
              return (
                <div 
                  key={chat.id} 
                  onClick={() => handleSelectChat(chat)}
                  className="p-6 flex gap-4 active:bg-gray-50 transition-colors cursor-pointer relative"
                >
                  <div className="relative flex-shrink-0">
                    {otherParticipant ? (
                      <img 
                        src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name)}&background=6366f1&color=fff`} 
                        className="w-14 h-14 rounded-full border-2 border-indigo-50" 
                        alt={otherParticipant.name}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full border-2 border-indigo-50 bg-gray-100" />
                    )}
                    {onlineUsers.has(otherParticipant?.id || '') && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-5 flex items-center justify-center px-1 border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-900 truncate text-sm">
                        {otherParticipant?.name || 'Utilisateur'}
                      </h3>
                      {lastMessage && (
                        <span className="text-[10px] text-gray-400 font-bold flex-shrink-0 ml-2">
                          {formatTime(lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    {listing && (
                      <div className="flex items-center gap-2 mb-1 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        {listing.images?.[0] && (
                          <img 
                            src={listing.images[0]} 
                            alt={listing.title}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-indigo-600 font-bold truncate">
                            {listing.title}
                          </p>
                          <p className="text-[9px] text-gray-500 truncate">
                            {listing.price.toLocaleString()} FCFA
                          </p>
                        </div>
                      </div>
                    )}
                    {lastMessage && (
                      <p className={`text-xs truncate ${unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                        {lastMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatList);
