
import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Listing, ItemStatus, SellerType } from '../types';
import ListingCard from './ListingCard';

interface FeedProps {
  activeTab: string;
  listings: Listing[];
  loading?: boolean;
  onSelectListing: (listing: Listing) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

const Feed: React.FC<FeedProps> = ({ activeTab, listings, loading = false, onSelectListing, searchQuery, setSearchQuery, favorites, onToggleFavorite }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'all'>('all');
  const [filterSeller, setFilterSeller] = useState<SellerType | 'all'>('all');

  const filtered = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    const matchesSeller = filterSeller === 'all' || l.sellerType === filterSeller;
    return matchesSearch && matchesStatus && matchesSeller;
  });

  const isHomePage = activeTab === 'home';
  const boostedListings = filtered.filter(l => l.isBoosted);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Search and Filters - Responsive Width */}
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Chercher par modèle, ville ou mot-clé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-bold shadow-sm transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-100 p-6 rounded-[32px] space-y-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">État de l'article</h4>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="Tous" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
                <FilterChip label="Neuf" active={filterStatus === 'new'} onClick={() => setFilterStatus('new')} />
                <FilterChip label="Importé" active={filterStatus === 'imported'} onClick={() => setFilterStatus('imported')} />
                <FilterChip label="Occasion" active={filterStatus === 'used'} onClick={() => setFilterStatus('used')} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Type de vendeur</h4>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="Tous" active={filterSeller === 'all'} onClick={() => setFilterSeller('all')} />
                <FilterChip label="Professionnel" active={filterSeller === 'pro'} onClick={() => setFilterSeller('pro')} />
                <FilterChip label="Particulier" active={filterSeller === 'individual'} onClick={() => setFilterSeller('individual')} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Boosted Section */}
      {isHomePage && boostedListings.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest pl-1 flex items-center gap-3">
            <span className="w-10 h-[2px] bg-indigo-600 rounded-full"></span>
            🔥 Annonces Premium
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {boostedListings.map(listing => (
              <div key={listing.id} className="min-w-[300px] sm:min-w-[380px] flex-shrink-0">
                <ListingCard 
                  listing={listing} 
                  onClick={() => onSelectListing(listing)} 
                  boosted 
                  isFavorite={favorites.includes(listing.id)}
                  onToggleFavorite={() => onToggleFavorite(listing.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Grid Section - Responsive Columns */}
      <section className="space-y-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-3">
          <span className="w-10 h-[2px] bg-gray-200 rounded-full"></span>
          {isHomePage ? 'Dernières arrivées' : `Toutes les ${activeTab === 'cars' ? 'Voitures' : activeTab === 'motos' ? 'Motos' : 'Accessoires'}`}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full text-center py-32">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400 font-bold">Chargement des annonces...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(listing => (
              <div 
                key={listing.id} 
                className={listing.isBoosted ? "col-span-2 md:col-span-2 lg:col-span-2" : "col-span-1"}
              >
                <ListingCard 
                  listing={listing} 
                  onClick={() => onSelectListing(listing)} 
                  boosted={listing.isBoosted}
                  isFavorite={favorites.includes(listing.id)}
                  onToggleFavorite={() => onToggleFavorite(listing.id)}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-32 text-gray-400 italic bg-white rounded-[40px] border border-dashed border-gray-200 font-bold shadow-inner">
              Aucun résultat ne correspond à votre recherche
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const FilterChip: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-indigo-200 hover:bg-white'}`}
  >
    {label}
  </button>
);

export default Feed;
