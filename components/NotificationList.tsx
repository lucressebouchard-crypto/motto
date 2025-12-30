
import React from 'react';
import { ChevronLeft, Bell, Star, Heart, MessageCircle } from 'lucide-react';

interface NotificationListProps {
  onClose: () => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ onClose }) => {
  const notifications = [
    { 
      id: '1', 
      type: 'message',
      title: 'Nouveau message', 
      body: 'Marc Auto a répondu à votre annonce.', 
      time: 'Il y a 2 min',
      unread: true,
      icon: <MessageCircle size={18} className="text-blue-500" />
    },
    { 
      id: '2', 
      type: 'like',
      title: 'Nouveau favori', 
      body: 'Quelqu\'un a ajouté votre BMW M4 à ses favoris.', 
      time: 'Il y a 1h',
      unread: true,
      icon: <Heart size={18} className="text-red-500" fill="currentColor" />
    },
    { 
      id: '3', 
      type: 'system',
      title: 'Annonce publiée', 
      body: 'Votre annonce pour le Casque AGV est maintenant en ligne.', 
      time: 'Hier',
      unread: false,
      icon: <Star size={18} className="text-amber-500" fill="currentColor" />
    }
  ];

  return (
    <div className="bg-white min-h-full">
      <header className="p-6 pb-2">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 transition-transform active:scale-90"><ChevronLeft size={24} /></button>
          <h2 className="text-xl font-black text-gray-900">Notifications</h2>
        </div>
      </header>

      <div className="divide-y divide-gray-50 mt-4">
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={`p-6 flex gap-4 transition-colors active:bg-gray-50 ${notif.unread ? 'bg-indigo-50/30' : ''}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
              {notif.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-sm ${notif.unread ? 'font-black' : 'font-bold'} text-gray-900`}>{notif.title}</h3>
                <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap ml-2">{notif.time}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{notif.body}</p>
            </div>
            {notif.unread && (
              <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="p-10 text-center space-y-2">
        <p className="text-gray-400 text-xs italic">C'est tout pour le moment !</p>
      </div>
    </div>
  );
};

export default NotificationList;
