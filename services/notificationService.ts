import { supabase } from '../lib/supabase';
import { Notification } from '../types';

export interface CreateNotificationData {
  userId: string;
  title: string;
  body: string;
}

export const notificationService = {
  async create(data: CreateNotificationData): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        title: data.title,
        body: data.body,
        read: false,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return mapNotificationFromDB(notification);
  },

  async getByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapNotificationFromDB);
  },

  async markAsRead(id: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapNotificationFromDB(data);
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(mapNotificationFromDB(payload.new));
        }
      )
      .subscribe();
  },
};

function mapNotificationFromDB(dbNotification: any): Notification {
  return {
    id: dbNotification.id,
    userId: dbNotification.user_id,
    title: dbNotification.title,
    body: dbNotification.body,
    read: dbNotification.read,
    timestamp: new Date(dbNotification.timestamp).getTime(),
  };
}

