
import React, { useState, useMemo, useEffect } from 'react';
import { Home, Car, Bike, Package, User as UserIcon, Bell, MessageCircle, Plus, Wrench } from 'lucide-react';
import { Listing, Category, User } from './types';
import { MOCK_LISTINGS, MOCK_MECHANICS } from './mockData';
import Feed from './components/Feed';
import MechanicFeed from './components/MechanicFeed';
import CreateListingModal from './components/CreateListingModal';
import Dashboard from './components/Dashboard';
import MechanicDashboard from './components/MechanicDashboard';
import ChatList from './components/ChatList';
import ListingDetails from './components/ListingDetails';
import NotificationList from './components/NotificationList';
import AuthPage from './components/AuthPage';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'cars' | 'motos' | 'mechanics' | 'accessories' | 'profile' | 'auth'>('home');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [mechanics] = useState<User[]>(MOCK_MECHANICS);
  const [showChats, setShowChats] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('motto_favs');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    const savedUser = localStorage.getItem('motto_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => localStorage.setItem('motto_favs', JSON.stringify(favorites)), [favorites]);
  useEffect(() => {
    if (currentUser) localStorage.setItem('motto_user', JSON.stringify(currentUser));
    else localStorage.removeItem('motto_user');
  }, [currentUser]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            l.location.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === 'home') return matchesSearch;
      if (activeTab === 'cars') return matchesSearch && l.category === Category.CAR;
      if (activeTab === 'motos') return matchesSearch && l.category === Category.MOTO;
      if (activeTab === 'accessories') return matchesSearch && l.category === Category.ACCESSORY;
      return matchesSearch;
    });
  }, [listings, searchQuery, activeTab]);

  const resetViews = () => {
    setShowChats(false);
    setShowNotifications(false);
    setSelectedListing(null);
  };

  const handleProfileClick = () => {
    resetViews();
    if (!currentUser) {
      setActiveTab('auth');
    } else {
      setActiveTab('profile');
    }
  };

  const handleActionRequiringAuth = (action: () => void) => {
    if (!currentUser) {
      resetViews();
      setActiveTab('auth');
    } else {
      action();
    }
  };

  // Masquer les barres de navigation pour les vues plein écran ou le dashboard PRO
  const isMechanicDashboard = activeTab === 'profile' && currentUser?.role === 'mechanic';
  const shouldHideNav = showNotifications || showChats || selectedListing !== null || activeTab === 'auth' || isMechanicDashboard;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden">
      {!shouldHideNav && (
        <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40 w-full shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div 
              className="cursor-pointer"
              onClick={() => { resetViews(); setActiveTab('home'); }}
            >
              <Logo size="md" />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6">
              <button onClick={() => { resetViews(); setShowNotifications(true); }} className={`relative p-2 rounded-full transition-all hover:bg-gray-50 ${showNotifications ? 'text-indigo-600' : 'text-gray-500'}`}>
                <Bell size={22} fill={showNotifications ? 'currentColor' : 'none'} />
                {!showNotifications && <span className="absolute top-1 right-1 bg-red-500 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white font-bold">2</span>}
              </button>
              <button onClick={() => handleActionRequiringAuth(() => { resetViews(); setShowChats(true); })} className={`p-2 rounded-full transition-all hover:bg-gray-50 ${showChats ? 'text-indigo-600' : 'text-gray-500'}`}>
                <MessageCircle size={22} fill={showChats ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleProfileClick} className={`p-1 rounded-full transition-all hover:ring-2 hover:ring-indigo-100 ${activeTab === 'profile' && !showNotifications && !showChats ? 'text-indigo-600' : 'text-gray-500'}`}>
                {currentUser ? (
                  <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-indigo-100 object-cover shadow-sm" alt="Profile" />
                ) : (
                  <div className="p-1"><UserIcon size={24} /></div>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 w-full max-w-6xl mx-auto ${!shouldHideNav ? 'pb-24 sm:pb-8' : ''}`}>
        <div className="h-full">
          {activeTab === 'auth' ? (
            <AuthPage 
              onBack={() => setActiveTab('home')} 
              onSuccess={(u) => {
                setCurrentUser(u);
                setActiveTab('profile');
              }} 
            />
          ) : showNotifications ? (
            <NotificationList onClose={() => setShowNotifications(false)} />
          ) : showChats ? (
            <ChatList onClose={() => setShowChats(false)} />
          ) : activeTab === 'profile' && currentUser ? (
            currentUser.role === 'mechanic' ? (
              <MechanicDashboard 
                user={currentUser} 
                onLogout={() => {setCurrentUser(null); setActiveTab('home');}} 
                onExit={() => setActiveTab('home')}
              />
            ) : (
              <Dashboard user={currentUser} listings={listings} onBoost={(id) => setListings(prev => prev.map(l => l.id === id ? {...l, isBoosted: true} : l))} favorites={favorites} onToggleFavorite={toggleFavorite} onSelectListing={setSelectedListing} onLogout={() => {setCurrentUser(null); setActiveTab('home');}} />
            )
          ) : selectedListing ? (
            <ListingDetails 
              listing={selectedListing} 
              onBack={() => setSelectedListing(null)} 
              onMessage={() => handleActionRequiringAuth(() => { resetViews(); setShowChats(true); })} 
              isFavorite={favorites.includes(selectedListing.id)} 
              onToggleFavorite={() => toggleFavorite(selectedListing.id)} 
              currentUser={currentUser} 
              mechanics={mechanics} 
              listings={listings}
              onSelectListing={setSelectedListing}
            />
          ) : activeTab === 'mechanics' ? (
            <MechanicFeed mechanics={mechanics} onContact={(m) => handleActionRequiringAuth(() => { resetViews(); setShowChats(true); })} />
          ) : (
            <Feed activeTab={activeTab} listings={filteredListings} onSelectListing={setSelectedListing} searchQuery={searchQuery} setSearchQuery={setSearchQuery} favorites={favorites} onToggleFavorite={toggleFavorite} />
          )}
        </div>
      </main>

      {!shouldHideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 safe-bottom z-50">
          <div className="max-w-md mx-auto flex items-center justify-around px-2 py-3">
            <NavButton active={activeTab === 'home'} onClick={() => { resetViews(); setActiveTab('home'); }} icon={<Home size={22} />} label="Accueil" />
            <NavButton active={activeTab === 'cars'} onClick={() => { resetViews(); setActiveTab('cars'); }} icon={<Car size={22} />} label="Voitures" />
            
            {activeTab === 'mechanics' ? (
              <NavButton active={true} onClick={() => { resetViews(); setActiveTab('mechanics'); }} icon={<Wrench size={22} />} label="Pros" />
            ) : currentUser?.role === 'seller' ? (
              <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 text-white rounded-full p-4 -mt-12 shadow-xl border-4 border-white active:scale-95 transition-transform hover:bg-indigo-700">
                <Plus size={24} strokeWidth={3} />
              </button>
            ) : (
              <NavButton active={activeTab === 'mechanics'} onClick={() => { resetViews(); setActiveTab('mechanics'); }} icon={<Wrench size={22} />} label="Experts" />
            )}

            <NavButton active={activeTab === 'motos'} onClick={() => { resetViews(); setActiveTab('motos'); }} icon={<Bike size={22} />} label="Motos" />
            <NavButton active={activeTab === 'accessories'} onClick={() => { resetViews(); setActiveTab('accessories'); }} icon={<Package size={22} />} label="Acc." />
          </div>
        </nav>
      )}

      {showCreateModal && <CreateListingModal onClose={() => setShowCreateModal(false)} onSubmit={(nl) => setListings([nl, ...listings])} />}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactElement, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${active ? 'text-indigo-600 scale-105' : 'text-gray-600 hover:text-gray-900'}`}>
    {React.cloneElement(icon, { fill: active ? 'currentColor' : 'none', strokeWidth: active ? 2.5 : 2.2 })}
    <span className={`text-[10px] uppercase tracking-wider ${active ? 'font-black' : 'font-bold'}`}>{label}</span>
  </button>
);

export default App;
