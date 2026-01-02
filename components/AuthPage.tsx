
import React, { useState } from 'react';
import { ChevronLeft, User, ShoppingBag, Mail, Lock, Phone, Store, ShieldCheck, Wrench, ArrowRight, Car, Eye, EyeOff } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { authService } from '../services/authService';
import Logo from './Logo';

interface AuthPageProps {
  onBack: () => void;
  onSuccess: (user: UserType) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onBack, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<'type' | 'form'>('type');
  const [role, setRole] = useState<UserRole>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    shopName: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 [AuthPage] Starting login process...');
      
      const { data, error: signInError } = await authService.signIn({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('❌ [AuthPage] SignIn error:', signInError);
        throw signInError;
      }

      console.log('✅ [AuthPage] SignIn successful, fetching user profile...');

      // Attendre un peu pour que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 300));

      // Récupérer le profil utilisateur avec retry si nécessaire
      let user = await authService.getCurrentUser();
      
      // Si user est null, réessayer après un court délai
      if (!user) {
        console.warn('⚠️ [AuthPage] getCurrentUser returned null, retrying...');
        await new Promise(resolve => setTimeout(resolve, 500));
        user = await authService.getCurrentUser();
      }
      
      console.log('📋 [AuthPage] getCurrentUser returned:', user ? 'user found' : 'null');
      
      if (user) {
        console.log('✅ [AuthPage] Login complete, calling onSuccess');
        onSuccess(user);
      } else {
        console.error('❌ [AuthPage] No user profile found after retries');
        throw new Error('Impossible de récupérer le profil utilisateur. Le compte existe mais le profil n\'est pas accessible.');
      }
    } catch (err: any) {
      console.error('❌ [AuthPage] Login error:', err);
      setError(err.message || 'Erreur lors de la connexion');
    } finally {
      console.log('🏁 [AuthPage] Login process finished, setting loading to false');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: role,
        phoneNumber: formData.phone || undefined,
        shopName: (role === 'seller' || role === 'mechanic') ? formData.shopName : undefined,
      });

      // Récupérer le profil utilisateur (déjà créé dans signUp)
      const user = await authService.getCurrentUser();
      if (user) {
        onSuccess(user);
      } else {
        // Si getCurrentUser retourne null, essayer avec le profil retourné par signUp
        if (result?.profile) {
          const mappedUser = {
            id: result.profile.id,
            name: result.profile.name,
            email: result.profile.email,
            role: result.profile.role,
            avatar: result.profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.profile.name)}&background=6366f1&color=fff`,
            shopName: result.profile.shop_name,
            phoneNumber: result.profile.phone_number,
            address: result.profile.address,
            isVerified: result.profile.is_verified || false,
            specialties: result.profile.specialties,
            rating: result.profile.rating,
            completedInspections: result.profile.completed_inspections,
            hourlyRate: result.profile.hourly_rate,
          };
          onSuccess(mappedUser as any);
        } else {
          throw new Error('Impossible de récupérer le profil utilisateur');
        }
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'inscription:', err);
      setError(err.message || 'Erreur lors de l\'inscription');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-[40vh] bg-indigo-600 -skew-y-6 origin-top-right -translate-y-20 z-0 overflow-hidden">
        <Car className="absolute bottom-10 right-10 w-64 h-64 text-white/10 -rotate-12" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-12 pb-10 max-w-lg mx-auto w-full">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={onBack} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 active:scale-90 transition-transform">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <Logo variant="white" size="lg" />
        </div>

        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            {mode === 'login' ? 'Bon retour !' : 'Rejoindre MƆ̆TTO'}
          </h1>
          <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-widest">
            {mode === 'login' ? 'Connectez-vous pour continuer' : 'Créez votre profil en 1 minute'}
          </p>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-900/10 p-8 border border-gray-50 flex-1 flex flex-col">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
              {error}
            </div>
          )}
          
          {mode === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-6 flex flex-col flex-1">
              <Input 
                label="Email" 
                icon={<Mail size={18}/>} 
                placeholder="votre@email.com" 
                type="email" 
                value={formData.email} 
                onChange={v => setFormData({...formData, email: v})} 
                required 
              />
              <div className="space-y-1">
                <Input 
                  label="Mot de passe" 
                  icon={<Lock size={18}/>} 
                  placeholder="••••••••" 
                  type="password" 
                  value={formData.password} 
                  onChange={v => setFormData({...formData, password: v})} 
                  required 
                />
                <button type="button" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Mot de passe oublié ?</button>
              </div>

              <div className="pt-4 mt-auto">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Connexion <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FLOW */
            registerStep === 'type' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Quel est votre profil ?</p>
                <RoleCard 
                  icon={<ShoppingBag size={24}/>}
                  title="Acheteur"
                  description="Trouvez votre futur véhicule."
                  onClick={() => { setRole('buyer'); setRegisterStep('form'); }}
                />
                <RoleCard 
                  icon={<Store size={24}/>}
                  title="Vendeur Pro"
                  description="Gérez votre stock et boostez vos ventes."
                  onClick={() => { setRole('seller'); setRegisterStep('form'); }}
                  featured
                />
                <RoleCard 
                  icon={<Wrench size={24}/>}
                  title="Expert Méca"
                  description="Sécurisez les achats et entretenez."
                  onClick={() => { setRole('mechanic'); setRegisterStep('form'); }}
                />
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                <button 
                  type="button" 
                  onClick={() => {
                    setRegisterStep('type');
                    setError(null);
                  }} 
                  className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1 mb-2"
                >
                  <ArrowRight size={12} className="rotate-180" /> Retour au choix du profil
                </button>
                
                <Input label="Nom complet" icon={<User size={18}/>} placeholder="Jean Marc" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                <Input label="Email" icon={<Mail size={18}/>} placeholder="jean@mail.com" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
                <Input label="Téléphone" icon={<Phone size={18}/>} placeholder="+225 07..." value={formData.phone} onChange={v => setFormData({...formData, phone: v})} required />
                <Input label="Mot de passe" icon={<Lock size={18}/>} placeholder="••••••••" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} required />
                <Input label="Confirmer le mot de passe" icon={<Lock size={18}/>} placeholder="••••••••" type="password" value={formData.confirmPassword} onChange={v => setFormData({...formData, confirmPassword: v})} required />
                
                {(role === 'seller' || role === 'mechanic') && (
                  <Input label={role === 'mechanic' ? "Nom de l'atelier" : "Nom de la boutique"} icon={<Store size={18}/>} placeholder="Expert Méca Pro" value={formData.shopName} onChange={v => setFormData({...formData, shopName: v})} required />
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Créer mon profil'}
                </button>
              </form>
            )
          )}

          {/* Footer Toggle */}
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">
              {mode === 'login' ? "Nouveau sur MƆ̆TTO ?" : "Déjà un compte ?"}
            </p>
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setRegisterStep('type');
                setError(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  password: '',
                  confirmPassword: '',
                  shopName: '',
                });
              }}
              className="mt-2 text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline"
            >
              {mode === 'login' ? "S'inscrire gratuitement" : "Se connecter maintenant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick: () => void, featured?: boolean }> = ({ icon, title, description, onClick, featured }) => (
  <button 
    onClick={onClick}
    className={`w-full p-5 rounded-[28px] border-2 text-left transition-all active:scale-95 flex items-center gap-5 group ${featured ? 'border-indigo-600 bg-indigo-50/20 shadow-lg' : 'border-gray-100 hover:border-indigo-100 hover:bg-gray-50/50'}`}
  >
    <div className={`p-4 rounded-2xl transition-colors ${featured ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 group-hover:text-indigo-600 shadow-sm border border-gray-50'}`}>
      {icon}
    </div>
    <div className="flex-1">
      <h3 className="font-black text-gray-900 text-sm">{title}</h3>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight group-hover:text-gray-500">{description}</p>
    </div>
    {featured ? (
      <ShieldCheck size={20} className="text-indigo-600" />
    ) : (
      <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
    )}
  </button>
);

const Input: React.FC<{ label: string, icon: React.ReactNode, value: string, onChange: (v: string) => void, placeholder?: string, type?: string, required?: boolean }> = ({ label, icon, value, onChange, placeholder, type = "text", required }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">{icon}</div>
        <input 
          type={inputType} 
          placeholder={placeholder} 
          required={required} 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${isPassword ? 'pl-12 pr-12' : 'pl-12 pr-4'} py-4 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold text-sm shadow-sm transition-all`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
