
import React, { useState, useRef, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Share2, Heart, ShieldCheck, 
  Calendar, Gauge, Palette, Star, MessageCircle, 
  MapPin, Store, User as UserIcon, Wrench, ShieldAlert,
  ArrowRight, Check
} from 'lucide-react';
import { Listing, User } from '../types';
import ListingCard from './ListingCard';

interface ListingDetailsProps {
  listing: Listing;
  onBack: () => void;
  onMessage: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  currentUser: User | null;
  mechanics: User[];
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
}

const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.893-5.335 11.896-11.893a11.817 11.817 0 00-3.48-8.413z" /></svg>
);

const ListingDetails: React.FC<ListingDetailsProps> = ({ listing, onBack, onMessage, isFavorite, onToggleFavorite, currentUser, mechanics, listings, onSelectListing }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNew = listing.status === 'new';
  const [showExpertSelection, setShowExpertSelection] = useState(false);

  const formatFCFA = (p: number) => p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      setActiveImage(Math.round(scrollLeft / clientWidth));
    }
  };

  const navigate = (dir: 'next' | 'prev') => {
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      const target = dir === 'next' ? activeImage + 1 : activeImage - 1;
      scrollRef.current.scrollTo({ left: target * width, behavior: 'smooth' });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: listing.title,
      text: `Regardez cette annonce sur MƆ̆TTO : ${listing.title} - ${formatFCFA(listing.price)}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Erreur lors du partage', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (err) {
        console.error('Clipboard error', err);
      }
    }
  };

  const similarListings = useMemo(() => {
    return listings
      .filter(l => l.category === listing.category && l.id !== listing.id)
      .sort((a, b) => {
        if (a.location === listing.location && b.location !== listing.location) return -1;
        if (b.location === listing.location && a.location !== listing.location) return 1;
        return b.createdAt - a.createdAt;
      })
      .slice(0, 8);
  }, [listings, listing]);

  const statusLabels = { 
    new: 'Neuf en boutique', 
    used: 'Occasion locale', 
    imported: 'Importé (Venu)' 
  };

  return (
    <div className="bg-white min-h-full">
      {/* Toast Feedback for Copy */}
      {copyFeedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={16} className="text-green-400" />
          Lien copié dans le presse-papier
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-0 min-h-screen">
        {/* Left Side: Photo Slider */}
        <div className="relative h-[400px] lg:h-screen bg-gray-900 lg:sticky lg:top-0">
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between lg:top-8 lg:left-8 lg:right-8">
            <button onClick={onBack} className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg text-gray-800 transition-transform active:scale-90 hover:bg-white">
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-3">
              <button onClick={handleShare} className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg transition-transform active:scale-90 hover:bg-white relative overflow-hidden">
                <Share2 size={22} />
              </button>
              <button onClick={onToggleFavorite} className={`p-3 backdrop-blur-md rounded-full shadow-lg transition-all active:scale-90 ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 hover:bg-white'}`}>
                <Heart size={22} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {listing.images.length > 1 && (
            <>
              <button onClick={() => navigate('prev')} className={`absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/80 rounded-full shadow-lg transition-all hover:bg-white ${activeImage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ChevronLeft size={28} /></button>
              <button onClick={() => navigate('next')} className={`absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/80 rounded-full shadow-lg transition-all hover:bg-white ${activeImage === listing.images.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ChevronRight size={28} /></button>
            </>
          )}

          <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full">
            {listing.images.map((img, idx) => (
              <div key={idx} className="flex-none w-full h-full snap-center">
                <img src={img} className="w-full h-full object-cover" alt={listing.title} />
              </div>
            ))}
          </div>

          <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2">
            {listing.images.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === idx ? 'w-10 bg-white' : 'w-2 bg-white/40'}`} />
            ))}
          </div>
        </div>

        {/* Right Side: Details Information */}
        <div className="p-6 sm:p-10 lg:p-12 space-y-10 lg:overflow-y-auto lg:h-screen lg:pb-32">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest text-white shadow-sm flex items-center gap-2 ${listing.sellerType === 'pro' ? 'bg-indigo-600' : 'bg-gray-800'}`}>
                {listing.sellerType === 'pro' ? <Store size={14} /> : <UserIcon size={14} />}
                {listing.sellerType === 'pro' ? 'Vendeur Professionnel' : 'Vendeur Particulier'}
              </span>
              <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm ${isNew ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-600'}`}>
                {statusLabels[listing.status]}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight tracking-tight">{listing.title}</h1>
              <p className="text-4xl font-black text-indigo-600 tracking-tighter">{formatFCFA(listing.price)}</p>
            </div>
            
            <div className="flex items-center gap-3 text-red-600 text-xs font-black uppercase bg-red-50 px-5 py-4 rounded-2xl w-fit border border-red-100 shadow-sm">
              <MapPin size={20} />
              {listing.location}
            </div>
          </div>

          {/* Secure Purchase Banner */}
          {!isNew && (
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
              <Wrench className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={28} className="text-amber-400" />
                  <h3 className="text-lg font-black uppercase tracking-tight">Sécurisez votre achat</h3>
                </div>
                <p className="text-indigo-100 text-sm font-medium leading-relaxed">
                  Ne prenez aucun risque. Un mécanicien certifié MƆ̆TTO vous accompagnera pour inspecter ce véhicule de fond en comble avant le paiement.
                </p>
                <button 
                  onClick={() => setShowExpertSelection(true)}
                  className="bg-white text-indigo-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all w-full sm:w-auto"
                >
                  Expertiser ce véhicule
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <DetailItem icon={<Calendar size={24}/>} label="Année" value={listing.year.toString()} />
            <DetailItem icon={<Gauge size={24}/>} label="Kilométrage" value={listing.mileage !== undefined && listing.mileage > 0 ? `${listing.mileage.toLocaleString()} KM` : 'NEUF'} />
            <DetailItem icon={<Palette size={24}/>} label="Couleur" value={listing.color} />
            <DetailItem icon={<Star size={24}/>} label="État" value={isNew ? 'Article Neuf' : `${listing.condition} / 10`} isHighlight={isNew} />
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs border-b border-gray-100 pb-3 flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
               Description du Véhicule
            </h3>
            <p className="text-gray-600 text-base leading-relaxed font-medium bg-gray-50/30 p-6 rounded-3xl border border-gray-50">
              {listing.description}
            </p>
          </div>

          {/* Similar Listings Carousel */}
          {similarListings.length > 0 && (
            <div className="space-y-6 pt-10">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  Annonces Similaires
                </h3>
                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                  Voir tout <ArrowRight size={14} />
                </button>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {similarListings.map(item => (
                  <div key={item.id} className="min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start">
                    <ListingCard 
                      listing={item} 
                      onClick={() => {
                        onSelectListing(item);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar - Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-40 bg-white/80 backdrop-blur-2xl p-4 rounded-[40px] border border-white shadow-2xl flex gap-4 animate-in fade-in slide-in-from-bottom duration-500 lg:hidden">
        <button 
          onClick={onMessage} 
          className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-100 active:scale-95 hover:bg-indigo-700 transition-all"
        >
          <MessageCircle size={24} fill="currentColor" />
          <span className="text-[10px] uppercase tracking-widest">Chatter sur MƆ̆TTO</span>
        </button>
        <button 
          onClick={() => window.open(`https://wa.me/2250700000000`, '_blank')} 
          className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1 shadow-lg shadow-green-100 active:scale-95 hover:bg-[#20bd5a] transition-all"
        >
          <WhatsAppIcon size={24} />
          <span className="text-[10px] uppercase tracking-widest">WhatsApp</span>
        </button>
      </div>

      {/* Fixed Action Bar - Desktop (compact, integrated in right panel) */}
      <div className="hidden lg:block fixed bottom-8 right-12 z-40">
        <div className="bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-gray-100 shadow-xl flex gap-3">
          <button 
            onClick={onMessage} 
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-indigo-100 active:scale-95 hover:bg-indigo-700 transition-all whitespace-nowrap"
          >
            <MessageCircle size={18} fill="currentColor" />
            <span>Chatter</span>
          </button>
          <button 
            onClick={() => window.open(`https://wa.me/2250700000000`, '_blank')} 
            className="bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-green-100 active:scale-95 hover:bg-[#20bd5a] transition-all whitespace-nowrap"
          >
            <WhatsAppIcon size={18} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Expert Selection Modal Overlay */}
      {showExpertSelection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowExpertSelection(false)} />
          <div className="bg-white w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[40px] z-10 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-black text-gray-900">Choisir un expert proche</h2>
               <button onClick={() => setShowExpertSelection(false)} className="p-2 bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
             </div>
             <div className="space-y-4">
               {mechanics.slice(0, 3).map(m => (
                 <button key={m.id} className="w-full p-4 border-2 border-gray-50 rounded-[28px] hover:border-indigo-600 hover:bg-indigo-50/30 transition-all text-left flex items-center gap-4 group">
                    <img src={m.avatar} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    <div className="flex-1">
                      <p className="font-black text-sm text-gray-900 group-hover:text-indigo-600">{m.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{m.address}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-indigo-600">Expertise</p>
                       <p className="text-sm font-black text-gray-900">{m.hourlyRate?.toLocaleString()} F</p>
                    </div>
                 </button>
               ))}
             </div>
             <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase text-center">Une fois choisi, nous créons un groupe avec vous et le vendeur.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string, isHighlight?: boolean }> = ({ icon, label, value, isHighlight }) => (
  <div className={`p-5 rounded-3xl flex items-center gap-5 border transition-all hover:shadow-lg ${isHighlight ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 hover:border-indigo-100'}`}>
    <div className={`${isHighlight ? 'text-green-600' : 'text-indigo-600'} bg-white p-3.5 rounded-2xl shadow-sm border border-gray-50`}>{icon}</div>
    <div>
      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">{label}</p>
      <p className={`text-sm sm:text-base font-black ${isHighlight ? 'text-green-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  </div>
);

export default ListingDetails;
