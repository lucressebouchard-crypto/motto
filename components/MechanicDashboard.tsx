
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Calendar, FileText, Package, MessageSquare, 
  TrendingUp, Settings, LogOut, CheckCircle2, 
  Clock, Plus, AlertCircle, ShoppingBag, DollarSign,
  ChevronRight, ArrowLeft, Menu, X, Search, Filter,
  MoreHorizontal, Download, Phone, User as UserIcon,
  Wrench, Car, Clock3, MapPin, ArrowRight, Edit3,
  BellRing, BellOff, Volume2
} from 'lucide-react';
import { User } from '../types';

interface MechanicDashboardProps {
  user: User;
  onLogout: () => void;
  onExit: () => void;
  quickCreateAction?: {
    type: 'appointment' | 'client' | 'quote' | 'inventory' | 'expertise' | 'navigate';
    view?: 'appointments' | 'clients' | 'quotes' | 'inventory';
  } | null;
  onQuickCreateActionHandled?: () => void;
}

interface InternalAppointment {
  id: string;
  time: string;
  date: string;
  client: string;
  service: string;
  vehicle: string;
  status: 'pending' | 'confirmed';
  reminder?: boolean;
}

const MechanicDashboard: React.FC<MechanicDashboardProps> = ({ user, onLogout, onExit, quickCreateAction, onQuickCreateActionHandled }) => {
  const [activeView, setActiveView] = useState<'overview' | 'appointments' | 'clients' | 'quotes' | 'inventory'>('overview');
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [appointments, setAppointments] = useState<InternalAppointment[]>([
    { id: '1', time: '09:00', date: '2024-05-12', client: 'Paul Toure', service: 'Expertise Achat', vehicle: 'Audi A4 2019', status: 'confirmed' },
    { id: '2', time: '11:30', date: '2024-05-12', client: 'Moussa F.', service: 'Révision Complète', vehicle: 'Hyundai Tucson', status: 'confirmed' },
    { id: '3', time: '14:00', date: '2024-05-12', client: 'Désiré K.', service: 'Diagnostic Élec', vehicle: 'Toyota Prado', status: 'pending' },
    { id: '4', time: '10:00', date: '2024-05-13', client: 'Sarah G.', service: 'Expertise Achat', vehicle: 'BMW X5', status: 'confirmed' },
    { id: '5', time: '15:30', date: '2024-05-13', client: 'Ali S.', service: 'Freinage', vehicle: 'Suzuki Swift', status: 'confirmed' },
  ]);
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  
  // Handle quick create actions from App.tsx
  useEffect(() => {
    if (quickCreateAction && onQuickCreateActionHandled) {
      if (quickCreateAction.type === 'appointment') {
        setIsAddingAppointment(true);
        if (activeView !== 'appointments') {
          setActiveView('appointments');
        }
      } else if (quickCreateAction.type === 'navigate' && quickCreateAction.view) {
        setActiveView(quickCreateAction.view);
      }
      // Note: For other types (client, quote, inventory, expertise), 
      // we'll navigate to the appropriate view and the view can handle showing its create modal
      onQuickCreateActionHandled();
    }
  }, [quickCreateAction, onQuickCreateActionHandled, activeView]);

  // List of unique clients for suggestions
  const existingClientsList = [
    'Samuel Koffi', 'Awa Sarr', 'Jean Kouassi', 'Moussa Fofana', 'Sarah Gueye', 'Paul Toure', 'Désiré K.', 'Ali S.'
  ];

  const stats = [
    { label: 'Revenus du mois', value: '845 000 FCFA', icon: <DollarSign size={20}/>, color: 'text-green-600' },
    { label: 'RDV Aujourd\'hui', value: appointments.filter(a => a.date === '2024-05-12').length.toString(), icon: <Calendar size={20}/>, color: 'text-indigo-600' },
    { label: 'Devis en attente', value: '7', icon: <FileText size={20}/>, color: 'text-amber-600' },
    { label: 'Clients actifs', value: '52', icon: <Users size={20}/>, color: 'text-blue-600' }
  ];

  const handleAddAppointment = (newApp: Omit<InternalAppointment, 'id'>) => {
    const appointment = {
      ...newApp,
      id: Math.random().toString(36).substr(2, 9)
    };
    setAppointments([appointment, ...appointments]);
    setIsAddingAppointment(false);
  };

  const handleNavClick = (view: 'overview' | 'appointments' | 'clients' | 'quotes' | 'inventory') => {
    setActiveView(view);
    // Auto-close on mobile after selection
    if (window.innerWidth < 1024) {
      setIsNavExpanded(false);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewView user={user} stats={stats} appointments={appointments} onOpenAdd={() => setIsAddingAppointment(true)} />;
      case 'appointments':
        return <AppointmentsView appointments={appointments} onOpenAdd={() => setIsAddingAppointment(true)} />;
      case 'clients':
        return <ClientsView />;
      case 'quotes':
        return <QuotesView />;
      case 'inventory':
        return <InventoryView />;
      default:
        return <OverviewView user={user} stats={stats} appointments={appointments} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col lg:flex-row relative overflow-x-hidden">
      {/* Sidebar - Overlay behavior on Mobile, Sidebar behavior on Desktop */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[100] w-72 bg-white shadow-[20px_0_60px_rgba(0,0,0,0.1)] border-r border-gray-100 flex flex-col
          transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isNavExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:sticky lg:h-screen lg:shrink-0
        `}
      >
        <div className="p-4 border-b border-gray-50 flex items-center justify-between lg:justify-start gap-4">
          <button onClick={onExit} className="flex items-center gap-4 p-4 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all flex-1">
            <ArrowLeft size={22} strokeWidth={3} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quitter</span>
          </button>
          <button onClick={() => setIsNavExpanded(false)} className="lg:hidden p-3 bg-gray-50 rounded-xl text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex items-center gap-4 border-b border-gray-50 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="font-black text-gray-900 tracking-tighter">
            PRO MƆ̆TTO
          </span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto no-scrollbar">
          <NavTab active={activeView === 'overview'} onClick={() => handleNavClick('overview')} icon={<TrendingUp size={22}/>} label="Vue d'ensemble" />
          <NavTab active={activeView === 'appointments'} onClick={() => handleNavClick('appointments')} icon={<Calendar size={22}/>} label="Agenda & RDV" count={appointments.filter(a => a.date === '2024-05-12').length} />
          <NavTab active={activeView === 'clients'} onClick={() => handleNavClick('clients')} icon={<Users size={22}/>} label="Ma Clientèle" />
          <NavTab active={activeView === 'quotes'} onClick={() => handleNavClick('quotes')} icon={<FileText size={22}/>} label="Devis & Factures" count={7} />
          <NavTab active={activeView === 'inventory'} onClick={() => handleNavClick('inventory')} icon={<Package size={22}/>} label="Stock Accessoires" />
        </nav>

        <div className="p-4 border-t border-gray-50 shrink-0">
          <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all justify-start">
            <LogOut size={22} className="shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile navigation */}
      {isNavExpanded && (
        <div 
          className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300" 
          onClick={() => setIsNavExpanded(false)} 
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden bg-indigo-900 text-white p-6 fixed top-0 left-0 right-0 z-50 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsNavExpanded(true)} 
               className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-all"
             >
               <Menu size={24}/>
             </button>
             <h2 className="font-black tracking-tight text-lg">PRO Dashboard</h2>
          </div>
          <button className="p-3 bg-white/10 rounded-2xl"><Settings size={20}/></button>
        </div>

        <div className="p-4 sm:p-8 lg:p-12 space-y-8 max-w-6xl mx-auto w-full pt-24 lg:pt-12">
          {renderView()}
        </div>
      </main>

      {isAddingAppointment && (
        <AddAppointmentModal 
          onClose={() => setIsAddingAppointment(false)} 
          onSubmit={handleAddAppointment}
          existingClients={existingClientsList}
        />
      )}
    </div>
  );
};

// --- SUB-VIEWS ---

const OverviewView: React.FC<{ user: User, stats: any[], appointments: InternalAppointment[], onOpenAdd: () => void }> = ({ user, stats, appointments, onOpenAdd }) => {
  const todayApps = appointments.filter(a => a.date === '2024-05-12');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Si le bouton n'est pas visible (hors viewport), afficher le bouton flottant
          setShowFloatingButton(!entry.isIntersecting);
        });
      },
      {
        threshold: 0.1, // Le bouton est considéré comme visible si au moins 10% est visible
        rootMargin: '-10px', // Petite marge pour déclencher avant que le bouton sorte complètement
      }
    );

    observer.observe(button);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bonjour, {user.shopName}</h1>
            <p className="text-gray-400 font-medium text-sm">Voici l'activité de votre garage aujourd'hui.</p>
          </div>
          <button 
            ref={buttonRef}
            onClick={onOpenAdd}
            className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Nouvelle Expertise
          </button>
        </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`${s.color} mb-4 bg-gray-50 p-3.5 rounded-2xl w-fit border border-gray-100/50`}>{s.icon}</div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Aujourd'hui</h3>
            </div>
          </div>
          <div className="space-y-4">
            {todayApps.length > 0 ? todayApps.map(app => (
              <ExpertiseItem 
                key={app.id}
                buyer={app.client}
                vehicle={app.vehicle}
                time={app.time}
                status={app.status}
              />
            )) : (
              <p className="text-center py-10 text-gray-400 font-bold italic text-sm">Aucun RDV pour aujourd'hui</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Derniers Devis Émis</h3>
            <button className="text-[10px] text-indigo-600 font-black hover:underline uppercase tracking-widest">Voir tout</button>
          </div>
          <div className="space-y-4">
            <QuoteItem client="Samuel Koffi" amount="45 000" date="Aujourd'hui" status="draft" />
            <QuoteItem client="Awa Sarr" amount="128 000" date="Hier" status="sent" />
            <QuoteItem client="Ibrahim" amount="245 000" date="3j" status="accepted" />
          </div>
        </div>
      </div>
    </div>

      {/* Floating Button - Appears when original button is not visible */}
      {showFloatingButton && (
        <button
          onClick={() => {
            onOpenAdd();
            // Optionnel : scroll vers le haut pour voir le bouton original
            buttonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 bg-indigo-600 text-white rounded-full p-4 sm:p-5 shadow-2xl shadow-indigo-500/50 hover:bg-indigo-700 active:scale-95 transition-all z-40 animate-in zoom-in-95 duration-300 border-4 border-white"
          title="Nouvelle Expertise"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      )}
    </>
  );
};

const AppointmentsView: React.FC<{ appointments: InternalAppointment[], onOpenAdd: () => void }> = ({ appointments, onOpenAdd }) => {
  const grouped = appointments.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {} as Record<string, InternalAppointment[]>);

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Agenda & Rendez-vous</h2>
          <p className="text-gray-400 text-sm font-medium">Gérez votre emploi du temps et vos interventions.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none p-4 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"><Filter size={20}/></button>
          <button onClick={onOpenAdd} className="flex-[2] sm:flex-none bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
            <Plus size={18}/> Nouveau RDV
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>
            <div className="bg-white rounded-[40px] border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
              {grouped[date].map(app => (
                <AppointmentRow key={app.id} {...app} />
              ))}
            </div>
          </div>
        ))}

        {sortedDates.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[48px] border-2 border-dashed border-gray-100">
            <Calendar size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold italic">Votre agenda est vide.</p>
            <button onClick={onOpenAdd} className="mt-4 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:underline">Ajouter votre premier rendez-vous</button>
          </div>
        )}
      </div>
    </div>
  );
};

const AddAppointmentModal: React.FC<{ onClose: () => void, onSubmit: (app: Omit<InternalAppointment, 'id'>) => void, existingClients: string[] }> = ({ onClose, onSubmit, existingClients }) => {
  const [form, setForm] = useState({
    client: '',
    vehicle: '',
    service: 'Expertise Achat',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    reminder: false
  });
  const [isCustomService, setIsCustomService] = useState(false);
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const predefinedServices = ['Expertise Achat', 'Révision Complète', 'Diagnostic Élec', 'Pneumatique', 'Vidange', 'Freinage', 'Carrosserie'];

  const filteredSuggestions = existingClients.filter(c => 
    c.toLowerCase().includes(form.client.toLowerCase()) && 
    form.client.length > 0 &&
    c.toLowerCase() !== form.client.toLowerCase()
  );

  const handleConfirm = () => {
    const finalService = isCustomService ? customServiceInput : form.service;
    onSubmit({
      ...form,
      service: finalService,
      status: 'confirmed'
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[48px] p-8 sm:p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-8 px-2">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Nouveau RDV</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Personnalisez l'intervention</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"><X size={20}/></button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 relative" ref={suggestionRef}>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Client & Contact</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-indigo-600" size={18} />
              <input 
                type="text" 
                placeholder="Nom du client (choisir ou saisir)..." 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-sm shadow-sm transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/5"
                value={form.client}
                autoComplete="off"
                onChange={e => {
                  setForm({...form, client: e.target.value});
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            {showSuggestions && (filteredSuggestions.length > 0 || (form.client.length > 0 && !existingClients.includes(form.client))) && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  {filteredSuggestions.map(client => (
                    <button 
                      key={client}
                      onClick={() => {
                        setForm({...form, client});
                        setShowSuggestions(false);
                      }}
                      className="w-full px-6 py-4 text-left text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          <UserIcon size={14} />
                        </div>
                        {client}
                      </div>
                      <span className="text-[8px] font-black uppercase text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Client existant</span>
                    </button>
                  ))}
                  {form.client.length > 0 && !existingClients.some(c => c.toLowerCase() === form.client.toLowerCase()) && (
                    <button 
                      onClick={() => setShowSuggestions(false)}
                      className="w-full px-6 py-4 text-left text-sm font-bold text-indigo-600 bg-indigo-50/50 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <Plus size={14} />
                      </div>
                      <span>Ajouter "<strong>{form.client}</strong>"</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Véhicule concerné</label>
            <div className="relative group">
              <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-indigo-600" size={18} />
              <input 
                type="text" 
                placeholder="Marque, Modèle, Année..." 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-sm shadow-sm transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/5"
                value={form.vehicle}
                onChange={e => setForm({...form, vehicle: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600" size={18} />
                <input 
                  type="date" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-sm shadow-sm transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/5"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Heure</label>
              <div className="relative group">
                <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600" size={18} />
                <input 
                  type="time" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-sm shadow-sm transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/5"
                  value={form.time}
                  onChange={e => setForm({...form, time: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Sound Notification Toggle */}
          <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-3xl border border-indigo-100/50">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl transition-all duration-300 ${form.reminder ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>
                {form.reminder ? <BellRing size={20} strokeWidth={2.5} /> : <BellOff size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none mb-1">Notification</p>
                <p className="text-xs font-black text-indigo-900 leading-none">{form.reminder ? 'Sonnerie activée' : 'Mode silencieux'}</p>
              </div>
            </div>
            <button 
              onClick={() => setForm({...form, reminder: !form.reminder})}
              className={`relative w-14 h-8 rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)] ${form.reminder ? 'bg-indigo-600 shadow-lg' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)] ${form.reminder ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Type d'intervention</label>
            <div className="flex flex-wrap gap-2">
              {predefinedServices.map(s => (
                <button 
                  key={s} 
                  onClick={() => {
                    setForm({...form, service: s});
                    setIsCustomService(false);
                  }}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${(!isCustomService && form.service === s) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'}`}
                >
                  {s}
                </button>
              ))}
              <button 
                onClick={() => setIsCustomService(true)}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${isCustomService ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-300'}`}
              >
                <Plus size={14} /> Autre...
              </button>
            </div>

            {isCustomService && (
              <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                <div className="relative group">
                  <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Saisissez l'intervention personnalisée..." 
                    className="w-full pl-12 pr-4 py-4 bg-amber-50 border border-amber-100 rounded-2xl focus:outline-none focus:border-amber-500 font-bold text-sm shadow-inner transition-all focus:bg-white"
                    value={customServiceInput}
                    autoFocus
                    onChange={e => setCustomServiceInput(e.target.value)}
                  />
                </div>
                <p className="text-[8px] text-amber-600 font-black uppercase tracking-widest mt-2 px-1 italic">Intervention hors catalogue standard</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 px-2">
          <button 
            disabled={!form.client || !form.vehicle || (isCustomService && !customServiceInput)}
            onClick={handleConfirm}
            className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            Confirmer le Rendez-vous <ArrowRight size={18} strokeWidth={3}/>
          </button>
        </div>
      </div>
    </div>
  );
};

const ClientsView: React.FC = () => (
  <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Ma Clientèle</h2>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" placeholder="Chercher un client..." className="w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm transition-all" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ClientCard name="Samuel Koffi" vehicle="Mercedes G63" visits={4} spent="1 250 000" lastVisit="Il y a 2j" />
      <ClientCard name="Awa Sarr" vehicle="Range Rover Velar" visits={1} spent="450 000" lastVisit="La semaine dernière" />
      <ClientCard name="Jean Kouassi" vehicle="Toyota Camry" visits={12} spent="2 840 000" lastVisit="Aujourd'hui" featured />
      <ClientCard name="Moussa Fofana" vehicle="Hyundai Tucson" visits={2} spent="85 000" lastVisit="1 mois" />
      <ClientCard name="Sarah Gueye" vehicle="BMW X5" visits={5} spent="920 000" lastVisit="Hier" />
    </div>
  </div>
);

const QuotesView: React.FC = () => (
  <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Devis & Factures</h2>
      <button className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
        <Plus size={16}/> Créer Nouveau
      </button>
    </div>

    <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <QuoteTableRow client="Samuel Koffi" date="12/05/2024" amount="45 000" status="draft" />
            <QuoteTableRow client="Awa Sarr" date="11/05/2024" amount="128 000" status="sent" />
            <QuoteTableRow client="Ibrahim Dr" date="09/05/2024" amount="245 000" status="accepted" />
            <QuoteTableRow client="Mme Diallo" date="08/05/2024" amount="890 000" status="paid" />
            <QuoteTableRow client="Kone Bakary" date="05/05/2024" amount="12 500" status="rejected" />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const InventoryView: React.FC = () => (
  <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Stock Accessoires</h2>
        <p className="text-gray-400 text-sm font-medium">Gérez vos pièces détachées et consommables.</p>
      </div>
      <button className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100">
        <Plus size={18}/> Ajouter Article
      </button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <InventoryCard name="Huile Moteur 5W30" stock={15} unit="Bidons" status="ok" />
      <InventoryCard name="Plaquettes Frein AV" stock={3} unit="Kits" status="low" />
      <InventoryCard name="Filtres à Air (SUV)" stock={0} unit="Pièces" status="empty" />
      <InventoryCard name="Ampoules H7 LED" stock={24} unit="Unités" status="ok" />
      <InventoryCard name="Liquide de Refroid." stock={8} unit="Bidons" status="ok" />
      <InventoryCard name="Bougies Allumage" stock={2} unit="Sets" status="low" />
    </div>
  </div>
);

// --- COMPONENT HELPERS ---

const NavTab: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }> = ({ active, onClick, icon, label, count }) => (
  <button 
    onClick={onClick}
    className={`
      w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-300 group
      ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'hover:bg-gray-50 text-gray-500'}
    `}
  >
    <div className="flex items-center gap-4">
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:text-indigo-600'}`}>
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
    </div>
    {count !== undefined && (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${active ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-500'}`}>
        {count}
      </span>
    )}
  </button>
);

const AppointmentRow: React.FC<InternalAppointment> = ({ time, client, service, vehicle, status, reminder }) => (
  <div className="flex items-center gap-6 p-6 hover:bg-gray-50 transition-colors group relative overflow-hidden">
    <div className="text-center min-w-[70px]">
      <p className="text-base font-black text-gray-900 tracking-tighter leading-none mb-2">{time}</p>
      <div className="flex items-center justify-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${status === 'confirmed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}></div>
        {reminder && <BellRing size={10} className="text-amber-500 animate-pulse" />}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-black text-gray-900 text-base tracking-tight">{client}</p>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-lg">
          <Wrench size={10} /> {service}
        </span>
        <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          <Car size={10} /> {vehicle}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2 sm:gap-4">
      <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 hover:shadow-lg transition-all"><Phone size={18}/></button>
      <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all"><MoreHorizontal size={18}/></button>
    </div>
  </div>
);

const ClientCard: React.FC<{ name: string, vehicle: string, visits: number, spent: string, lastVisit: string, featured?: boolean }> = ({ name, vehicle, visits, spent, lastVisit, featured }) => (
  <div className={`p-6 rounded-[40px] border transition-all hover:shadow-xl group ${featured ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-gray-100 text-gray-900 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${featured ? 'bg-white/10' : 'bg-gray-50 shadow-inner'}`}>
        <UserIcon size={28} className={featured ? 'text-white' : 'text-gray-400'} />
      </div>
      <button className={`p-3 rounded-2xl ${featured ? 'hover:bg-white/10' : 'hover:bg-gray-50 border border-gray-100 shadow-sm bg-white text-gray-900'}`}><Phone size={20}/></button>
    </div>
    <h4 className="font-black text-xl tracking-tighter mb-1">{name}</h4>
    <p className={`text-[10px] font-bold uppercase tracking-widest mb-6 ${featured ? 'text-indigo-200' : 'text-gray-400'}`}>{vehicle}</p>
    
    <div className={`grid grid-cols-2 gap-4 pt-6 border-t ${featured ? 'border-white/10' : 'border-gray-50'}`}>
      <div>
        <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${featured ? 'text-indigo-200' : 'text-gray-400'}`}>Historique</p>
        <p className="text-sm font-black">{visits} interventions</p>
      </div>
      <div>
        <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${featured ? 'text-indigo-200' : 'text-gray-400'}`}>C.A Généré</p>
        <p className="text-sm font-black">{spent} F</p>
      </div>
    </div>
  </div>
);

const QuoteTableRow: React.FC<{ client: string, date: string, amount: string, status: string }> = ({ client, date, amount, status }) => (
  <tr className="hover:bg-gray-50/50 transition-colors">
    <td className="px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><UserIcon size={18}/></div>
        <span className="font-black text-sm text-gray-900 truncate">{client}</span>
      </div>
    </td>
    <td className="px-6 py-6 text-xs text-gray-500 font-black uppercase tracking-widest whitespace-nowrap">{date}</td>
    <td className="px-6 py-6 font-black text-indigo-600 text-base whitespace-nowrap">{amount} FCFA</td>
    <td className="px-6 py-6">
      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
        status === 'draft' ? 'bg-gray-100 text-gray-500' : 
        status === 'sent' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
        status === 'accepted' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 
        status === 'paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500'
      }`}>
        {status}
      </span>
    </td>
    <td className="px-6 py-6 text-right">
      <button className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all"><Download size={20}/></button>
    </td>
  </tr>
);

const InventoryCard: React.FC<{ name: string, stock: number, unit: string, status: 'ok' | 'low' | 'empty' }> = ({ name, stock, unit, status }) => (
  <div className="p-8 rounded-[40px] border border-gray-100 flex flex-col gap-6 bg-white hover:shadow-2xl transition-all group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[80px] -mr-8 -mt-8 opacity-40 transition-transform group-hover:scale-110"></div>
    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] truncate relative z-10">{name}</p>
    <div className="flex items-end justify-between relative z-10">
      <div className="text-3xl font-black text-gray-900 leading-none tracking-tighter">
        {stock} <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">{unit}</span>
      </div>
      <div className={`
        p-4 rounded-3xl border shadow-sm
        ${status === 'empty' ? 'bg-red-50 text-red-500 border-red-100 shadow-red-100' : status === 'low' ? 'bg-amber-50 text-amber-500 border-amber-100 shadow-amber-100' : 'bg-green-50 text-green-500 border-green-100 shadow-green-100'}
      `}>
        {status === 'empty' ? <AlertCircle size={24} strokeWidth={2.5} /> : status === 'low' ? <Clock size={24} strokeWidth={2.5} /> : <CheckCircle2 size={24} strokeWidth={2.5} />}
      </div>
    </div>
    {status === 'empty' ? (
      <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-100 active:scale-95 transition-all">Commander Stock</button>
    ) : (
      <button className="w-full bg-gray-50 text-gray-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100 shadow-sm">Modifier Fiche</button>
    )}
  </div>
);

const ExpertiseItem: React.FC<{ buyer: string, vehicle: string, time: string, status: string }> = ({ buyer, vehicle, time, status }) => (
  <div className="flex items-center gap-4 p-5 rounded-[28px] border border-gray-50 hover:bg-gray-50 hover:border-indigo-100 transition-all group shadow-sm bg-white">
    <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 font-black text-sm text-center min-w-[70px] border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
      {time}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-black text-gray-900 text-base truncate tracking-tight">{vehicle}</h4>
      <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-widest">Client: {buyer}</p>
    </div>
    {status === 'confirmed' ? (
      <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter shrink-0 border border-green-100">
        <CheckCircle2 size={14} strokeWidth={2.5} /> OK
      </div>
    ) : (
      <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter shrink-0 border border-amber-100">
        <Clock size={14} strokeWidth={2.5} /> ATT.
      </div>
    )}
  </div>
);

const QuoteItem: React.FC<{ client: string, amount: string, date: string, status: string }> = ({ client, amount, date, status }) => (
  <div className="flex items-center justify-between p-6 rounded-[28px] border border-gray-50 hover:bg-gray-50 transition-all shadow-sm bg-white">
    <div className="min-w-0">
      <h4 className="font-black text-gray-900 text-base truncate tracking-tight">{client}</h4>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{date} • <span className="text-indigo-600">{amount} F</span></p>
    </div>
    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
      status === 'draft' ? 'bg-gray-100 text-gray-500' : 
      status === 'sent' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-green-50 text-green-600 border border-green-100'
    }`}>
      {status === 'draft' ? 'Brouillon' : status === 'sent' ? 'Envoyé' : 'Payé'}
    </span>
  </div>
);

export default MechanicDashboard;
