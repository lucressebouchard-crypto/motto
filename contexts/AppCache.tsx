import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Listing, Chat } from '../types';

interface AppCacheContextType {
  // Listings cache
  listings: Listing[];
  setListings: (listings: Listing[]) => void;
  getListings: () => Listing[];
  updateListing: (listing: Listing) => void;
  
  // Chats cache
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  getChats: () => Chat[];
  updateChat: (chat: Chat) => void;
  
  // Users cache
  users: Record<string, User>;
  setUser: (userId: string, user: User) => void;
  getUser: (userId: string) => User | undefined;
  
  // Clear cache
  clearCache: () => void;
}

const AppCacheContext = createContext<AppCacheContextType | undefined>(undefined);

export const useAppCache = () => {
  const context = useContext(AppCacheContext);
  if (!context) {
    throw new Error('useAppCache must be used within AppCacheProvider');
  }
  return context;
};

interface AppCacheProviderProps {
  children: ReactNode;
}

export const AppCacheProvider: React.FC<AppCacheProviderProps> = ({ children }) => {
  const [listings, setListingsState] = useState<Listing[]>([]);
  const [chats, setChatsState] = useState<Chat[]>([]);
  const [users, setUsersState] = useState<Record<string, User>>({});
  
  // Utiliser des refs pour éviter les re-renders
  const listingsRef = useRef<Listing[]>([]);
  const chatsRef = useRef<Chat[]>([]);
  const usersRef = useRef<Record<string, User>>({});

  const setListings = useCallback((newListings: Listing[]) => {
    listingsRef.current = newListings;
    setListingsState(newListings);
  }, []);

  const getListings = useCallback(() => {
    return listingsRef.current;
  }, []);

  const updateListing = useCallback((listing: Listing) => {
    const current = listingsRef.current;
    const index = current.findIndex(l => l.id === listing.id);
    if (index >= 0) {
      current[index] = listing;
      setListingsState([...current]);
    } else {
      setListingsState([listing, ...current]);
    }
    listingsRef.current = listingsRef.current;
  }, []);

  const setChats = useCallback((newChats: Chat[]) => {
    chatsRef.current = newChats;
    setChatsState(newChats);
  }, []);

  const getChats = useCallback(() => {
    return chatsRef.current;
  }, []);

  const updateChat = useCallback((chat: Chat) => {
    const current = chatsRef.current;
    const index = current.findIndex(c => c.id === chat.id);
    if (index >= 0) {
      current[index] = chat;
      setChatsState([...current]);
    } else {
      setChatsState([...current, chat]);
    }
    chatsRef.current = chatsRef.current;
  }, []);

  const setUser = useCallback((userId: string, user: User) => {
    usersRef.current[userId] = user;
    setUsersState({ ...usersRef.current });
  }, []);

  const getUser = useCallback((userId: string) => {
    return usersRef.current[userId];
  }, []);

  const clearCache = useCallback(() => {
    listingsRef.current = [];
    chatsRef.current = [];
    usersRef.current = {};
    setListingsState([]);
    setChatsState([]);
    setUsersState({});
  }, []);

  const value: AppCacheContextType = {
    listings,
    setListings,
    getListings,
    updateListing,
    chats,
    setChats,
    getChats,
    updateChat,
    users,
    setUser,
    getUser,
    clearCache,
  };

  return (
    <AppCacheContext.Provider value={value}>
      {children}
    </AppCacheContext.Provider>
  );
};

