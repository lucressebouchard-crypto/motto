
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Home, Car, Bike, Package, User as UserIcon, Bell, MessageCircle, Plus, Wrench } from 'lucide-react';
import { Listing, Category, User } from './types';
import { MOCK_MECHANICS } from './mockData';
import { authService } from './services/authService';
import { listingService } from './services/listingService';
import { favoriteService } from './services/favoriteService';
import { chatService } from './services/chatService';
import { notificationService } from './services/notificationService';
import { AppCacheProvider, useAppCache } from './contexts/AppCache';
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

const AppContent: React.FC = () => {
  const { listings: cachedListings, setListings: setCachedListings, clearCache } = useAppCache();
  const [activeTab, setActiveTab] = useState<'home' | 'cars' | 'motos' | 'mechanics' | 'accessories' | 'profile' | 'auth'>('home');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>(cachedListings); // Utiliser le cache
  const [loadingListings, setLoadingListings] = useState(cachedListings.length === 0); // Ne charger que si cache vide
  const [mechanics] = useState<User[]>(MOCK_MECHANICS);
  const [showChats, setShowChats] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [returnToChat, setReturnToChat] = useState(false); // Pour savoir si on doit retourner au chat
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null); // ID du chat sélectionné pour y revenir

  // Stocker les références aux abonnements pour pouvoir les nettoyer
  const notificationSubscriptionRef = React.useRef<{ unsubscribe: () => void } | null>(null);
  const authSubscriptionRef = React.useRef<{ unsubscribe: () => void } | null>(null);

  // Charger l'utilisateur et les listings depuis Supabase au démarrage
  useEffect(() => {
    let isMounted = true;
    let initTimeout: NodeJS.Timeout;

    const loadUser = async () => {
      try {
        console.log('🔄 [App] Restoring session on mount...');
        
        // Attendre un peu pour que Supabase restaure la session depuis localStorage
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const user = await authService.getCurrentUser();
        if (user && isMounted) {
          console.log('✅ [App] Session restored, user:', user.id);
          setCurrentUser(user);
          
          // Charger les favoris de l'utilisateur
          try {
            const favs = await favoriteService.getByUser(user.id);
            if (isMounted) {
              setFavorites(favs);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des favoris:', error);
          }
          
          // Charger le compteur de notifications
          try {
            const notifCount = await notificationService.getUnreadCount(user.id);
            if (isMounted) {
              setUnreadNotificationsCount(notifCount);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des notifications:', error);
          }
          
          // Charger le compteur de messages
          try {
            const msgCount = await chatService.getTotalUnreadCount(user.id);
            if (isMounted) {
              setUnreadMessagesCount(msgCount);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des messages:', error);
          }
        } else {
          console.log('ℹ️ [App] No active session found');
        }
      } catch (error) {
        console.error('❌ [App] Erreur lors du chargement de l\'utilisateur:', error);
      }
    };

    // Lancer le chargement après un court délai pour laisser Supabase restaurer la session
    initTimeout = setTimeout(() => {
      loadUser();
    }, 100);

    return () => {
      isMounted = false;
      if (initTimeout) clearTimeout(initTimeout);
    };

    // Écouter les changements d'authentification
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      if (!isMounted) return;

      // Nettoyer l'abonnement aux notifications précédent
      if (notificationSubscriptionRef.current) {
        notificationSubscriptionRef.current.unsubscribe();
        notificationSubscriptionRef.current = null;
      }

      setCurrentUser(user);
      
      if (user) {
        // Charger les favoris de l'utilisateur
        try {
          const favs = await favoriteService.getByUser(user.id);
          if (isMounted) {
            setFavorites(favs);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des favoris:', error);
        }
        
        // Charger le compteur de notifications non lues
        try {
          const count = await notificationService.getUnreadCount(user.id);
          if (isMounted) {
            setUnreadNotificationsCount(count);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des notifications:', error);
        }

        // Charger le compteur de messages non lus
        try {
          const chatCount = await chatService.getTotalUnreadCount(user.id);
          if (isMounted) {
            setUnreadMessagesCount(chatCount);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des messages non lus:', error);
        }

        // S'abonner aux changements de compteurs de messages en temps réel
        // (géré dans ChatList, mais on peut aussi le faire ici pour le badge global)

        // S'abonner aux nouvelles notifications
        const notifSubscription = notificationService.subscribeToNotifications(user.id, async () => {
          if (!isMounted) return;
          try {
            const count = await notificationService.getUnreadCount(user.id);
            if (isMounted) {
              setUnreadNotificationsCount(count);
            }
          } catch (error) {
            console.error('Erreur lors de la mise à jour du compteur de notifications:', error);
          }
        });
        
        notificationSubscriptionRef.current = notifSubscription;
      } else {
        // Si l'utilisateur se déconnecte, nettoyer les favoris et le cache
        setFavorites([]);
        setUnreadNotificationsCount(0);
        setUnreadMessagesCount(0);
        clearCache(); // Nettoyer le cache à la déconnexion
        localStorage.removeItem('motto_user');
      }
    });

    authSubscriptionRef.current = subscription;

    return () => {
      isMounted = false;
      // Nettoyer tous les abonnements
      if (notificationSubscriptionRef.current) {
        notificationSubscriptionRef.current.unsubscribe();
        notificationSubscriptionRef.current = null;
      }
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
    };
  }, []);

  // Verrou pour éviter les appels multiples simultanés à toggleFavorite
  const favoriteLockRef = React.useRef<Set<string>>(new Set());

  const toggleFavorite = async (id: string) => {
    if (!currentUser) {
      // Si pas connecté, rediriger vers la page d'authentification
      setActiveTab('auth');
      return;
    }

    // Vérifier si cette opération est déjà en cours
    if (favoriteLockRef.current.has(id)) {
      console.log('⏳ [toggleFavorite] Opération déjà en cours pour:', id);
      return;
    }

    // Vérifier la session avant de continuer
    const session = await authService.getSession();
    if (!session) {
      console.warn('⚠️ [toggleFavorite] Aucune session active');
      setActiveTab('auth');
      return;
    }

    // Ajouter au verrou
    favoriteLockRef.current.add(id);

    const isCurrentlyFavorite = favorites.includes(id);
    const previousFavorites = [...favorites];
    
    try {
      // Mise à jour optimiste de l'UI
      if (isCurrentlyFavorite) {
        setFavorites(prev => prev.filter(fid => fid !== id));
        await favoriteService.remove(currentUser.id, id);
      } else {
        setFavorites(prev => [...prev, id]);
        await favoriteService.add(currentUser.id, id);
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
      // Revert en cas d'erreur
      setFavorites(previousFavorites);
    } finally {
      // Retirer du verrou
      favoriteLockRef.current.delete(id);
    }
  };

  // Refs pour éviter les rechargements inutiles
  const listingsLoadedRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingRef = useRef(false);

  // Charger et recharger les listings quand l'onglet ou la recherche change
  useEffect(() => {
    const loadListings = async () => {
      // Éviter les chargements simultanés
      if (loadingRef.current) return;

      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      const CACHE_DURATION = 15000; // 15 secondes de cache

      // Si les listings sont déjà chargés et récents, ne filtrer que localement
      if (listingsLoadedRef.current && timeSinceLastLoad < CACHE_DURATION && cachedListings.length > 0) {
        let category: Category | undefined;
        if (activeTab === 'cars') category = Category.CAR;
        else if (activeTab === 'motos') category = Category.MOTO;
        else if (activeTab === 'accessories') category = Category.ACCESSORY;
        
        // Filtrer localement si possible
        let filtered = cachedListings;
        if (category) {
          filtered = cachedListings.filter(l => l.category === category);
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(l => 
            l.title.toLowerCase().includes(query) || 
            l.location.toLowerCase().includes(query) ||
            l.description.toLowerCase().includes(query)
          );
        }
        setListings(filtered);
        setLoadingListings(false);
        return;
      }

      loadingRef.current = true;
      setLoadingListings(true);

      try {
        let category: Category | undefined;
        
        if (activeTab === 'cars') category = Category.CAR;
        else if (activeTab === 'motos') category = Category.MOTO;
        else if (activeTab === 'accessories') category = Category.ACCESSORY;
        
        const loadedListings = await listingService.getAll({
          category,
          searchQuery: searchQuery || undefined,
        });
        
        // Mettre à jour le cache
        setCachedListings(loadedListings);
        setListings(loadedListings);
        listingsLoadedRef.current = true;
        lastLoadTimeRef.current = Date.now();
      } catch (error) {
        console.error('Erreur lors du chargement des annonces:', error);
        setListings([]);
      } finally {
        setLoadingListings(false);
        loadingRef.current = false;
      }
    };

    loadListings();
  }, [activeTab, searchQuery, cachedListings, setCachedListings]);

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

  // Verrou pour éviter les appels multiples simultanés de logout
  const logoutLockRef = React.useRef(false);

  const resetViews = () => {
    setShowChats(false);
    setShowNotifications(false);
    setSelectedListing(null);
    setReturnToChat(false);
    setSelectedChatId(null);
  };

  // Fonction centralisée pour le logout
  const handleLogout = React.useCallback(async () => {
    if (logoutLockRef.current) {
      console.log('⏳ [handleLogout] Logout déjà en cours...');
      return;
    }

    logoutLockRef.current = true;
    console.log('🔄 [handleLogout] Logout initiated');

    try {
      // Effectuer la déconnexion
      await authService.signOut();
      // Attendre un peu pour que l'événement onAuthStateChange se déclenche
      await new Promise(resolve => setTimeout(resolve, 300));
      // Nettoyer l'état local après déconnexion réussie
      setCurrentUser(null);
      setActiveTab('home');
      resetViews();
      setFavorites([]);
      setUnreadNotificationsCount(0);
      console.log('✅ [handleLogout] Logout complete');
    } catch (error) {
      console.error('❌ [handleLogout] Erreur lors de la déconnexion:', error);
      // Nettoyer quand même l'état local même en cas d'erreur
      setCurrentUser(null);
      setActiveTab('home');
      resetViews();
      setFavorites([]);
      setUnreadNotificationsCount(0);
    } finally {
      logoutLockRef.current = false;
    }
  }, []);

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
              <button onClick={() => handleActionRequiringAuth(() => { resetViews(); setShowChats(true); })} className={`relative p-2 rounded-full transition-all hover:bg-gray-50 ${showChats ? 'text-indigo-600' : 'text-gray-500'}`}>
                <MessageCircle size={22} fill={showChats ? 'currentColor' : 'none'} />
                {!showChats && unreadMessagesCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-[10px] text-white rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white font-bold px-1">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
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
            <ChatList 
              onClose={() => {
                setShowChats(false);
                setSelectedChatId(null); // Réinitialiser le chat sélectionné
              }}
              currentUser={currentUser}
              selectedChatId={selectedChatId}
              onChatSelected={(chatId) => setSelectedChatId(chatId)}
              onSelectListing={(listing) => {
                setReturnToChat(true); // Marquer qu'on vient du chat
                setSelectedListing(listing);
                setShowChats(false);
              }}
              onUnreadCountChange={(count) => {
                console.log('🔔 [App] Unread count changed:', count);
                setUnreadMessagesCount(count);
              }}
            />
          ) : selectedListing ? (
            <ListingDetails 
              listing={selectedListing} 
              onBack={() => {
                if (returnToChat) {
                  setReturnToChat(false);
                  setSelectedListing(null);
                  setShowChats(true);
                  // Le chat sélectionné sera restauré via selectedChatId dans ChatList
                } else {
                  setSelectedListing(null);
                  setSelectedChatId(null); // Nettoyer aussi le chat sélectionné
                }
              }}
              onOpenChat={(chatId) => {
                // Ouvrir directement le chat spécifique
                setSelectedChatId(chatId);
                setReturnToChat(true);
                setSelectedListing(null);
                setShowChats(true);
              }}
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
                onLogout={handleLogout} 
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
                  // Mettre à jour le cache aussi
                  setCachedListings(loadedListings);
                  setListings(loadedListings);
                  lastLoadTimeRef.current = Date.now();
                } catch (error) {
                  console.error('Erreur lors du rechargement des listings:', error);
                }
              }} onLogout={handleLogout} />
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

const App: React.FC = () => {
  return (
    <AppCacheProvider>
      <AppContent />
    </AppCacheProvider>
  );
};

export default App;
