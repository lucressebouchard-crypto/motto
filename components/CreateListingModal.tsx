
import React, { useState, useRef } from 'react';
import { X, Camera, Upload, CheckCircle2, Loader2, Rocket, Info, Star, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Category, Listing, ItemStatus, User } from '../types';
import { listingService } from '../services/listingService';
import { imageService } from '../services/imageService';

interface CreateListingModalProps {
  onClose: () => void;
  onSubmit: (listing: Listing) => void;
  currentUser: User | null;
}

const CreateListingModal: React.FC<CreateListingModalProps> = ({ onClose, onSubmit, currentUser }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: Category.CAR,
    year: new Date().getFullYear(),
    mileage: '',
    color: '',
    condition: 10,
    description: '',
    location: '',
    status: 'used' as ItemStatus
  });

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach(file => {
      const validation = imageService.validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      newFiles.push(file);
      // Créer une preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          setImagePreviews([...imagePreviews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages(prev => [...prev, ...newFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Vous devez être connecté pour créer une annonce');
      return;
    }

    // Validation des champs obligatoires
    if (!formData.title.trim()) {
      alert('Veuillez saisir un titre pour votre annonce');
      return;
    }

    if (!formData.price || formData.price.trim() === '' || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      alert('Veuillez saisir un prix valide (supérieur à 0)');
      return;
    }

    if (!formData.description.trim()) {
      alert('Veuillez saisir une description pour votre annonce');
      return;
    }

    if (!formData.color.trim()) {
      alert('Veuillez saisir une couleur');
      return;
    }

    if (!formData.location.trim()) {
      alert('Veuillez saisir une localisation');
      return;
    }

    if (selectedImages.length === 0) {
      alert('Veuillez ajouter au moins une image');
      return;
    }

    setIsSubmitting(true);
    setUploadingImages(true);
    
    try {
      // Upload des images d'abord
      const imageUrls = await imageService.uploadMultipleImages(selectedImages, currentUser.id);
      
      setUploadingImages(false);

      // Convertir le prix en nombre (avec validation)
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Le prix doit être un nombre positif');
      }

      // Créer l'annonce avec les URLs des images
      const newListing = await listingService.create({
        title: formData.title.trim(),
        price: price,
        category: formData.category,
        images: imageUrls.length > 0 ? imageUrls : ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80'],
        year: formData.year,
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        color: formData.color.trim(),
        condition: formData.condition,
        description: formData.description.trim(),
        sellerId: currentUser.id,
        sellerType: currentUser.role === 'seller' ? 'pro' : 'individual',
        status: formData.status,
        location: formData.location.trim() || 'Abidjan, CI',
      });
      
      // Si boost activé, le faire après la création
      if (isBoosted && newListing.id) {
        try {
          await listingService.boost(newListing.id);
          newListing.isBoosted = true;
        } catch (error) {
          console.error('Erreur lors du boost:', error);
        }
      }
      
      onSubmit(newListing);
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Auto close after 2 seconds
      setTimeout(onClose, 2000);
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'annonce:', error);
      alert(error.message || 'Erreur lors de la création de l\'annonce');
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="bg-white w-full max-w-sm rounded-[32px] z-10 p-10 flex flex-col items-center text-center animate-bounce-in shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-pulse">
            <CheckCircle2 size={48} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Félicitations !</h2>
          <p className="text-gray-500 font-bold">Votre annonce "<strong>{formData.title}</strong>" est maintenant en ligne.</p>
          {isBoosted && (
            <div className="mt-4 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Rocket size={14} /> Boost Activé
            </div>
          )}
        </div>
        <style>{`
          @keyframes bounce-in {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 1; }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }
          .animate-bounce-in {
            animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-md h-[90vh] rounded-t-[32px] z-10 flex flex-col animate-slide-up relative">
        <div className="p-6 flex items-center justify-between border-b shrink-0">
          <h2 className="text-xl font-black text-gray-900">Publier une annonce</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 transition-transform active:scale-90">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          {/* Image Upload Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Photos de l'annonce</label>
            
            {/* Preview des images sélectionnées */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Boutons d'upload */}
            <div className="grid grid-cols-2 gap-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleImageSelect(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2 hover:border-indigo-300 hover:text-indigo-400 transition-all cursor-pointer"
              >
                <Camera size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Photo</span>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageSelect(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2 hover:border-indigo-300 hover:text-indigo-400 transition-all cursor-pointer"
              >
                <Upload size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Galerie</span>
              </button>
            </div>
            {selectedImages.length > 0 && (
              <p className="text-[9px] text-gray-400 font-bold text-center">
                {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} sélectionnée{selectedImages.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="space-y-5">
            <Input label="Titre de l'annonce" placeholder="Ex: Audi A3 Sportback" value={formData.title} onChange={v => setFormData({...formData, title: v})} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prix (FCFA)" type="number" placeholder="0.00" value={formData.price} onChange={v => setFormData({...formData, price: v})} required />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Catégorie</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-sm appearance-none shadow-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                >
                  <option value={Category.CAR}>Voiture</option>
                  <option value={Category.MOTO}>Moto</option>
                  <option value={Category.ACCESSORY}>Accessoire</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Kilométrage" type="number" placeholder="Ex: 50000" value={formData.mileage} onChange={v => setFormData({...formData, mileage: v})} />
              <Input label="Année" type="number" placeholder="2023" value={formData.year.toString()} onChange={v => setFormData({...formData, year: parseInt(v)})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Couleur" placeholder="Noir mat" value={formData.color} onChange={v => setFormData({...formData, color: v})} required />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">État ({formData.condition}/10)</label>
                <input 
                  type="range" min="1" max="10" 
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  value={formData.condition}
                  onChange={(e) => setFormData({...formData, condition: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Ville / Quartier" placeholder="Ex: Abidjan, Cocody" value={formData.location} onChange={v => setFormData({...formData, location: v})} required />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Statut</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-sm appearance-none shadow-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as ItemStatus})}
                >
                  <option value="used">Occasion</option>
                  <option value="new">Neuf</option>
                  <option value="imported">Importé</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
              <textarea 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-sm min-h-[120px] shadow-sm"
                placeholder="Détaillez votre annonce (options, entretien...)"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {/* Premium Boost Option - REFINED */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Visibilité de l'annonce</label>
               <div 
                onClick={() => setIsBoosted(!isBoosted)}
                className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer relative overflow-hidden group ${isBoosted ? 'border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-100/20' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
              >
                <div className="absolute -right-4 -bottom-4 text-indigo-100/50 group-hover:scale-110 transition-transform duration-700">
                  <Rocket size={100} />
                </div>
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`p-4 rounded-2xl transition-all duration-500 ${isBoosted ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                    <Rocket size={24} className={isBoosted ? 'animate-bounce' : ''} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      Option "Premium Boost"
                      {isBoosted && <span className="text-[8px] bg-amber-400 text-white px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Activé</span>}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                      Votre annonce sera épinglée en haut des résultats avec un badge VIP. Vendez jusqu'à 5x plus vite !
                    </p>
                    {isBoosted && (
                      <div className="mt-3 flex gap-2">
                        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg border border-indigo-100 flex items-center gap-2">
                          <Star size={12} className="text-amber-400 fill-current" />
                          <span className="text-[8px] font-black uppercase text-indigo-600">Top Annonce</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isBoosted ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200'}`}>
                    {isBoosted && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-4.5 rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-70 disabled:active:scale-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {uploadingImages ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Upload des images...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Publication en cours...
              </>
            ) : (
              isBoosted ? 'Lancer mon annonce Boostée' : 'Publier gratuitement'
            )}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string, required?: boolean }> = ({ label, value, onChange, placeholder, type = "text", required }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-sm shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/5"
    />
  </div>
);

export default CreateListingModal;
