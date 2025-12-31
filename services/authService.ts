import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  shopName?: string;
  address?: string;
  specialties?: string[];
}

export interface SignInData {
  email: string;
  password: string;
}

export const authService = {
  async signUp(data: SignUpData) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
    const profileData = {
      id: authData.user.id,
      email: data.email,
      name: data.name,
      role: data.role,
      phone_number: data.phoneNumber || null,
      shop_name: data.shopName || null,
      address: data.address || null,
      specialties: data.specialties || null,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=6366f1&color=fff`,
    };

    const { data: insertedProfiles, error: profileError } = await supabase
      .from('users')
      .insert(profileData)
      .select();

    if (profileError) {
      // Si le profil existe déjà (peut arriver avec email confirmation), on le récupère
      if (profileError.code === '23505') { // Violation de contrainte unique
        const { data: existingProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (fetchError) throw fetchError;
        return { user: authData.user, profile: existingProfile };
      }
      throw profileError;
    }

    // Vérifier qu'on a bien un profil retourné
    if (!insertedProfiles || insertedProfiles.length === 0) {
      throw new Error('Profile created but not returned');
    }

    const profile = insertedProfiles[0];
    return { user: authData.user, profile };
  },

  async signIn(signInData: SignInData) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return profile ? mapUserFromDB(profile) : null;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
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

