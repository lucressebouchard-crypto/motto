
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Search, MoreVertical, Send, Loader2 } from 'lucide-react';
import { Chat, Message, User } from '../types';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { authService } from '../services/authService';

interface ChatListProps {
  onClose: () => void;
  currentUser: User | null;
}

const ChatList: React.FC<ChatListProps> = ({ onClose, currentUser }) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatParticipants, setChatParticipants] = useState<Record<string, User>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  // Charger les chats
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const loadChats = async () => {
      try {
        const userChats = await chatService.getByParticipant(currentUser.id);
        setChats(userChats);

        // Charger les informations des participants
        const participantsMap: Record<string, User> = {};
        for (const chat of userChats) {
          for (const participantId of chat.participants) {
            if (participantId !== currentUser.id && !participantsMap[participantId]) {
              try {
                const user = await userService.getById(participantId);
                if (user) {
                  participantsMap[participantId] = user;
                }
              } catch (error) {
                console.error('Error loading participant:', error);
              }
            }
          }
        }
        setChatParticipants(participantsMap);
      } catch (error) {
        console.error('Erreur lors du chargement des chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [currentUser]);

  // S'abonner aux nouveaux messages du chat sélectionné
  useEffect(() => {
    if (!selectedChat || !currentUser) {
      // Nettoyer l'abonnement si pas de chat sélectionné ou d'utilisateur
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
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

    // Nettoyer l'abonnement précédent si existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // S'abonner aux nouveaux messages
    subscriptionRef.current = chatService.subscribeToMessages(selectedChat.id, (message) => {
      if (!isMounted) return;
      setSelectedChat(prev => {
        if (!prev) return prev;
        // Éviter les doublons
        if (prev.messages.some(m => m.id === message.id)) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
      scrollToBottom();
    });

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [selectedChat?.id, currentUser?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      const newMessage = await chatService.sendMessage(selectedChat.id, currentUser.id, messageText.trim());
      setSelectedChat(prev => prev ? { ...prev, messages: [...prev.messages, newMessage] } : null);
      setMessageText('');
      scrollToBottom();

      // Mettre à jour la liste des chats
      const updatedChats = chats.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, messages: [...chat.messages, newMessage] }
          : chat
      );
      setChats(updatedChats);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getOtherParticipant = (chat: Chat): User | null => {
    if (!currentUser) return null;
    const otherId = chat.participants.find(id => id !== currentUser.id);
    return otherId ? chatParticipants[otherId] || null : null;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  if (selectedChat) {
    const otherParticipant = getOtherParticipant(selectedChat);
    
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="bg-white p-4 border-b flex items-center gap-3">
          <button onClick={() => setSelectedChat(null)} className="text-gray-600"><ChevronLeft size={24} /></button>
          {otherParticipant && (
            <>
              <img src={otherParticipant.avatar} className="w-10 h-10 rounded-full" alt="" />
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">{otherParticipant.name}</h3>
                <span className="text-[10px] text-green-500 font-bold">EN LIGNE</span>
              </div>
            </>
          )}
          <button className="text-gray-400"><MoreVertical size={20} /></button>
        </header>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {selectedChat.messages.map((message) => {
            const isOwnMessage = message.senderId === currentUser?.id;
            return (
              <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[80%] text-sm shadow-md ${
                  isOwnMessage 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  {message.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t safe-bottom">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Écrivez un message..." 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !messageText.trim()}
              className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingMessage ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      <header className="p-6 pb-2 space-y-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600"><ChevronLeft size={24} /></button>
          <h2 className="text-xl font-black text-gray-900">Messages</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher une conversation..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none"
          />
        </div>
      </header>

      {loading ? (
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
            const lastMessage = chat.messages[chat.messages.length - 1];
            
            return (
              <div 
                key={chat.id} 
                onClick={() => setSelectedChat(chat)}
                className="p-6 flex gap-4 active:bg-gray-50 transition-colors cursor-pointer"
              >
                <img 
                  src={otherParticipant?.avatar || 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff'} 
                  className="w-14 h-14 rounded-full border-2 border-indigo-50" 
                  alt="" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{otherParticipant?.name || 'Utilisateur'}</h3>
                    {lastMessage && (
                      <span className="text-[10px] text-gray-400 font-bold">{formatTime(lastMessage.timestamp)}</span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-xs text-gray-500 truncate">{lastMessage.text}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatList;
