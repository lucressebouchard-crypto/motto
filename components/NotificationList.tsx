
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Bell, Star, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { Notification as NotificationType, User } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationListProps {
  onClose: () => void;
  currentUser: User | null;
}

const NotificationList: React.FC<NotificationListProps> = ({ onClose, currentUser }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        const notifs = await notificationService.getByUser(currentUser.id);
        setNotifications(notifs);
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // S'abonner aux nouvelles notifications
    subscriptionRef.current = notificationService.subscribeToNotifications(currentUser.id, (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [currentUser?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Erreur lors de la marque comme lu:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getNotificationIcon = (title: string) => {
    if (title.toLowerCase().includes('message')) {
      return <MessageCircle size={18} className="text-blue-500" />;
    }
    if (title.toLowerCase().includes('favori')) {
      return <Heart size={18} className="text-red-500" fill="currentColor" />;
    }
    return <Star size={18} className="text-amber-500" fill="currentColor" />;
  };

  return (
    <div className="bg-white min-h-full">
      <header className="p-6 pb-2">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 transition-transform active:scale-90"><ChevronLeft size={24} /></button>
          <h2 className="text-xl font-black text-gray-900">Notifications</h2>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <p className="text-gray-400 text-xs italic">Aucune notification</p>
          <p className="text-gray-300 text-xs">Vous serez notifié des nouvelles activités</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50 mt-4">
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                className={`p-6 flex gap-4 transition-colors active:bg-gray-50 cursor-pointer ${notif.read ? '' : 'bg-indigo-50/30'}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
                  {getNotificationIcon(notif.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm ${notif.read ? 'font-bold' : 'font-black'} text-gray-900`}>{notif.title}</h3>
                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap ml-2">{formatTime(notif.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{notif.body}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationList;
