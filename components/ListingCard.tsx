
import React from 'react';
import { Calendar, MapPin, ShieldCheck, Star, Heart } from 'lucide-react';
import { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  boosted?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const formatFCFA = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
};

const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick, boosted, isFavorite, onToggleFavorite }) => {
  const isNew = listing.status === 'new';
  const statusLabels = { new: 'Neuf', used: 'Occasion', imported: 'Venu (Importé)' };
  
  const badgeColors = { 
    new: 'bg-green-600', 
    used: 'bg-orange-500', 
    imported: 'bg-blue-600' 
  };

  return (
    <div 
      onClick={onClick}
      className={`group bg-white rounded-3xl overflow-hidden shadow-sm border transition-all duration-500 cursor-pointer relative h-full flex flex-col ${boosted ? 'border-indigo-100 ring-4 ring-indigo-500/5 shadow-indigo-100 hover:shadow-indigo-200' : 'border-gray-100 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1'}`}
    >
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); filter: brightness(1.2); }
        }
        .animate-blink {
          animation: blink 1.2s infinite ease-in-out;
        }
      `}</style>
      
      <div className={`relative overflow-hidden shrink-0 ${boosted ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        <img 
          src={listing.images[0]} 
          alt={listing.title} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
        />
        
        {/* Responsive Badges Container */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {boosted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-white shadow-xl bg-indigo-600">
              <ShieldCheck size={12} strokeWidth={3} />
              VENDEUR PRO
            </div>
          )}
          
          {boosted && listing.status !== 'new' && (
            <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-white shadow-xl w-fit ${badgeColors[listing.status]}`}>
              {statusLabels[listing.status]}
            </div>
          )}

          {boosted && isNew && (
            <div className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-white shadow-xl w-fit bg-green-600">
              BOUTIQUE NEUF
            </div>
          )}
        </div>

        {boosted && (
          <div className="absolute top-3 right-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-black px-4 py-2 rounded-xl shadow-2xl z-10 uppercase tracking-[0.1em] animate-blink border border-white/20">
            TOP ANNONCE
          </div>
        )}

        {/* Quick Favorite Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all active:scale-75 z-20 ${isFavorite ? 'bg-red-500 text-white shadow-red-200' : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'}`}
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      <div className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col space-y-3 sm:space-y-4">
        <h3 className={`font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 ${boosted ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
          {listing.title}
        </h3>
        
        {/* Price - Prominent */}
        <div className="py-2">
          <p className={`text-indigo-600 font-black tracking-tight ${boosted ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
            {formatFCFA(listing.price)}
          </p>
        </div>
        
        <div className="space-y-2.5 sm:space-y-3 mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-2 text-xs sm:text-[11px] text-gray-600 font-bold">
            <MapPin size={14} className="text-red-500 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </div>
          
          <div className="flex items-center justify-between gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar size={14} className="text-indigo-500 shrink-0" />
              <span className="text-gray-500">{listing.year}</span>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Star 
                size={14} 
                className={`shrink-0 ${isNew ? "text-green-500" : "text-indigo-500"}`}
                fill={isNew ? "currentColor" : "none"} 
              />
              <span className={isNew ? "text-green-600" : "text-gray-500"}>
                {isNew ? 'NEUF' : `ÉTAT ${listing.condition}/10`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
