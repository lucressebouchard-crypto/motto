import { supabase } from '../lib/supabase';
import { User } from '../types';

export const userService = {
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? mapUserFromDB(data) : null;
  },

  async getAll(filters?: { role?: string }): Promise<User[]> {
    let query = supabase.from('users').select('*');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapUserFromDB);
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.avatar) updateData.avatar = updates.avatar;
    if (updates.phoneNumber) updateData.phone_number = updates.phoneNumber;
    if (updates.address) updateData.address = updates.address;
    if (updates.shopName) updateData.shop_name = updates.shopName;
    if (updates.specialties) updateData.specialties = updates.specialties;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.completedInspections !== undefined) updateData.completed_inspections = updates.completedInspections;
    if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
    if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapUserFromDB(data);
  },
};

function mapUserFromDB(dbUser: any): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    avatar: dbUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.name)}&background=6366f1&color=fff`,
    shopName: dbUser.shop_name,
    phoneNumber: dbUser.phone_number,
    address: dbUser.address,
    isVerified: dbUser.is_verified,
    specialties: dbUser.specialties,
    rating: dbUser.rating,
    completedInspections: dbUser.completed_inspections,
    hourlyRate: dbUser.hourly_rate,
  };
}

