
import React, { useState } from 'react';
import { Settings, LogOut, TrendingUp, ShoppingBag, Eye, Heart, BarChart3, Rocket, Store, ShieldCheck, X, AlertCircle, CheckCircle } from 'lucide-react';
import { User, Listing } from '../types';
import ListingCard from './ListingCard';

interface DashboardProps {
  user: User;
  listings: Listing[];
  onBoost: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectListing: (listing: Listing) => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, listings, onBoost, favorites, onToggleFavorite, onSelectListing, onLogout }) => {
  const [view, setView] = useState<'sales' | 'favorites'>('sales');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [boostingId, setBoostingId] = useState<string | null>(null);

  const mySales = listings.filter(l => l.sellerId === user.id);
  const myFavorites = listings.filter(l => favorites.includes(l.id));

  const handleBoost = async (id: string) => {
    setBoostingId(id);
    // Simulation d'effet de chargement/célébration
    await new Promise(r => setTimeout(r, 1500));
    onBoost(id);
    setBoostingId(null);
  };

  return (
    <div className="min-h-full pb-20 bg-gray-50/50">
      {/* Profile Header */}
      <div className="bg-white p-8 sm:p-12 lg:p-16 border-b border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -mr-32 -mt-32 opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full -ml-32 -mb-32 opacity-30 blur-3xl" />
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="relative group">
            <img src={user.avatar} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-2xl object-cover" alt="Avatar" />
            {user.isVerified && (
              <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1.5 rounded-full border-4 border-white shadow-lg">
                <ShieldCheck size={18} />
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {user.role === 'seller' ? user.shopName || user.name : user.name}
            </h2>
            <div className="flex justify-center mt-3">
              <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-50 px-5 py-2 rounded-full border border-indigo-100">
                {user.role === 'seller' ? 'VENDEUR PROFESSIONNEL' : 'UTILISATEUR'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 w-full max-w-3xl">
            <StatsBox icon={<Eye size={20}/>} label="Vues totales" value="2,482" color="text-blue-500" />
            <StatsBox icon={<Heart size={20}/>} label="Favoris reçus" value={favorites.length.toString()} color="text-red-500" />
            <StatsBox icon={<TrendingUp size={20}/>} label="Croissance" value="+12.4%" color="text-green-500" />
          </div>
        </div>
      </div>

      <div className="px-6 max-w-2xl mx-auto -mt-8 relative z-20">
        <div className="bg-white rounded-[32px] shadow-2xl p-2 flex border border-indigo-50/50">
          <button 
            onClick={() => setView('sales')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${view === 'sales' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ShoppingBag size={18} /> {user.role === 'seller' ? 'Mes Annonces' : 'Mon Activité'}
          </button>
          <button 
            onClick={() => setView('favorites')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${view === 'favorites' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Heart size={18} fill={view === 'favorites' ? 'currentColor' : 'none'} /> Favoris
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-10">
        {view === 'sales' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Inventaire ({mySales.length})</h3>
              <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                Voir tout <BarChart3 size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySales.map(listing => (
                <div key={listing.id} className="bg-white border border-gray-100 rounded-[32px] p-4 flex gap-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 overflow-hidden rounded-[24px]">
                    <img src={listing.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    {listing.isBoosted && <div className="absolute top-1 right-1 bg-indigo-600 p-1 rounded-full text-white shadow-sm animate-pulse"><Rocket size={10} /></div>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-black text-gray-900 truncate text-base">{listing.title}</h4>
                      <p className="text-indigo-600 font-black text-base mt-1">{listing.price.toLocaleString()} FCFA</p>
                    </div>
                    <div className="flex gap-3">
                      {!listing.isBoosted && (
                        <button 
                          onClick={() => handleBoost(listing.id)} 
                          disabled={boostingId === listing.id}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 transition-all ${boostingId === listing.id ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        >
                          {boostingId === listing.id ? (
                             <><BarChart3 size={14} className="animate-spin" /> Activation...</>
                          ) : (
                             <><Rocket size={14} /> Booster l'annonce</>
                          )}
                        </button>
                      )}
                      {listing.isBoosted && (
                        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 border border-green-100">
                          <CheckCircle size={14} /> Visibilité Max
                        </div>
                      )}
                      <button className="text-gray-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-gray-100 hover:bg-gray-50">Modifier</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {myFavorites.length > 0 ? myFavorites.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => onSelectListing(l)} isFavorite onToggleFavorite={() => onToggleFavorite(l.id)} />
            )) : (
              <div className="col-span-full text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 italic text-sm font-bold">Vous n'avez pas encore de favoris.</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-10 border-t border-gray-100 flex flex-col items-center gap-6">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-colors">
              <Settings size={18} /> Paramètres
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-red-50 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} /> Déconnexion
            </button>
          </div>
          <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.3em]">MƆ̆TTO marketplace v2.0</p>
        </div>
      </div>

      {/* Logout Confirmation Dialog - REFINED */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowLogoutConfirm(false)} />
          <div className="bg-white w-full max-w-sm rounded-[40px] z-10 p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Déconnexion</h2>
            <p className="text-gray-500 font-medium leading-relaxed mb-8 px-4">Êtes-vous sûr de vouloir vous déconnecter de votre compte MƆ̆TTO ?</p>
            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={onLogout}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-100 active:scale-95 transition-all"
              >
                Oui, me déconnecter
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full bg-gray-50 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatsBox: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white border border-gray-50 rounded-3xl p-6 flex flex-col items-center shadow-lg hover:shadow-xl transition-shadow">
    <div className={`${color} mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100/50`}>{icon}</div>
    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-center">{label}</span>
    <span className="text-xl font-black text-gray-900">{value}</span>
  </div>
);

export default Dashboard;
