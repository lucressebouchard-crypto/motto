
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, Search, MoreVertical, Send, Loader2, ArrowRight, ArrowUp, Package } from 'lucide-react';
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

const ChatList: React.FC<ChatListProps> = ({ onClose, currentUser, selectedChatId, onChatSelected, onSelectListing, onUnreadCountChange }) => {
  // Toujours appeler useAppCache en premier (hook) - ne peut pas être conditionnel
  const { getChats, setChats: setCacheChats, getUser, setUser } = useAppCache();
  
  // Tous les states d'abord
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]); // Ne pas initialiser depuis le cache pour éviter les problèmes d'initialisation
  const [loading, setLoading] = useState(false); // Ne plus afficher de chargement par défaut
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatParticipants, setChatParticipants] = useState<Record<string, User>>({});
  const [chatListings, setChatListings] = useState<Record<string, Listing>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // chatId -> userId typing
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // Tous les refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const listingCardRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const typingSubscriptionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendLockRef = useRef(false);

  // Formater l'heure
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

  // Formater la date pour les séparateurs dans la conversation
  const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = messageDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === -1) {
      return "Hier";
    } else if (diffDays > -7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  // Scroll vers le bas
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Notifier le parent quand le chat sélectionné change
  const handleSelectChat = useCallback((chat: Chat | null) => {
    setSelectedChat(chat);
    if (onChatSelected) {
      onChatSelected(chat?.id || null);
    }
  }, [onChatSelected]);

  // Ouvrir directement le chat sélectionné (depuis les détails d'article)
  useEffect(() => {
    if (selectedChatId && currentUser) {
      // Si les chats sont déjà chargés, trouver et ouvrir le chat
      if (chats.length > 0) {
        const chatToOpen = chats.find(c => c.id === selectedChatId);
        if (chatToOpen && (!selectedChat || selectedChat.id !== selectedChatId)) {
          handleSelectChat(chatToOpen);
        }
      } else {
        // Si les chats ne sont pas encore chargés, charger le chat spécifique directement
        const loadSpecificChat = async () => {
          try {
            setLoading(true);
            const chat = await chatService.getById(selectedChatId);
            if (chat) {
              handleSelectChat(chat);
              // Ajouter le chat à la liste si pas déjà présent
              setChats(prev => {
                if (!prev.find(c => c.id === chat.id)) {
                  return [chat, ...prev];
                }
                return prev;
              });
              // Charger aussi les autres chats en arrière-plan
              const allChats = await chatService.getByParticipant(currentUser.id);
              setChats(allChats);
              setCacheChats(allChats);
            }
            setLoading(false);
          } catch (error) {
            console.error('Error loading specific chat:', error);
            setLoading(false);
          }
        };
        loadSpecificChat();
      }
    }
  }, [selectedChatId, chats, selectedChat, handleSelectChat, currentUser, setCacheChats]);

  // Refs pour maintenir l'état entre les rendus
  const hasLoadedRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingRef = useRef(false);

  // Charger les chats avec compteurs de non lus (seulement si nécessaire)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    const CACHE_DURATION = 10000; // 10 secondes de cache

    // Vérifier le cache d'abord si on n'a pas encore chargé
    if (!hasLoadedRef.current) {
      try {
        const cachedChats = getChats();
        if (Array.isArray(cachedChats) && cachedChats.length > 0) {
          setChats(cachedChats);
          setCacheChats(cachedChats);
          hasLoadedRef.current = true;
          lastLoadTimeRef.current = now;
        }
      } catch (error) {
        console.error('Error loading chats from cache:', error);
      }
    }

    // Si les chats sont déjà chargés et récents, ne pas recharger
    if (hasLoadedRef.current && timeSinceLastLoad < CACHE_DURATION && chats.length > 0) {
      setLoading(false);
      return;
    }

    // Éviter les chargements simultanés
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    const loadChats = async () => {
      try {
        const userChats = await chatService.getByParticipant(currentUser.id);
        
        // Mettre à jour le cache
        setCacheChats(userChats);
        setChats(userChats);
        lastLoadTimeRef.current = Date.now();
        hasLoadedRef.current = true;

        // Charger les informations des participants et listings
        const participantsMap: Record<string, User> = {};
        const listingsMap: Record<string, Listing> = {};
        const unreadMap: Record<string, number> = {};

        // Charger en parallèle pour optimiser
        const promises: Promise<void>[] = [];

        for (const chat of userChats) {
          // Participants
          for (const participantId of chat.participants) {
            if (participantId !== currentUser.id && !participantsMap[participantId]) {
              // Vérifier le cache d'abord
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
                  }).catch(error => {
                    console.error('Error loading participant:', error);
                  })
                );
              }
            }
          }

          // Listing si présent
          if (chat.listingId && !listingsMap[chat.id]) {
            promises.push(
              listingService.getById(chat.listingId).then(listing => {
                if (listing) {
                  listingsMap[chat.id] = listing;
                }
              }).catch(error => {
                console.error('Error loading listing:', error);
              })
            );
          }

          // Compteur de non lus
          promises.push(
            chatService.getUnreadCount(chat.id, currentUser.id).then(unread => {
              unreadMap[chat.id] = unread;
            })
          );
        }

        // Attendre que tous les chargements soient terminés
        await Promise.all(promises);

        setChatParticipants(prev => ({ ...prev, ...participantsMap }));
        setChatListings(prev => ({ ...prev, ...listingsMap }));
        setUnreadCounts(unreadMap);
        
        const totalUnread = Object.values(unreadMap).reduce((sum, count) => sum + count, 0);
        setTotalUnreadCount(totalUnread);
        
        // Notifier le parent du changement
        if (onUnreadCountChange) {
          onUnreadCountChange(totalUnread);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des chats:', error);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadChats();
    
    // Recharger périodiquement pour mettre à jour les compteurs (seulement si nécessaire)
    const interval = setInterval(() => {
      if (!loadingRef.current) {
        loadChats();
      }
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [currentUser?.id]); // Seulement recharger si l'utilisateur change

  // Exposer le compteur total pour App.tsx
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(totalUnreadCount);
    }
  }, [totalUnreadCount, onUnreadCountChange]);

  // Gérer la saisie pour l'indicateur de frappe
  const handleTyping = useCallback(() => {
    if (!selectedChat || !currentUser) return;
    
    setIsTyping(true);
    
    // Envoyer l'indicateur de frappe via presence
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.track({ userId: currentUser.id, typing: true });
    }

    // Arrêter l'indicateur après 3 secondes sans frappe
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.track({ userId: currentUser.id, typing: false });
      }
    }, 3000);
  }, [selectedChat, currentUser]);

  // S'abonner aux nouveaux messages du chat sélectionné
  useEffect(() => {
    if (!selectedChat || !currentUser) {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
        typingSubscriptionRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Charger les messages initiaux
    const loadMessages = async () => {
      try {
        const messages = await chatService.getMessages(selectedChat.id);
        if (isMounted) {
          setSelectedChat(prev => prev ? { ...prev, messages } : null);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
      }
    };

    loadMessages();

    // Nettoyer les abonnements précédents
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.unsubscribe();
      typingSubscriptionRef.current = null;
    }

    // S'abonner aux nouveaux messages
    subscriptionRef.current = chatService.subscribeToMessages(selectedChat.id, (message) => {
      if (!isMounted) return;
      
      // Vérifier que le message n'est pas déjà présent (éviter doublons)
      setSelectedChat(prev => {
        if (!prev) return prev;
        if (prev.messages.some(m => m.id === message.id)) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
      
      // Mettre à jour la liste des chats
      setChats(prev => prev.map(chat => {
        if (chat.id === selectedChat.id) {
          const lastMessage = chat.messages[chat.messages.length - 1];
          if (!lastMessage || message.timestamp > lastMessage.timestamp) {
            return { ...chat, lastMessage: message, lastMessageAt: message.timestamp };
          }
        }
        return chat;
      }));
      
      scrollToBottom();
    });

    // S'abonner aux indicateurs de frappe
    typingSubscriptionRef.current = chatService.subscribeToTyping(
      selectedChat.id,
      currentUser.id,
      (isTyping, userId) => {
        if (!isMounted) return;
        if (isTyping) {
          setTypingUsers(prev => ({ ...prev, [selectedChat.id]: userId }));
        } else {
          setTypingUsers(prev => {
            const newState = { ...prev };
            delete newState[selectedChat.id];
            return newState;
          });
        }
      }
    );

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
        typingSubscriptionRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedChat?.id, currentUser?.id, scrollToBottom]);

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser || sendingMessage || sendLockRef.current) return;

    sendLockRef.current = true;
    setSendingMessage(true);
    
    const messageToSend = messageText.trim();
    setMessageText(''); // Vider immédiatement pour éviter les doublons
    
    // Arrêter l'indicateur de frappe
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.track({ userId: currentUser.id, typing: false });
    }

    try {
      // Ne pas ajouter le message localement immédiatement pour éviter les doublons
      // Il sera ajouté via l'abonnement Realtime
      const newMessage = await chatService.sendMessage(selectedChat.id, currentUser.id, messageToSend);
      
      // Mettre à jour la liste des chats
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, lastMessage: newMessage, lastMessageAt: newMessage.timestamp }
          : chat
      ));
      
      scrollToBottom();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      // Remettre le texte en cas d'erreur
      setMessageText(messageToSend);
    } finally {
      setSendingMessage(false);
      sendLockRef.current = false;
    }
  };

  const getOtherParticipant = (chat: Chat): User | null => {
    if (!currentUser) return null;
    const otherId = chat.participants.find(id => id !== currentUser.id);
    return otherId ? chatParticipants[otherId] || null : null;
  };

  const getListingForChat = (chat: Chat): Listing | null => {
    return chat.listingId ? (chatListings[chat.id] || null) : null;
  };

  // Rendu de la carte d'article compacte (pour les messages)
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
          {listing.images && listing.images.length > 0 && (
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

  // Rendu de la carte d'article sticky (en haut de la conversation)
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
          {listing.images && listing.images.length > 0 && (
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

  // Fonction pour scroller vers la carte d'article
  const scrollToListingCard = useCallback(() => {
    if (listingCardRef.current) {
      listingCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Détecter le scroll pour afficher/masquer le bouton "remonter"
  useEffect(() => {
    if (!selectedChat) return;
    
    const listing = getListingForChat(selectedChat);
    if (!listing) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (listingCardRef.current) {
        const cardTop = listingCardRef.current.getBoundingClientRect().top;
        const containerTop = container.getBoundingClientRect().top;
        // Afficher le bouton si la carte n'est pas visible (en haut)
        setShowScrollToTop(cardTop < containerTop - 100);
      }
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Vérifier immédiatement
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedChat?.id]);

  // Grouper les messages par date pour afficher les séparateurs
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

  // Vue de conversation
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
            onClick={() => {
              handleSelectChat(null);
              setIsTyping(false);
              // Notifier le parent qu'on revient à la liste
              if (onChatSelected) {
                onChatSelected(null);
              }
            }} 
            className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-full"
            title="Retour aux conversations"
            aria-label="Retour aux conversations"
          >
            <ChevronLeft size={24} />
          </button>
          {otherParticipant && (
            <>
              <div className="relative">
                <img 
                  src={otherParticipant.avatar} 
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

        {/* Carte d'article sticky (si présente) */}
        {listing && renderListingCardSticky(listing)}

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ paddingBottom: '1rem' }}
        >
          {messageGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {/* Séparateur de date */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 px-3 py-1 rounded-full">
                  <span className="text-[10px] text-gray-600 font-bold uppercase">
                    {group.date}
                  </span>
                </div>
              </div>
              
              {/* Messages du groupe */}
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
                        
                        {/* Carte d'article si présente */}
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
          
          {/* Indicateur de frappe */}
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

        {/* Bouton pour remonter vers la carte d'article */}
        {listing && showScrollToTop && (
          <button
            onClick={scrollToListingCard}
            className="fixed bottom-24 right-4 z-20 bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
            title="Voir l'article concerné"
          >
            <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
          </button>
        )}

        {/* Input fixe en bas */}
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
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
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

  // Vue liste des chats
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
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-gray-400 text-sm font-bold">Aucune conversation</p>
            <p className="text-gray-300 text-xs mt-2">Commencez une conversation depuis une annonce</p>
          </div>
        ) : (
      <div className="divide-y divide-gray-50">
            {chats.map(chat => {
              const otherParticipant = getOtherParticipant(chat);
              const lastMessage = chat.lastMessage || (chat.messages && chat.messages[chat.messages.length - 1]);
              const unreadCount = unreadCounts[chat.id] || 0;
              const listing = getListingForChat(chat);
              
              return (
                <div 
                  key={chat.id} 
                  onClick={() => handleSelectChat(chat)}
                  className="p-6 flex gap-4 active:bg-gray-50 transition-colors cursor-pointer relative"
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={otherParticipant?.avatar || 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff'} 
                      className="w-14 h-14 rounded-full border-2 border-indigo-50" 
                      alt="" 
                    />
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
                        {listing.images && listing.images.length > 0 && (
                          <img 
                            src={listing.images[0]} 
                            alt={listing.title}
                            className="w-10 h-10 object-cover rounded-lg"
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

export default ChatList;
