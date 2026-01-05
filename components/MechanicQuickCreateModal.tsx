import React from 'react';
import { Calendar, Users, FileText, Package, Search, X } from 'lucide-react';

interface MechanicQuickCreateModalProps {
  onClose: () => void;
  onCreateAppointment: () => void;
  onCreateClient: () => void;
  onCreateQuote: () => void;
  onCreateInventoryItem: () => void;
  onCreateExpertise: () => void;
  onNavigateToView: (view: 'appointments' | 'clients' | 'quotes' | 'inventory') => void;
}

const MechanicQuickCreateModal: React.FC<MechanicQuickCreateModalProps> = ({
  onClose,
  onCreateAppointment,
  onCreateClient,
  onCreateQuote,
  onCreateInventoryItem,
  onCreateExpertise,
  onNavigateToView,
}) => {
  const options = [
    {
      id: 'appointment',
      icon: <Calendar size={24} className="text-indigo-600" />,
      title: 'Nouveau Rendez-vous',
      description: 'Planifier une intervention ou une expertise',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      onClick: onCreateAppointment,
    },
    {
      id: 'client',
      icon: <Users size={24} className="text-blue-600" />,
      title: 'Nouveau Client',
      description: 'Ajouter un client à votre base de données',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      onClick: onCreateClient,
    },
    {
      id: 'quote',
      icon: <FileText size={24} className="text-amber-600" />,
      title: 'Nouveau Devis',
      description: 'Créer un devis ou une facture',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      onClick: onCreateQuote,
    },
    {
      id: 'inventory',
      icon: <Package size={24} className="text-green-600" />,
      title: 'Article Stock',
      description: 'Ajouter un article à votre inventaire',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
      onClick: onCreateInventoryItem,
    },
    {
      id: 'expertise',
      icon: <Search size={24} className="text-purple-600" />,
      title: 'Nouvelle Expertise',
      description: 'Créer une expertise véhicule',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      onClick: onCreateExpertise,
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-indigo-900/40 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div className="bg-white w-full max-w-md rounded-[40px] p-6 sm:p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Créer</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Que souhaitez-vous créer ?</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Options Grid */}
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className={`w-full p-5 rounded-2xl border-2 ${option.borderColor} ${option.bgColor} hover:shadow-lg transition-all active:scale-98 text-left group`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-white ${option.borderColor} border shadow-sm group-hover:scale-110 transition-transform`}>
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 text-base mb-1">
                    {option.title}
                  </h3>
                  <p className="text-xs text-gray-600 font-medium">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center font-medium">
            Vous pouvez aussi accéder à ces sections depuis le menu latéral
          </p>
        </div>
      </div>
    </div>
  );
};

export default MechanicQuickCreateModal;

