import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Plus, Upload, Camera, Video, CheckCircle2, Circle, Download, FileText, 
  Image as ImageIcon, Trash2, ArrowLeft, Cog, Car, Zap, CircleDot, 
  Settings, Wrench, AlertTriangle, AlertCircle, CheckCircle, 
  MinusCircle, Clock, RefreshCw, Sparkles, Activity, TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { User } from '../types';

type RatingLevel = 'critical' | 'below_average' | 'average' | 'above_average' | 'excellent' | null;

interface InspectionPoint {
  id: string;
  label: string;
  rating: RatingLevel;
  custom: boolean;
  photos: string[];
  videos: string[];
  notes?: string;
}

// Configuration sans JSX (on utilisera des fonctions dans le composant)
const RATING_LEVELS_CONFIG: Array<{ value: RatingLevel; label: string; color: string; score: number; bgGradient: string; iconName: string }> = [
  { value: 'critical', label: 'Critique', color: 'bg-red-500 text-white border-red-600', score: 0, bgGradient: 'from-red-50 to-red-100', iconName: 'AlertTriangle' },
  { value: 'below_average', label: 'Moins que la moyenne', color: 'bg-orange-500 text-white border-orange-600', score: 25, bgGradient: 'from-orange-50 to-orange-100', iconName: 'MinusCircle' },
  { value: 'average', label: 'Moyenne', color: 'bg-amber-500 text-white border-amber-600', score: 50, bgGradient: 'from-amber-50 to-amber-100', iconName: 'Clock' },
  { value: 'above_average', label: 'Plus que la moyenne', color: 'bg-blue-500 text-white border-blue-600', score: 75, bgGradient: 'from-blue-50 to-blue-100', iconName: 'CheckCircle' },
  { value: 'excellent', label: 'Excellente', color: 'bg-green-500 text-white border-green-600', score: 100, bgGradient: 'from-green-50 to-green-100', iconName: 'Sparkles' },
];

const CATEGORY_CONFIG_DATA: Record<string, { color: string; gradient: string; bgColor: string; iconName: string }> = {
  engine: { color: 'text-red-600', gradient: 'from-red-50 via-orange-50 to-red-100', bgColor: 'bg-red-500', iconName: 'Cog' },
  body: { color: 'text-blue-600', gradient: 'from-blue-50 via-indigo-50 to-blue-100', bgColor: 'bg-blue-500', iconName: 'Car' },
  electronics: { color: 'text-yellow-600', gradient: 'from-yellow-50 via-amber-50 to-yellow-100', bgColor: 'bg-yellow-500', iconName: 'Zap' },
  tires: { color: 'text-purple-600', gradient: 'from-purple-50 via-pink-50 to-purple-100', bgColor: 'bg-purple-500', iconName: 'CircleDot' },
  suspension: { color: 'text-indigo-600', gradient: 'from-indigo-50 via-purple-50 to-indigo-100', bgColor: 'bg-indigo-500', iconName: 'Settings' },
  interior: { color: 'text-teal-600', gradient: 'from-teal-50 via-cyan-50 to-teal-100', bgColor: 'bg-teal-500', iconName: 'Wrench' },
};

interface InspectionCategory {
  id: string;
  name: string;
  points: InspectionPoint[];
  weight: number; // Poids pour le calcul du score (1-5)
}

interface ExpertiseModalProps {
  onClose: () => void;
  onSubmit: (expertise: ExpertiseData) => void;
  mechanic: User;
  vehicle?: {
    make: string;
    model: string;
    year?: number;
    plateNumber?: string;
  };
  buyer?: User;
}

export interface ExpertiseData {
  vehicle: {
    make: string;
    model: string;
    year?: number;
    plateNumber?: string;
  };
  mechanicId: string;
  buyerId?: string;
  inspectionCategories: InspectionCategory[];
  healthScore: number;
  recommendations: string[];
  createdAt: Date;
  pdfUrl?: string;
}

const ExpertiseModal: React.FC<ExpertiseModalProps> = ({ 
  onClose, 
  onSubmit, 
  mechanic,
  vehicle = { make: '', model: '', year: undefined, plateNumber: '' },
  buyer
}) => {
  // Obtenir les niveaux de rating avec icônes React
  const RATING_LEVELS = useMemo(() => RATING_LEVELS_CONFIG.map(config => ({
    ...config,
    icon: config.iconName === 'AlertTriangle' ? <AlertTriangle size={16} className="inline" /> :
          config.iconName === 'MinusCircle' ? <MinusCircle size={16} className="inline" /> :
          config.iconName === 'Clock' ? <Clock size={16} className="inline" /> :
          config.iconName === 'CheckCircle' ? <CheckCircle size={16} className="inline" /> :
          <Sparkles size={16} className="inline" />
  })), []);

  // Obtenir la configuration des catégories avec icônes React
  const CATEGORY_CONFIG = useMemo(() => {
    const iconMap: Record<string, React.ReactNode> = {
      Cog: <Cog size={24} />,
      Car: <Car size={24} />,
      Zap: <Zap size={24} />,
      CircleDot: <CircleDot size={24} />,
      Settings: <Settings size={24} />,
      Wrench: <Wrench size={24} />,
    };
    
    return Object.entries(CATEGORY_CONFIG_DATA).reduce((acc, [key, config]) => {
      acc[key] = {
        ...config,
        icon: iconMap[config.iconName] || <Settings size={24} />
      };
      return acc;
    }, {} as Record<string, { icon: React.ReactNode; color: string; gradient: string; bgColor: string }>);
  }, []);

  const [vehicleData, setVehicleData] = useState(vehicle);
  const [galleryUpdateKey, setGalleryUpdateKey] = useState(0); // Force re-render de la galerie
  const [renderTrigger, setRenderTrigger] = useState(0); // Trigger pour forcer re-render
  
  const [categories, setCategories] = useState<InspectionCategory[]>([
    {
      id: 'engine',
      name: 'Moteur',
      weight: 5,
      points: [
        { id: 'engine_oil', label: 'Niveau et qualité de l\'huile moteur', rating: null, custom: false, photos: [], videos: [] },
        { id: 'engine_coolant', label: 'Liquide de refroidissement', rating: null, custom: false, photos: [], videos: [] },
        { id: 'engine_belt', label: 'Courroie de distribution', rating: null, custom: false, photos: [], videos: [] },
        { id: 'engine_filter', label: 'Filtres (air, huile, carburant)', rating: null, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'body',
      name: 'Carrosserie',
      weight: 3,
      points: [
        { id: 'body_paint', label: 'État de la peinture', rating: null, custom: false, photos: [], videos: [] },
        { id: 'body_dents', label: 'Bosses et rayures', rating: null, custom: false, photos: [], videos: [] },
        { id: 'body_rust', label: 'Corrosion/rouille', rating: null, custom: false, photos: [], videos: [] },
        { id: 'body_glass', label: 'Vitres et pare-brise', rating: null, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'electronics',
      name: 'Électronique',
      weight: 4,
      points: [
        { id: 'elec_battery', label: 'Batterie et charge', rating: null, custom: false, photos: [], videos: [] },
        { id: 'elec_lights', label: 'Éclairage (phares, feux)', rating: null, custom: false, photos: [], videos: [] },
        { id: 'elec_dashboard', label: 'Tableau de bord et indicateurs', rating: null, custom: false, photos: [], videos: [] },
        { id: 'elec_computer', label: 'Calculateur et codes erreur', rating: null, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'tires',
      name: 'Pneumatiques',
      weight: 4,
      points: [
        { id: 'tire_tread', label: 'Profondeur de la bande de roulement', rating: null, custom: false, photos: [], videos: [] },
        { id: 'tire_pressure', label: 'Pression des pneus', rating: null, custom: false, photos: [], videos: [] },
        { id: 'tire_wear', label: 'Usure inégale', rating: null, custom: false, photos: [], videos: [] },
        { id: 'tire_damage', label: 'Dommages visibles', rating: null, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'suspension',
      name: 'Suspension & Freinage',
      weight: 4,
      points: [
        { id: 'susp_shocks', label: 'Amortisseurs', rating: null, custom: false, photos: [], videos: [] },
        { id: 'susp_brakes', label: 'Plaquettes et disques de frein', rating: null, custom: false, photos: [], videos: [] },
        { id: 'susp_brake_fluid', label: 'Liquide de frein', rating: null, custom: false, photos: [], videos: [] },
        { id: 'susp_alignment', label: 'Géométrie et alignement', rating: null, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'interior',
      name: 'Intérieur',
      weight: 2,
      points: [
        { id: 'int_seats', label: 'Sièges et tapis', rating: null, custom: false, photos: [], videos: [] },
        { id: 'int_controls', label: 'Commandes et boutons', rating: null, custom: false, photos: [], videos: [] },
        { id: 'int_ac', label: 'Climatisation/chauffage', rating: null, custom: false, photos: [], videos: [] },
      ]
    }
  ]);
  
  // Force re-render quand les catégories changent
  useEffect(() => {
    console.log('🔄 [EFFECT] Catégories mises à jour, trigger re-render');
    setRenderTrigger(prev => prev + 1);
  }, [categories]);
  
  const [customPointInput, setCustomPointInput] = useState<Record<string, string>>({});
  const [healthScore, setHealthScore] = useState<number>(0);
  const [displayScore, setDisplayScore] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Calcul du Score de Santé Global basé sur les notes individuelles
  const calculateHealthScore = useCallback(() => {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const newRecommendations: string[] = [];

    categories.forEach(category => {
      // Calculer le score moyen de la catégorie basé sur les notes
      let categoryTotalScore = 0;
      let ratedPointsCount = 0;
      
      category.points.forEach(point => {
        if (point.rating !== null) {
          const ratingData = RATING_LEVELS.find(r => r.value === point.rating);
          if (ratingData) {
            categoryTotalScore += ratingData.score;
            ratedPointsCount++;
            
            // Générer des recommandations basées sur les notes individuelles
            if (point.rating === 'critical') {
              newRecommendations.push(`🚨 ${point.label}: État critique nécessitant une intervention immédiate`);
            } else if (point.rating === 'below_average') {
              newRecommendations.push(`⚠️ ${point.label}: État inférieur à la moyenne, attention recommandée`);
            }
          }
        }
      });
      
      // Score moyen de la catégorie (0-100)
      const categoryScore = ratedPointsCount > 0 ? categoryTotalScore / ratedPointsCount : 0;
      
      // Appliquer le poids de la catégorie
      const weightedScore = categoryScore * category.weight;
      totalWeightedScore += weightedScore;
      totalWeight += category.weight * (ratedPointsCount > 0 ? 1 : 0); // Ne compter que si au moins un point est noté

      // Générer des recommandations globales pour la catégorie
      if (ratedPointsCount > 0) {
        if (categoryScore < 50) {
          newRecommendations.push(`⚠️ ${category.name}: Nécessite une attention immédiate (Score: ${Math.round(categoryScore)}%)`);
        } else if (categoryScore < 75) {
          newRecommendations.push(`📋 ${category.name}: Contrôles recommandés (Score: ${Math.round(categoryScore)}%)`);
        }
      }
    });

    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    setHealthScore(finalScore);
    setRecommendations(newRecommendations);
  }, [categories, RATING_LEVELS]);

  const setPointRating = (categoryId: string, pointId: string, rating: RatingLevel) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          points: category.points.map(point => 
            point.id === pointId ? { ...point, rating } : point
          )
        };
      }
      return category;
    }));
  };

  const addCustomPoint = (categoryId: string) => {
    const customLabel = customPointInput[categoryId]?.trim();
    if (!customLabel) return;

    const newPoint: InspectionPoint = {
      id: `custom_${Date.now()}`,
      label: customLabel,
      rating: null,
      custom: true,
      photos: [],
      videos: []
    };

    setCategories(prev => prev.map(category => 
      category.id === categoryId 
        ? { ...category, points: [...category.points, newPoint] }
        : category
    ));
    setCustomPointInput(prev => ({ ...prev, [categoryId]: '' }));
  };

  const removeCustomPoint = (categoryId: string, pointId: string) => {
    setCategories(prev => prev.map(category => 
      category.id === categoryId
        ? { ...category, points: category.points.filter(p => p.id !== pointId) }
        : category
    ));
  };

  const captureFromCamera = (type: 'photo' | 'video'): Promise<File> => {
    return new Promise((resolve, reject) => {
      console.log(`📷 [CAMERA] Création input pour ${type}`);
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'photo' ? 'image/*' : 'video/*';
      input.capture = 'environment';
      
      let resolved = false;
      
      const cleanup = () => {
        try {
          input.remove();
        } catch (e) {
          console.warn('Erreur cleanup:', e);
        }
      };
      
      input.onchange = (e) => {
        console.log(`📷 [CAMERA] onChange déclenché`);
        const file = (e.target as HTMLInputElement).files?.[0];
        cleanup();
        
        if (file && !resolved) {
          resolved = true;
          console.log(`📷 [CAMERA] Fichier sélectionné:`, file.name, file.size, 'bytes');
          resolve(file);
        } else if (!resolved) {
          resolved = true;
          reject(new Error('Aucun fichier sélectionné'));
        }
      };
      
      input.oncancel = () => {
        console.log(`📷 [CAMERA] Capture annulée par l'utilisateur`);
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error('Capture annulée'));
        }
      };
      
      // Ajouter au DOM pour compatibilité
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      document.body.appendChild(input);
      
      console.log(`📷 [CAMERA] Ouverture dialogue fichier`);
      input.click();
    });
  };

  const handleCapturePhoto = async (categoryId: string, pointId: string) => {
    try {
      console.log('📸 [CAPTURE] Démarrage capture photo');
      const file = await captureFromCamera('photo');
      console.log('📸 [CAPTURE] Fichier obtenu:', file.name, file.size, 'bytes');
      
      // Créer preview locale IMMÉDIATEMENT
      const blobUrl = URL.createObjectURL(file);
      console.log('📸 [PREVIEW] Blob URL créée:', blobUrl);
      
      // Mise à jour IMMÉDIATE de l'état avec la preview
      setCategories(prevCategories => {
        console.log('📸 [STATE] Mise à jour état avec preview locale');
        const newCategories = prevCategories.map(cat => {
          if (cat.id !== categoryId) return cat;
          
          const newPoints = cat.points.map(pt => {
            if (pt.id !== pointId) return pt;
            
            const existingPhotos = Array.isArray(pt.photos) ? [...pt.photos] : [];
            const newPhotos = [...existingPhotos, blobUrl];
            console.log('📸 [STATE] Point trouvé - Photos avant:', existingPhotos.length, 'après:', newPhotos.length);
            
            return { ...pt, photos: newPhotos };
          });
          
          return { ...cat, points: newPoints };
        });
        
        // Vérification immédiate
        const checkCategory = newCategories.find(c => c.id === categoryId);
        const checkPoint = checkCategory?.points.find(p => p.id === pointId);
        console.log('📸 [STATE] Vérification après update - Photos:', checkPoint?.photos?.length || 0);
        console.log('📸 [STATE] URLs:', checkPoint?.photos);
        
        return newCategories;
      });
      
      // Forcer re-render avec délai pour garantir la mise à jour
      setTimeout(() => {
        setGalleryUpdateKey(k => {
          const newKey = k + 1;
          console.log('📸 [RENDER] Force re-render avec clé:', newKey);
          return newKey;
        });
      }, 50);
      
      // Upload en arrière-plan - NE PAS retirer la preview en cas d'erreur
      handleFileUpload(categoryId, pointId, file, 'photo').then(() => {
        console.log('✅ [UPLOAD] Upload terminé avec succès');
      }).catch(uploadError => {
        console.error('❌ [UPLOAD] Erreur upload:', uploadError);
        // Garder la preview locale même en cas d'erreur
        // Afficher un avertissement mais ne pas supprimer la photo
        console.warn('⚠️ [UPLOAD] Erreur upload mais preview locale conservée');
        // L'utilisateur peut toujours voir et utiliser la photo localement
      });
      
    } catch (error: any) {
      if (error.message !== 'Capture annulée') {
        console.error('❌ [ERROR] Erreur capture:', error);
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleCaptureVideo = async (categoryId: string, pointId: string) => {
    try {
      console.log('🎥 [CAPTURE] Démarrage capture vidéo');
      const file = await captureFromCamera('video');
      console.log('🎥 [CAPTURE] Fichier obtenu:', file.name, file.size, 'bytes');
      
      // Créer preview locale IMMÉDIATEMENT
      const blobUrl = URL.createObjectURL(file);
      console.log('🎥 [PREVIEW] Blob URL créée:', blobUrl);
      
      // Mise à jour IMMÉDIATE de l'état avec la preview
      setCategories(prevCategories => {
        console.log('🎥 [STATE] Mise à jour état avec preview locale');
        const newCategories = prevCategories.map(cat => {
          if (cat.id !== categoryId) return cat;
          
          const newPoints = cat.points.map(pt => {
            if (pt.id !== pointId) return pt;
            
            const existingVideos = Array.isArray(pt.videos) ? [...pt.videos] : [];
            const newVideos = [...existingVideos, blobUrl];
            console.log('🎥 [STATE] Point trouvé - Vidéos avant:', existingVideos.length, 'après:', newVideos.length);
            
            return { ...pt, videos: newVideos };
          });
          
          return { ...cat, points: newPoints };
        });
        
        // Vérification immédiate
        const checkCategory = newCategories.find(c => c.id === categoryId);
        const checkPoint = checkCategory?.points.find(p => p.id === pointId);
        console.log('🎥 [STATE] Vérification après update - Vidéos:', checkPoint?.videos?.length || 0);
        
        return newCategories;
      });
      
      // Forcer re-render IMMÉDIAT
      setGalleryUpdateKey(k => {
        const newKey = k + 1;
        console.log('🎥 [RENDER] Force re-render avec clé:', newKey);
        return newKey;
      });
      
      // Upload en arrière-plan - NE PAS retirer la preview en cas d'erreur
      handleFileUpload(categoryId, pointId, file, 'video').then(() => {
        console.log('✅ [UPLOAD] Upload terminé avec succès');
      }).catch(uploadError => {
        console.error('❌ [UPLOAD] Erreur upload:', uploadError);
        // Garder la preview locale même en cas d'erreur
        // Afficher un avertissement mais ne pas supprimer la vidéo
        console.warn('⚠️ [UPLOAD] Erreur upload mais preview locale conservée');
        // L'utilisateur peut toujours voir et utiliser la vidéo localement
      });
      
    } catch (error: any) {
      if (error.message !== 'Capture annulée') {
        console.error('❌ [ERROR] Erreur capture:', error);
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleFileUpload = async (
    categoryId: string, 
    pointId: string, 
    file: File, 
    type: 'photo' | 'video'
  ) => {
    try {
      // Valider le type de fichier
      if (type === 'photo' && !file.type.startsWith('image/')) {
        throw new Error('Le fichier sélectionné n\'est pas une image');
      }
      if (type === 'video' && !file.type.startsWith('video/')) {
        throw new Error('Le fichier sélectionné n\'est pas une vidéo');
      }

      // Valider la taille (max 10MB pour photos, 50MB pour vidéos)
      const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`Le fichier est trop volumineux (max: ${type === 'photo' ? '10MB' : '50MB'})`);
      }

      const fileExt = file.name.split('.').pop() || (type === 'photo' ? 'jpg' : 'mp4');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `expertise/${mechanic.id}/${fileName}`;

      console.log(`📤 Upload ${type} vers: ${filePath}`);

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expertise-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erreur upload Supabase:', uploadError);
        // Ne pas throw pour éviter d'afficher le modal d'erreur
        // La preview locale sera conservée
        console.warn('⚠️ Upload échoué, preview locale conservée');
        return; // Sortir silencieusement
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('expertise-media')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error('❌ Impossible d\'obtenir l\'URL publique du fichier');
        console.warn('⚠️ Upload réussi mais URL non disponible, preview locale conservée');
        return; // Sortir silencieusement, la preview locale reste visible
      }

      const url = urlData.publicUrl;
      console.log(`✅ URL obtenue: ${url}`);
      console.log(`📝 Mise à jour de l'état pour categoryId: ${categoryId}, pointId: ${pointId}, type: ${type}`);

      // Remplacer preview locale par URL distante
      setCategories(prev => {
        const newCategories = prev.map(cat => {
          if (cat.id !== categoryId) return cat;
          
          const newPoints = cat.points.map(pt => {
            if (pt.id !== pointId) return pt;
            
            if (type === 'photo') {
              const photos = Array.isArray(pt.photos) ? [...pt.photos] : [];
              // Remplacer blob: par URL distante
              const updatedPhotos = photos.map(p => (typeof p === 'string' && p.startsWith('blob:')) ? url : p);
              // Si URL pas présente, l'ajouter
              if (!updatedPhotos.includes(url)) updatedPhotos.push(url);
              console.log(`📸 [REPLACE] Remplacement blob par URL. Total: ${updatedPhotos.length}`);
              return { ...pt, photos: updatedPhotos };
            } else {
              const videos = Array.isArray(pt.videos) ? [...pt.videos] : [];
              const updatedVideos = videos.map(v => (typeof v === 'string' && v.startsWith('blob:')) ? url : v);
              if (!updatedVideos.includes(url)) updatedVideos.push(url);
              console.log(`🎥 [REPLACE] Remplacement blob par URL. Total: ${updatedVideos.length}`);
              return { ...pt, videos: updatedVideos };
            }
          });
          
          return { ...cat, points: newPoints };
        });
        
        setGalleryUpdateKey(k => k + 1);
        return newCategories;
      });

      console.log(`${type === 'photo' ? 'Photo' : 'Vidéo'} ajoutée avec succès au point`);
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'upload:', error);
      const errorMessage = error?.message || 'Erreur lors de l\'upload du fichier';
      alert(errorMessage);
      throw error;
    }
  };

  const removeMedia = (categoryId: string, pointId: string, url: string, type: 'photo' | 'video') => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          points: category.points.map(point => {
            if (point.id === pointId) {
              return {
                ...point,
                photos: type === 'photo' ? point.photos.filter(p => p !== url) : point.photos,
                videos: type === 'video' ? point.videos.filter(v => v !== url) : point.videos,
              };
            }
            return point;
          })
        };
      }
      return category;
    }));
  };

  const generatePDF = async (): Promise<string> => {
    const doc = new jsPDF();
    
    // Logo et en-tête
    doc.setFillColor(99, 102, 241); // Indigo
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MƆ̆TTO', 20, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Rapport d\'Expertise Véhicule', 20, 35);
    
    // Informations du véhicule
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    let yPos = 50;
    doc.text('Informations du Véhicule', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Marque: ${vehicleData.make}`, 20, yPos);
    yPos += 7;
    doc.text(`Modèle: ${vehicleData.model}`, 20, yPos);
    yPos += 7;
    if (vehicleData.year) {
      doc.text(`Année: ${vehicleData.year}`, 20, yPos);
      yPos += 7;
    }
    if (vehicleData.plateNumber) {
      doc.text(`Immatriculation: ${vehicleData.plateNumber}`, 20, yPos);
      yPos += 7;
    }
    yPos += 5;

    // Score de santé
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Score de Santé Global', 20, yPos);
    yPos += 10;
    
    const scoreColor = healthScore >= 75 ? [34, 197, 94] : healthScore >= 50 ? [251, 191, 36] : [239, 68, 68];
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.rect(20, yPos - 5, 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${healthScore}%`, 35, yPos + 5);
    yPos += 20;

    // Détails par catégorie
    categories.forEach((category, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Calculer le score de la catégorie basé sur les notes
      let categoryTotalScore = 0;
      let ratedPointsCount = 0;
      category.points.forEach(point => {
        if (point.rating !== null) {
          const ratingData = RATING_LEVELS.find(r => r.value === point.rating);
          if (ratingData) {
            categoryTotalScore += ratingData.score;
            ratedPointsCount++;
          }
        }
      });
      const categoryScore = ratedPointsCount > 0 ? Math.round(categoryTotalScore / ratedPointsCount) : 0;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${category.name} (${categoryScore}%)`, 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      category.points.forEach(point => {
        if (point.rating !== null) {
          const ratingData = RATING_LEVELS.find(r => r.value === point.rating);
          const ratingLabel = ratingData?.label || 'Non noté';
          const statusColor = ratingData ? 
            (ratingData.score >= 75 ? [34, 197, 94] : 
             ratingData.score >= 50 ? [251, 191, 36] : 
             ratingData.score >= 25 ? [239, 127, 26] : 
             [239, 68, 68]) : [128, 128, 128];
          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.text(`${ratingLabel}: ${point.label}`, 25, yPos);
        } else {
          doc.setTextColor(128, 128, 128);
          doc.text(`Non noté: ${point.label}`, 25, yPos);
        }
        yPos += 5;
      });
      yPos += 5;
    });

    // Recommandations
    if (recommendations.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Recommandations', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      recommendations.forEach(rec => {
        doc.text(rec, 20, yPos);
        yPos += 7;
      });
    }

    // Informations expert
    doc.addPage();
    yPos = 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations Expert', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Expert: ${mechanic.shopName || mechanic.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPos);

    const pdfBlob = doc.output('blob');
    const fileName = `expertise_${Date.now()}.pdf`;
    const filePath = `expertise/${mechanic.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('expertise-reports')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error('Erreur upload PDF:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('expertise-reports')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleGenerateReport = async () => {
    calculateHealthScore();
    
    try {
      const pdfUrl = await generatePDF();
      
      const expertiseData: ExpertiseData = {
        vehicle: vehicleData,
        mechanicId: mechanic.id,
        buyerId: buyer?.id,
        inspectionCategories: categories,
        healthScore,
        recommendations,
        createdAt: new Date(),
        pdfUrl
      };

      onSubmit(expertiseData);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      alert('Erreur lors de la génération du rapport PDF');
    }
  };

  // Recalculer le score à chaque changement
  useEffect(() => {
    calculateHealthScore();
  }, [calculateHealthScore]);

  // Animation du score
  useEffect(() => {
    if (healthScore !== displayScore) {
      setIsAnimating(true);
      const duration = 1000; // 1 seconde
      const steps = 60;
      const increment = (healthScore - displayScore) / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        const newValue = Math.round(displayScore + (increment * currentStep));
        
        if (currentStep >= steps || (increment > 0 && newValue >= healthScore) || (increment < 0 && newValue <= healthScore)) {
          setDisplayScore(healthScore);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayScore(newValue);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [healthScore]);

  // Réinitialiser tout le formulaire
  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toute l\'expertise ? Toutes les données seront perdues.')) {
      setVehicleData({ make: '', model: '', year: undefined, plateNumber: '' });
      setCategories([
        {
          id: 'engine',
          name: 'Moteur',
          weight: 5,
          points: [
            { id: 'engine_oil', label: 'Niveau et qualité de l\'huile moteur', rating: null, custom: false, photos: [], videos: [] },
            { id: 'engine_coolant', label: 'Liquide de refroidissement', rating: null, custom: false, photos: [], videos: [] },
            { id: 'engine_belt', label: 'Courroie de distribution', rating: null, custom: false, photos: [], videos: [] },
            { id: 'engine_filter', label: 'Filtres (air, huile, carburant)', rating: null, custom: false, photos: [], videos: [] },
          ]
        },
        {
          id: 'body',
          name: 'Carrosserie',
          weight: 3,
          points: [
            { id: 'body_paint', label: 'État de la peinture', rating: null, custom: false, photos: [], videos: [] },
            { id: 'body_dents', label: 'Bosses et rayures', rating: null, custom: false, photos: [], videos: [] },
            { id: 'body_rust', label: 'Corrosion/rouille', rating: null, custom: false, photos: [], videos: [] },
            { id: 'body_glass', label: 'Vitres et pare-brise', rating: null, custom: false, photos: [], videos: [] },
          ]
        },
        {
          id: 'electronics',
          name: 'Électronique',
          weight: 4,
          points: [
            { id: 'elec_battery', label: 'Batterie et charge', rating: null, custom: false, photos: [], videos: [] },
            { id: 'elec_lights', label: 'Éclairage (phares, feux)', rating: null, custom: false, photos: [], videos: [] },
            { id: 'elec_dashboard', label: 'Tableau de bord et indicateurs', rating: null, custom: false, photos: [], videos: [] },
            { id: 'elec_computer', label: 'Calculateur et codes erreur', rating: null, custom: false, photos: [], videos: [] },
          ]
        },
        {
          id: 'tires',
          name: 'Pneumatiques',
          weight: 4,
          points: [
            { id: 'tire_tread', label: 'Profondeur de la bande de roulement', rating: null, custom: false, photos: [], videos: [] },
            { id: 'tire_pressure', label: 'Pression des pneus', rating: null, custom: false, photos: [], videos: [] },
            { id: 'tire_wear', label: 'Usure inégale', rating: null, custom: false, photos: [], videos: [] },
            { id: 'tire_damage', label: 'Dommages visibles', rating: null, custom: false, photos: [], videos: [] },
          ]
        },
        {
          id: 'suspension',
          name: 'Suspension & Freinage',
          weight: 4,
          points: [
            { id: 'susp_shocks', label: 'Amortisseurs', rating: null, custom: false, photos: [], videos: [] },
            { id: 'susp_brakes', label: 'Plaquettes et disques de frein', rating: null, custom: false, photos: [], videos: [] },
            { id: 'susp_brake_fluid', label: 'Liquide de frein', rating: null, custom: false, photos: [], videos: [] },
            { id: 'susp_alignment', label: 'Géométrie et alignement', rating: null, custom: false, photos: [], videos: [] },
          ]
        },
        {
          id: 'interior',
          name: 'Intérieur',
          weight: 2,
          points: [
            { id: 'int_seats', label: 'Sièges et tapis', rating: null, custom: false, photos: [], videos: [] },
            { id: 'int_controls', label: 'Commandes et boutons', rating: null, custom: false, photos: [], videos: [] },
            { id: 'int_ac', label: 'Climatisation/chauffage', rating: null, custom: false, photos: [], videos: [] },
          ]
        }
      ]);
      setHealthScore(0);
      setDisplayScore(0);
      setRecommendations([]);
      setCustomPointInput({});
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex flex-col">
      {/* Header avec bouton retour - Fixe en haut */}
      <div className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Expertise Véhicule</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">Check-list d'inspection interactive</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu scrollable - Avec padding-top pour compenser le header fixe et padding-bottom pour les boutons */}
      <div className="flex-1 overflow-y-auto pt-[88px] pb-32 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Vehicle Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Marque</label>
            <input
              type="text"
              value={vehicleData.make}
              onChange={(e) => setVehicleData(prev => ({ ...prev, make: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
              placeholder="Ex: Toyota"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Modèle</label>
            <input
              type="text"
              value={vehicleData.model}
              onChange={(e) => setVehicleData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
              placeholder="Ex: Corolla"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Année</label>
            <input
              type="number"
              value={vehicleData.year || ''}
              onChange={(e) => setVehicleData(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
              placeholder="Ex: 2020"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Immatriculation</label>
            <input
              type="text"
              value={vehicleData.plateNumber || ''}
              onChange={(e) => setVehicleData(prev => ({ ...prev, plateNumber: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
              placeholder="Ex: 1234 AB 01"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryConfig = CATEGORY_CONFIG[category.id] || { 
              icon: <Settings size={24} />, 
              color: 'text-gray-600', 
              gradient: 'from-gray-50 to-gray-100',
              bgColor: 'bg-gray-500'
            };
            
            return (
            <div key={category.id} className={`bg-gradient-to-br ${categoryConfig.gradient} rounded-3xl p-6 border-2 border-white shadow-xl hover:shadow-2xl transition-all duration-300`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`${categoryConfig.bgColor} p-3 rounded-2xl text-white shadow-lg transform rotate-[-5deg] hover:rotate-0 transition-transform duration-300`}>
                    {categoryConfig.icon}
                  </div>
                  <div>
                    <h3 className={`text-xl font-black ${categoryConfig.color} uppercase tracking-wide`}>{category.name}</h3>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {category.points.filter(p => p.rating !== null).length}/{category.points.length} Points notés
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl ${categoryConfig.bgColor}/20 ${categoryConfig.color} font-black text-sm`}>
                  Points: {category.points.filter(p => p.rating !== null).length}/{category.points.length}
                </div>
              </div>

              <div className="space-y-4">
                {category.points.map((point) => (
                  <div key={point.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 border-white shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-2 h-2 rounded-full ${point.rating ? (point.rating === 'excellent' ? 'bg-green-500' : point.rating === 'above_average' ? 'bg-blue-500' : point.rating === 'average' ? 'bg-amber-500' : point.rating === 'below_average' ? 'bg-orange-500' : 'bg-red-500') : 'bg-gray-300'} animate-pulse`} />
                          <p className="font-bold text-gray-900 text-sm">
                            {point.label}
                          </p>
                        </div>

                        {/* Rating Buttons */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {RATING_LEVELS.map((level) => (
                            <button
                              key={level.value || 'null'}
                              onClick={() => setPointRating(category.id, point.id, level.value)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 ${
                                point.rating === level.value
                                  ? `${level.color} border-current shadow-lg scale-105`
                                  : `bg-gradient-to-r ${level.bgGradient} text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm`
                              }`}
                            >
                              {level.icon}
                              {level.label}
                            </button>
                          ))}
                        </div>

                        {/* Selected Rating Display */}
                        {point.rating && (
                          <div className={`mb-3 px-4 py-3 rounded-xl bg-gradient-to-r ${RATING_LEVELS.find(r => r.value === point.rating)?.bgGradient || 'bg-gray-100'} border-2 border-white shadow-md flex items-center gap-2`}>
                            {RATING_LEVELS.find(r => r.value === point.rating)?.icon}
                            <span className="text-xs font-black text-gray-800">
                              Note sélectionnée: {RATING_LEVELS.find(r => r.value === point.rating)?.label}
                            </span>
                          </div>
                        )}

                        {/* Media Gallery - Toujours visible pour permettre l'ajout et la visualisation */}
                        <div className="mt-4 space-y-3">
                          {/* En-tête de la galerie */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Camera size={16} className="text-gray-500" />
                              <span className="text-xs font-black text-gray-600 uppercase tracking-wide">
                                Galerie ({((Array.isArray(point.photos) ? point.photos.length : 0) + (Array.isArray(point.videos) ? point.videos.length : 0))})
                              </span>
                            </div>
                            {((Array.isArray(point.photos) && point.photos.length > 0) || (Array.isArray(point.videos) && point.videos.length > 0)) && (
                              <button
                                onClick={() => {
                                  // Scroll vers la galerie pour la rendre visible
                                  const element = document.querySelector(`[data-gallery="${category.id}-${point.id}"]`);
                                  element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                              >
                                Voir tout
                              </button>
                            )}
                          </div>

                          {/* Galerie de médias */}
                          <div 
                            key={`gallery-${category.id}-${point.id}-${galleryUpdateKey}`}
                            data-gallery={`${category.id}-${point.id}`}
                            className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border-2 border-gray-200 ${((!Array.isArray(point.photos) || point.photos.length === 0) && (!Array.isArray(point.videos) || point.videos.length === 0)) ? 'border-dashed' : ''}`}
                          >
                            {((!Array.isArray(point.photos) || point.photos.length === 0) && (!Array.isArray(point.videos) || point.videos.length === 0)) ? (
                              <div className="text-center py-4">
                                <p className="text-xs text-gray-400 font-medium italic">
                                  Aucun média pour le moment
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3" key={`grid-${galleryUpdateKey}`}>
                                {/* Photos */}
                                {(() => {
                                  const photos = Array.isArray(point.photos) ? point.photos : [];
                                  console.log(`🖼️ [RENDER] Rendu galerie photos - Point: ${point.id}, Nombre: ${photos.length}, Clé: ${galleryUpdateKey}`);
                                  return photos.length > 0 ? photos.map((photo, idx) => (
                                    <div 
                                      key={`photo-${category.id}-${point.id}-${idx}-${Date.now()}-${galleryUpdateKey}`} 
                                      className="relative group aspect-square bg-gray-200 rounded-lg overflow-hidden"
                                    >
                                      <img 
                                        src={photo} 
                                        alt={`Photo ${idx + 1}`} 
                                        className="w-full h-full object-cover cursor-pointer"
                                        onLoad={() => console.log(`✅ [IMAGE] Image ${idx + 1} chargée:`, photo.substring(0, 50))}
                                        onError={(e) => {
                                          console.error(`❌ [IMAGE] Erreur chargement image ${idx + 1}:`, photo);
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                        onClick={() => window.open(photo, '_blank')}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMedia(category.id, point.id, photo, 'photo');
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        📷
                                      </div>
                                    </div>
                                  )) : null;
                                })()}
                                
                                {/* Vidéos */}
                                {(() => {
                                  const videos = Array.isArray(point.videos) ? point.videos : [];
                                  console.log(`🎥 [RENDER] Rendu galerie vidéos - Point: ${point.id}, Nombre: ${videos.length}, Clé: ${galleryUpdateKey}`);
                                  return videos.length > 0 ? videos.map((video, idx) => (
                                    <div 
                                      key={`video-${category.id}-${point.id}-${idx}-${Date.now()}-${galleryUpdateKey}`} 
                                      className="relative group aspect-square bg-gray-200 rounded-lg overflow-hidden"
                                    >
                                      <video 
                                        src={video} 
                                        className="w-full h-full object-cover cursor-pointer"
                                        onLoadedData={() => console.log(`✅ [VIDEO] Vidéo ${idx + 1} chargée:`, video.substring(0, 50))}
                                        onError={(e) => {
                                          console.error(`❌ [VIDEO] Erreur chargement vidéo ${idx + 1}:`, video);
                                          (e.target as HTMLVideoElement).style.display = 'none';
                                        }}
                                        onClick={() => window.open(video, '_blank')}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMedia(category.id, point.id, video, 'video');
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/60 rounded-full p-2">
                                          <Video size={20} className="text-white" />
                                        </div>
                                      </div>
                                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        🎥
                                      </div>
                                    </div>
                                  )) : null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Capture Buttons (Camera only) */}
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleCapturePhoto(category.id, point.id)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl text-xs font-black hover:from-indigo-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                          >
                            <Camera size={16} /> Prendre une photo
                          </button>
                          <button
                            onClick={() => handleCaptureVideo(category.id, point.id)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl text-xs font-black hover:from-purple-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                          >
                            <Video size={16} /> Filmer une vidéo
                          </button>
                        </div>
                      </div>
                      {point.custom && (
                        <button
                          onClick={() => removeCustomPoint(category.id, point.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Custom Point */}
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={customPointInput[category.id] || ''}
                    onChange={(e) => setCustomPointInput(prev => ({ ...prev, [category.id]: e.target.value }))}
                    placeholder="Ajouter un point personnalisé..."
                    className="flex-1 px-4 py-3 border-2 border-white rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 text-sm font-medium bg-white/80 shadow-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomPoint(category.id)}
                  />
                  <button
                    onClick={() => addCustomPoint(category.id)}
                    className={`px-5 py-3 ${categoryConfig.bgColor} text-white rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2 font-black`}
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Recommendations Preview */}
        {recommendations.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500 rounded-xl text-white">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Recommandations Générées</h3>
            </div>
            <ul className="space-y-3">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm font-medium text-gray-800 bg-white/60 px-4 py-2 rounded-lg border border-amber-200">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Health Score Display - En bas après les diagnostics */}
        <div className={`mt-8 bg-gradient-to-br ${
          displayScore >= 75 ? 'from-green-50 via-emerald-50 to-green-100 border-green-300' :
          displayScore >= 50 ? 'from-amber-50 via-yellow-50 to-amber-100 border-amber-300' :
          'from-red-50 via-orange-50 to-red-100 border-red-300'
        } p-8 rounded-3xl border-2 shadow-2xl relative overflow-hidden`}>
          {/* Effet de brillance animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${
                  displayScore >= 75 ? 'bg-green-500' :
                  displayScore >= 50 ? 'bg-amber-500' :
                  'bg-red-500'
                } text-white shadow-xl transform rotate-[-5deg] hover:rotate-0 transition-transform duration-300`}>
                  <Activity size={32} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-700 uppercase tracking-widest mb-1">Score de Santé Global</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-6xl font-black ${isAnimating ? 'scale-110' : ''} transition-transform duration-200 ${
                      displayScore >= 75 ? 'text-green-600' :
                      displayScore >= 50 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {displayScore}
                    </p>
                    <span className="text-2xl font-black text-gray-600">%</span>
                  </div>
                </div>
              </div>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
                displayScore >= 75 ? 'bg-green-500 text-white' :
                displayScore >= 50 ? 'bg-amber-500 text-white' :
                'bg-red-500 text-white'
              } transform hover:scale-110 transition-transform duration-300`}>
                {displayScore >= 75 ? <CheckCircle2 size={48} /> :
                 displayScore >= 50 ? <Clock size={48} /> :
                 <AlertTriangle size={48} />}
              </div>
            </div>
            
            {/* Barre de progression animée */}
            <div className="w-full bg-white/50 rounded-full h-6 overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  displayScore >= 75 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  displayScore >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                  'bg-gradient-to-r from-red-400 to-red-600'
                } flex items-center justify-end pr-2`}
                style={{ width: `${displayScore}%` }}
              >
                {displayScore > 10 && (
                  <span className="text-xs font-black text-white">{displayScore}%</span>
                )}
              </div>
            </div>

            {/* Indicateur de qualité */}
            <div className="mt-4 flex items-center gap-2 text-sm font-black">
              {displayScore >= 75 ? (
                <>
                  <Sparkles size={18} className="text-green-600" />
                  <span className="text-green-700">Excellent état</span>
                </>
              ) : displayScore >= 50 ? (
                <>
                  <TrendingUp size={18} className="text-amber-600" />
                  <span className="text-amber-700">État correct</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="text-red-600" />
                  <span className="text-red-700">Attention requise</span>
                </>
              )}
            </div>

            {/* Bouton Réinitialiser dans la section du score */}
            <div className="mt-6 pt-6 border-t-2 border-white/30">
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 border-2 border-white/50 rounded-2xl font-black text-gray-800 bg-white/60 hover:bg-white/80 hover:border-white transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-100 flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
              >
                <RefreshCw size={18} />
                Réinitialiser l'expertise
              </button>
            </div>
          </div>
        </div>

        {/* Actions - Boutons Annuler et Générer en bas, optimisés pour mobile */}
        <div className="mt-8 sticky bottom-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 pt-6 pb-6 sm:pb-8 border-t-2 border-gray-200 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 sm:px-8 py-4 border-2 border-gray-400 rounded-2xl font-black text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:border-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 uppercase tracking-wide text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={!vehicleData.make || !vehicleData.model || categories.every(c => c.points.every(p => p.rating === null))}
              className="flex-1 sm:flex-[2] px-6 sm:px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-sm sm:text-base disabled:transform-none"
            >
              <FileText size={20} />
              <span className="whitespace-nowrap">Générer Rapport PDF</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertiseModal;

