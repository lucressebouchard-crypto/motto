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

// Verrou pour éviter les opérations simultanées d'authentification
let authLock = false;

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
    // Vérifier si une opération d'authentification est déjà en cours
    if (authLock) {
      console.warn('⚠️ [signIn] Opération d\'authentification déjà en cours, veuillez patienter...');
      // Attendre que le verrou soit libéré (max 5 secondes)
      const maxWait = 5000;
      const startTime = Date.now();
      while (authLock && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (authLock) {
        throw new Error('Une opération d\'authentification est déjà en cours. Veuillez réessayer.');
      }
    }

    authLock = true;
    console.log('🔐 [signIn] Starting signin for:', signInData.email);
    
    try {
      // Vérifier s'il y a une session active
      // NOTE: Pour tester plusieurs utilisateurs, on permet plusieurs sessions
      // La déconnexion de la session précédente sera gérée automatiquement par Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession && currentSession.user.email !== signInData.email) {
        // Seulement se déconnecter si c'est un utilisateur différent
        console.log('⚠️ [signIn] Different user session detected, signing out first...');
        try {
          await supabase.auth.signOut();
          // Attendre que la déconnexion se termine
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('✅ [signIn] Previous session signed out');
        } catch (signOutError) {
          console.warn('⚠️ [signIn] Error signing out previous session:', signOutError);
          // Forcer la déconnexion locale si nécessaire
          if (typeof window !== 'undefined') {
            localStorage.removeItem('motto-supabase-auth-token');
            sessionStorage.clear();
          }
        }
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        console.error('❌ [signIn] Signin error:', error);
        throw error;
      }
      
      console.log('✅ [signIn] Signin successful, user:', data.user?.id);
      console.log('📋 [signIn] Session:', data.session ? 'session exists' : 'no session');
      
      // Attendre un peu pour que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 400));
      
      return data;
    } finally {
      authLock = false;
    }
  },

  async signOut() {
    // Vérifier si une opération d'authentification est déjà en cours
    if (authLock) {
      console.warn('⚠️ [signOut] Opération d\'authentification déjà en cours, veuillez patienter...');
      // Attendre que le verrou soit libéré (max 3 secondes)
      const maxWait = 3000;
      const startTime = Date.now();
      while (authLock && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (authLock) {
        console.warn('⚠️ [signOut] Verrou toujours actif, forçant la déconnexion locale...');
        authLock = false;
      }
    }

    authLock = true;
    console.log('🚪 [signOut] Starting signout...');
    
    try {
      // Vérifier l'état actuel de la session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        console.log('🔍 [signOut] Current session user:', currentSession.user.id);
      } else {
        console.log('ℹ️ [signOut] No active session found');
        return; // Pas de session à déconnecter
      }
      
      // Déconnexion principale
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ [signOut] Signout error:', error);
        // Ne pas throw pour permettre le nettoyage local même en cas d'erreur
      } else {
        console.log('✅ [signOut] Signout call completed');
      }
      
      // Vérifier que la session est bien supprimée
      await new Promise(resolve => setTimeout(resolve, 300));
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.warn('⚠️ [signOut] Session still exists after signout, trying once more...');
        // Essayer une deuxième fois
        await supabase.auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log('✅ [signOut] Session confirmed deleted');
      }
      
    } catch (error) {
      console.error('❌ [signOut] Error during signout:', error);
      // Ne pas throw pour permettre le nettoyage local
    } finally {
      authLock = false;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    // Si une opération d'authentification est en cours, attendre un peu
    if (authLock) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('🔍 [getCurrentUser] Getting session...');
    
    try {
      // Utiliser getSession() au lieu de getUser() car il est plus fiable immédiatement après connexion
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [getCurrentUser] Session error:', sessionError);
        return null;
      }
      
      if (!session?.user) {
        console.log('ℹ️ [getCurrentUser] No active session');
        return null;
      }

      const user = session.user;
      console.log('✅ [getCurrentUser] Session found, user ID:', user.id);
      console.log('🔍 [getCurrentUser] Fetching profile from users table...');

      // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs si le profil n'existe pas
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ [getCurrentUser] Profile fetch error:', error);
        console.error('Error details:', { code: error.code, message: error.message });
        // Ne pas throw, retourner null pour permettre à l'app de continuer
        return null;
      }
      
      // Si le profil n'existe pas (maybeSingle retourne null sans erreur)
      if (!profile) {
        console.warn('⚠️ [getCurrentUser] User exists in Auth but not in users table. Creating profile...');
        // Essayer de créer le profil avec les données de base
        const profileData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'buyer',
          avatar: user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email?.split('@')[0] || 'User')}&background=6366f1&color=fff`,
        };
        
        console.log('📝 [getCurrentUser] Creating profile with data:', { ...profileData, id: profileData.id });
        
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert(profileData)
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ [getCurrentUser] Failed to create missing profile:', insertError);
          console.error('Insert error details:', { code: insertError.code, message: insertError.message });
          return null;
        }
        
        console.log('✅ [getCurrentUser] Profile created successfully');
        return newProfile ? mapUserFromDB(newProfile) : null;
      }
      
      console.log('✅ [getCurrentUser] Profile found:', profile.id);
      return profile ? mapUserFromDB(profile) : null;
    } catch (error) {
      console.error('❌ [getCurrentUser] Unexpected error:', error);
      return null;
    }
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [onAuthStateChange] Event:', event, 'Session:', session ? `exists (user: ${session.user?.id})` : 'null');
      
      // Gérer les différents types d'événements
      if (event === 'TOKEN_REFRESHED') {
        console.log('ℹ️ [onAuthStateChange] Token refreshed, session still valid');
        // Ne pas appeler le callback pour éviter les rechargements inutiles
        return;
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('🚪 [onAuthStateChange] User signed out');
        callback(null);
        return;
      }
      
      if (session?.user) {
        console.log('✅ [onAuthStateChange] Session active, fetching user profile...');
        try {
          // Attendre un peu pour que la session soit bien établie
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const user = await this.getCurrentUser();
          if (user) {
            console.log('✅ [onAuthStateChange] User profile loaded:', user.id);
            callback(user);
          } else {
            console.warn('⚠️ [onAuthStateChange] Session exists but profile not found');
            callback(null);
          }
        } catch (error) {
          console.error('❌ [onAuthStateChange] Error fetching user:', error);
          callback(null);
        }
      } else {
        console.log('ℹ️ [onAuthStateChange] No active session');
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

