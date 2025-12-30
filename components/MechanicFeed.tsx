
import React, { useState } from 'react';
import { Search, MapPin, Star, ShieldCheck, Wrench, ChevronRight, MessageCircle } from 'lucide-react';
import { User } from '../types';

interface MechanicFeedProps {
  mechanics: User[];
  onContact: (mechanic: User) => void;
}

const MechanicFeed: React.FC<MechanicFeedProps> = ({ mechanics, onContact }) => {
  const [search, setSearch] = useState('');

  const filtered = mechanics.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.specialties?.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
    m.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Trouvez votre Expert mɔ̆tto</h2>
        <p className="text-gray-500 font-medium">Sécurisez votre achat ou confiez l'entretien à un professionnel certifié.</p>
        
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par spécialité (Moteur, Hybride...), ville ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-5 bg-white border border-gray-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-base font-bold shadow-lg transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filtered.map(m => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-[40px] p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <img src={m.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt={m.name} />
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                  <ShieldCheck size={12} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{m.name}</h3>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-black">
                  <Star size={14} fill="currentColor" /> {m.rating} • {m.completedInspections} expertises
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6 flex-1">
              <div className="flex items-start gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <MapPin size={16} className="text-red-500 shrink-0" />
                {m.address}
              </div>
              <div className="flex items-start gap-2">
                <Wrench size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {m.specialties?.map(s => (
                    <span key={s} className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taux horaire</span>
                <span className="text-lg font-black text-indigo-600">{m.hourlyRate?.toLocaleString()} FCFA</span>
              </div>
            </div>

            <button 
              onClick={() => onContact(m)}
              className="w-full bg-gray-50 hover:bg-indigo-600 hover:text-white transition-all py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              Prendre rendez-vous <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MechanicFeed;
