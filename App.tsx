
import React, { useState, useMemo, useEffect } from 'react';
import { Home, Car, Bike, Package, User as UserIcon, Bell, MessageCircle, Plus, Wrench } from 'lucide-react';
import { Listing, Category, User } from './types';
import { MOCK_MECHANICS } from './mockData';
import { authService } from './services/authService';
import { listingService } from './services/listingService';
import { favoriteService } from './services/favoriteService';
import { chatService } from './services/chatService';
import { notificationService } from './services/notificationService';
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [mechanics] = useState<User[]>(MOCK_MECHANICS);
  const [showChats, setShowChats] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Charger l'utilisateur et les listings depuis Supabase au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // Charger les favoris de l'utilisateur
          try {
            const favs = await favoriteService.getByUser(user.id);
            setFavorites(favs);
          } catch (error) {
            console.error('Erreur lors du chargement des favoris:', error);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur:', error);
      }
    };

    loadUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Charger les favoris de l'utilisateur
        try {
          const favs = await favoriteService.getByUser(user.id);
          setFavorites(favs);
        } catch (error) {
          console.error('Erreur lors du chargement des favoris:', error);
        }
        
        // Charger le compteur de notifications non lues
        try {
          const count = await notificationService.getUnreadCount(user.id);
          setUnreadNotificationsCount(count);
        } catch (error) {
          console.error('Erreur lors du chargement des notifications:', error);
        }

        // S'abonner aux nouvelles notifications
        const notifSubscription = notificationService.subscribeToNotifications(user.id, async () => {
          const count = await notificationService.getUnreadCount(user.id);
          setUnreadNotificationsCount(count);
        });

        return () => {
          notifSubscription.unsubscribe();
        };
      } else {
        // Si l'utilisateur se déconnecte, nettoyer les favoris
        setFavorites([]);
        setUnreadNotificationsCount(0);
        localStorage.removeItem('motto_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleFavorite = async (id: string) => {
    if (!currentUser) {
      // Si pas connecté, rediriger vers la page d'authentification
      setActiveTab('auth');
      return;
    }

    const isCurrentlyFavorite = favorites.includes(id);
    
    try {
      if (isCurrentlyFavorite) {
        await favoriteService.remove(currentUser.id, id);
        setFavorites(prev => prev.filter(fid => fid !== id));
      } else {
        await favoriteService.add(currentUser.id, id);
        setFavorites(prev => [...prev, id]);
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
      // Revert en cas d'erreur
      if (isCurrentlyFavorite) {
        setFavorites(prev => [...prev, id]);
      } else {
        setFavorites(prev => prev.filter(fid => fid !== id));
      }
    }
  };

  // Charger et recharger les listings quand l'onglet ou la recherche change
  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoadingListings(true);
        let category: Category | undefined;
        
        if (activeTab === 'cars') category = Category.CAR;
        else if (activeTab === 'motos') category = Category.MOTO;
        else if (activeTab === 'accessories') category = Category.ACCESSORY;
        
        const loadedListings = await listingService.getAll({
          category,
          searchQuery: searchQuery || undefined,
        });
        setListings(loadedListings);
      } catch (error) {
        console.error('Erreur lors du chargement des annonces:', error);
        setListings([]);
      } finally {
        setLoadingListings(false);
      }
    };

    loadListings();
  }, [activeTab, searchQuery]);

  const filteredListings = useMemo(() => {
    // Si on charge depuis Supabase, on a déjà les filtres appliqués
    // Mais on peut encore filtrer localement pour le searchQuery si besoin
    return listings.filter(l => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return l.title.toLowerCase().includes(query) || 
             l.location.toLowerCase().includes(query) ||
             l.description.toLowerCase().includes(query);
    });
  }, [listings, searchQuery]);

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
                {!showNotifications && unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-[10px] text-white rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white font-bold px-1">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
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
            <NotificationList onClose={() => setShowNotifications(false)} currentUser={currentUser} />
          ) : showChats ? (
            <ChatList onClose={() => setShowChats(false)} currentUser={currentUser} />
          ) : selectedListing ? (
            <ListingDetails 
              listing={selectedListing} 
              onBack={() => setSelectedListing(null)} 
              onMessage={async () => {
                if (!currentUser) {
                  setActiveTab('auth');
                  return;
                }
                try {
                  // Créer ou récupérer un chat avec le vendeur
                  const existingChats = await chatService.getByParticipant(currentUser.id);
                  let chat = existingChats.find(c => 
                    c.participants.includes(selectedListing.sellerId) && 
                    c.listingId === selectedListing.id
                  );
                  
                  if (!chat) {
                    chat = await chatService.create({
                      participantIds: [currentUser.id, selectedListing.sellerId],
                      listingId: selectedListing.id,
                    });
                  }
                  
                  resetViews();
                  setShowChats(true);
                } catch (error) {
                  console.error('Erreur lors de la création du chat:', error);
                  alert('Erreur lors de la création de la conversation');
                }
              }}
              isFavorite={favorites.includes(selectedListing.id)} 
              onToggleFavorite={() => toggleFavorite(selectedListing.id)} 
              currentUser={currentUser} 
              mechanics={mechanics} 
              listings={listings}
              onSelectListing={setSelectedListing}
            />
          ) : activeTab === 'profile' && currentUser ? (
            currentUser.role === 'mechanic' ? (
              <MechanicDashboard 
                user={currentUser} 
                onLogout={async () => {
                  try {
                    console.log('🔄 [App] Logout initiated (mechanic)');
                    // Effectuer la déconnexion
                    await authService.signOut();
                    // Attendre un peu pour que l'événement onAuthStateChange se déclenche
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Nettoyer l'état local après déconnexion réussie
                    setCurrentUser(null);
                    setActiveTab('home');
                    resetViews();
                    setFavorites([]);
                    setUnreadNotificationsCount(0);
                    console.log('✅ [App] Logout complete (mechanic)');
                  } catch (error) {
                    console.error('❌ [App] Erreur lors de la déconnexion:', error);
                    // Nettoyer quand même l'état local même en cas d'erreur
                    setCurrentUser(null);
                    setActiveTab('home');
                    resetViews();
                    setFavorites([]);
                    setUnreadNotificationsCount(0);
                  }
                }} 
                onExit={() => setActiveTab('home')}
              />
            ) : (
              <Dashboard user={currentUser} listings={listings} onBoost={async (id) => {
                try {
                  const boosted = await listingService.boost(id);
                  setListings(prev => prev.map(l => l.id === id ? boosted : l));
                } catch (error) {
                  console.error('Erreur lors du boost:', error);
                }
              }} favorites={favorites} onToggleFavorite={toggleFavorite} onSelectListing={setSelectedListing} onListingUpdate={async () => {
                try {
                  // Recharger les listings après modification
                  let category: Category | undefined;
                  if (activeTab === 'cars') category = Category.CAR;
                  else if (activeTab === 'motos') category = Category.MOTO;
                  else if (activeTab === 'accessories') category = Category.ACCESSORY;
                  const loadedListings = await listingService.getAll({
                    category,
                    searchQuery: searchQuery || undefined,
                  });
                  setListings(loadedListings);
                } catch (error) {
                  console.error('Erreur lors du rechargement des listings:', error);
                }
              }} onLogout={async () => {
                  try {
                    console.log('🔄 [App] Logout initiated');
                    // Effectuer la déconnexion
                    await authService.signOut();
                    // Attendre un peu pour que l'événement onAuthStateChange se déclenche
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Nettoyer l'état local après déconnexion réussie
                    setCurrentUser(null);
                    setActiveTab('home');
                    resetViews();
                    setFavorites([]);
                    setUnreadNotificationsCount(0);
                    console.log('✅ [App] Logout complete');
                  } catch (error) {
                    console.error('❌ [App] Erreur lors de la déconnexion:', error);
                    // Nettoyer quand même l'état local même en cas d'erreur
                    setCurrentUser(null);
                    setActiveTab('home');
                    resetViews();
                    setFavorites([]);
                    setUnreadNotificationsCount(0);
                  }
                }} />
            )
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

      {showCreateModal && <CreateListingModal 
        onClose={() => setShowCreateModal(false)} 
        onSubmit={async (nl) => {
          try {
            // Si c'est une nouvelle annonce créée (avec un ID), l'ajouter à la liste
            if (nl.id) {
              setListings([nl, ...listings]);
            } else {
              // Recharger toutes les annonces depuis Supabase
              const allListings = await listingService.getAll();
              setListings(allListings);
            }
          } catch (error) {
            console.error('Erreur lors de la création de l\'annonce:', error);
          }
        }} 
        currentUser={currentUser}
      />}
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
