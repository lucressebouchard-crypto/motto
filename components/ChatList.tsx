
import React, { useState } from 'react';
import { ChevronLeft, Search, MoreVertical, Send } from 'lucide-react';

interface ChatListProps {
  onClose: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ onClose }) => {
  const [selectedChat, setSelectedChat] = useState<any | null>(null);

  const mockChats = [
    { id: '1', name: 'Marc Auto', lastMessage: 'Est-il possible de négocier le prix ?', time: '14:20', avatar: 'https://picsum.photos/100/100?random=10' },
    { id: '2', name: 'Sophie Vendeuse', lastMessage: 'Le CT est ok.', time: 'Hier', avatar: 'https://picsum.photos/100/100?random=11' },
  ];

  if (selectedChat) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="bg-white p-4 border-b flex items-center gap-3">
          <button onClick={() => setSelectedChat(null)} className="text-gray-600"><ChevronLeft size={24} /></button>
          <img src={selectedChat.avatar} className="w-10 h-10 rounded-full" alt="" />
          <div className="flex-1">
            <h3 className="font-bold text-sm text-gray-900">{selectedChat.name}</h3>
            <span className="text-[10px] text-green-500 font-bold">EN LIGNE</span>
          </div>
          <button className="text-gray-400"><MoreVertical size={20} /></button>
        </header>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md">
              Bonjour, je suis intéressé par votre annonce pour la BMW M4.
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm shadow-sm border border-gray-100">
              Bonjour ! Super. Quelles sont vos questions ?
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t safe-bottom">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Écrivez un message..." 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Send size={20} />
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

      <div className="divide-y divide-gray-50">
        {mockChats.map(chat => (
          <div 
            key={chat.id} 
            onClick={() => setSelectedChat(chat)}
            className="p-6 flex gap-4 active:bg-gray-50 transition-colors"
          >
            <img src={chat.avatar} className="w-14 h-14 rounded-full border-2 border-indigo-50" alt="" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-gray-900 truncate">{chat.name}</h3>
                <span className="text-[10px] text-gray-400 font-bold">{chat.time}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
