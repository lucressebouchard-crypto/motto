import React from 'react';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

type AlertType = 'error' | 'success' | 'info' | 'warning';

interface AlertModalProps {
  message: string;
  type?: AlertType;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ message, type = 'error', onClose }) => {
  const icons = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    error: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      text: 'text-red-900',
      border: 'border-red-200',
      button: 'bg-red-600 hover:bg-red-700',
    },
    success: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      text: 'text-green-900',
      border: 'border-green-200',
      button: 'bg-green-600 hover:bg-green-700',
    },
    info: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      text: 'text-blue-900',
      border: 'border-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    warning: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      text: 'text-amber-900',
      border: 'border-amber-200',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
  };

  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`bg-white w-full max-w-sm rounded-[32px] z-10 p-8 flex flex-col items-center text-center shadow-2xl border-2 ${colorScheme.border} animate-bounce-in relative`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className={`w-16 h-16 ${colorScheme.iconBg} rounded-full flex items-center justify-center ${colorScheme.iconColor} mb-4`}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
        
        <p className={`text-sm font-bold ${colorScheme.text} leading-relaxed`}>
          {message}
        </p>
        
        <button
          onClick={onClose}
          className={`mt-6 w-full ${colorScheme.button} text-white py-3.5 rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs`}
        >
          OK
        </button>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default AlertModal;

