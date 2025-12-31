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
    console.log('🔐 Starting signup for:', data.email);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: data.role,
        }
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      throw authError;
    }
    
    if (!authData.user) {
      console.error('❌ No user returned from signUp');
      throw new Error('Échec de la création du compte. Veuillez réessayer.');
    }

    console.log('✅ User created in Auth:', authData.user.id);

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

    console.log('📝 Creating profile with data:', { ...profileData, specialties: profileData.specialties });

    const { data: insertedProfiles, error: profileError } = await supabase
      .from('users')
      .insert(profileData)
      .select();

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
      console.error('Error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      
      // Si le profil existe déjà (peut arriver avec email confirmation), on le récupère
      if (profileError.code === '23505') { // Violation de contrainte unique
        console.log('ℹ️ Profile already exists, fetching...');
        const { data: existingProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching existing profile:', fetchError);
          throw fetchError;
        }
        console.log('✅ Found existing profile');
        return { user: authData.user, profile: existingProfile };
      }
      // Si erreur RLS (permission denied), donner un message plus explicite
      if (profileError.code === '42501' || profileError.message?.includes('permission')) {
        throw new Error('Erreur de permission. La policy INSERT pour la table users est manquante. Veuillez exécuter le script SQL de correction.');
      }
      
      // Message d'erreur plus explicite pour l'utilisateur
      const errorMessage = profileError.message || 'Erreur lors de la création du profil';
      throw new Error(`Impossible de créer le profil: ${errorMessage}`);
    }

    // Vérifier qu'on a bien un profil retourné
    if (!insertedProfiles || insertedProfiles.length === 0) {
      console.error('❌ Profile created but not returned');
      throw new Error('Profil créé mais non retourné. Veuillez vous reconnecter.');
    }

    console.log('✅ Profile created successfully:', insertedProfiles[0].id);
    const profile = insertedProfiles[0];
    return { user: authData.user, profile };
  },

  async signIn(signInData: SignInData) {
    console.log('🔐 Starting signin for:', signInData.email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password,
    });

    if (error) {
      console.error('❌ Signin error:', error);
      throw error;
    }
    
    console.log('✅ Signin successful');
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

    if (error) {
      // Si le profil n'existe pas (utilisateur créé dans Auth mais pas dans users)
      if (error.code === 'PGRST116') {
        console.warn('User exists in Auth but not in users table. Creating profile...');
        // Essayer de créer le profil avec les données de base
        const profileData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'buyer',
          avatar: user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email?.split('@')[0] || 'User')}&background=6366f1&color=fff`,
        };
        
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert(profileData)
          .select()
          .single();
        
        if (insertError) {
          console.error('Failed to create missing profile:', insertError);
          return null;
        }
        
        return newProfile ? mapUserFromDB(newProfile) : null;
      }
      throw error;
    }
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

