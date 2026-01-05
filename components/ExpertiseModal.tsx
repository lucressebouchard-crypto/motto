import React, { useState, useRef } from 'react';
import { X, Plus, Upload, Camera, Video, CheckCircle2, Circle, Download, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface InspectionPoint {
  id: string;
  label: string;
  checked: boolean;
  custom: boolean;
  photos: string[];
  videos: string[];
  notes?: string;
}

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
  const [vehicleData, setVehicleData] = useState(vehicle);
  const [categories, setCategories] = useState<InspectionCategory[]>([
    {
      id: 'engine',
      name: 'Moteur',
      weight: 5,
      points: [
        { id: 'engine_oil', label: 'Niveau et qualité de l\'huile moteur', checked: false, custom: false, photos: [], videos: [] },
        { id: 'engine_coolant', label: 'Liquide de refroidissement', checked: false, custom: false, photos: [], videos: [] },
        { id: 'engine_belt', label: 'Courroie de distribution', checked: false, custom: false, photos: [], videos: [] },
        { id: 'engine_filter', label: 'Filtres (air, huile, carburant)', checked: false, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'body',
      name: 'Carrosserie',
      weight: 3,
      points: [
        { id: 'body_paint', label: 'État de la peinture', checked: false, custom: false, photos: [], videos: [] },
        { id: 'body_dents', label: 'Bosses et rayures', checked: false, custom: false, photos: [], videos: [] },
        { id: 'body_rust', label: 'Corrosion/rouille', checked: false, custom: false, photos: [], videos: [] },
        { id: 'body_glass', label: 'Vitres et pare-brise', checked: false, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'electronics',
      name: 'Électronique',
      weight: 4,
      points: [
        { id: 'elec_battery', label: 'Batterie et charge', checked: false, custom: false, photos: [], videos: [] },
        { id: 'elec_lights', label: 'Éclairage (phares, feux)', checked: false, custom: false, photos: [], videos: [] },
        { id: 'elec_dashboard', label: 'Tableau de bord et indicateurs', checked: false, custom: false, photos: [], videos: [] },
        { id: 'elec_computer', label: 'Calculateur et codes erreur', checked: false, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'tires',
      name: 'Pneumatiques',
      weight: 4,
      points: [
        { id: 'tire_tread', label: 'Profondeur de la bande de roulement', checked: false, custom: false, photos: [], videos: [] },
        { id: 'tire_pressure', label: 'Pression des pneus', checked: false, custom: false, photos: [], videos: [] },
        { id: 'tire_wear', label: 'Usure inégale', checked: false, custom: false, photos: [], videos: [] },
        { id: 'tire_damage', label: 'Dommages visibles', checked: false, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'suspension',
      name: 'Suspension & Freinage',
      weight: 4,
      points: [
        { id: 'susp_shocks', label: 'Amortisseurs', checked: false, custom: false, photos: [], videos: [] },
        { id: 'susp_brakes', label: 'Plaquettes et disques de frein', checked: false, custom: false, photos: [], videos: [] },
        { id: 'susp_brake_fluid', label: 'Liquide de frein', checked: false, custom: false, photos: [], videos: [] },
        { id: 'susp_alignment', label: 'Géométrie et alignement', checked: false, custom: false, photos: [], videos: [] },
      ]
    },
    {
      id: 'interior',
      name: 'Intérieur',
      weight: 2,
      points: [
        { id: 'int_seats', label: 'Sièges et tapis', checked: false, custom: false, photos: [], videos: [] },
        { id: 'int_controls', label: 'Commandes et boutons', checked: false, custom: false, photos: [], videos: [] },
        { id: 'int_ac', label: 'Climatisation/chauffage', checked: false, custom: false, photos: [], videos: [] },
      ]
    }
  ]);
  const [customPointInput, setCustomPointInput] = useState<Record<string, string>>({});
  const [healthScore, setHealthScore] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Calcul du Score de Santé Global
  const calculateHealthScore = () => {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const newRecommendations: string[] = [];

    categories.forEach(category => {
      const checkedPoints = category.points.filter(p => p.checked).length;
      const totalPoints = category.points.length;
      const categoryScore = totalPoints > 0 ? (checkedPoints / totalPoints) * 100 : 0;
      
      const weightedScore = categoryScore * category.weight;
      totalWeightedScore += weightedScore;
      totalWeight += category.weight;

      // Générer des recommandations basées sur le score de la catégorie
      if (categoryScore < 50) {
        newRecommendations.push(`⚠️ ${category.name}: Nécessite une attention immédiate (${Math.round(categoryScore)}% OK)`);
      } else if (categoryScore < 75) {
        newRecommendations.push(`📋 ${category.name}: Contrôles recommandés (${Math.round(categoryScore)}% OK)`);
      }

      // Vérifier les points non cochés pour des recommandations spécifiques
      category.points.forEach(point => {
        if (!point.checked && !point.custom) {
          // Les points critiques ont des recommandations spécifiques
          if (point.id.includes('belt') || point.id.includes('brake')) {
            newRecommendations.push(`🔧 ${point.label}: Inspection urgente recommandée`);
          }
        }
      });
    });

    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    setHealthScore(finalScore);
    setRecommendations(newRecommendations);
  };

  const togglePoint = (categoryId: string, pointId: string) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          points: category.points.map(point => 
            point.id === pointId ? { ...point, checked: !point.checked } : point
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
      checked: false,
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

  const handleFileUpload = async (
    categoryId: string, 
    pointId: string, 
    file: File, 
    type: 'photo' | 'video'
  ) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `expertise/${mechanic.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('expertise-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('expertise-media')
        .getPublicUrl(filePath);

      const url = data.publicUrl;

      setCategories(prev => prev.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            points: category.points.map(point => {
              if (point.id === pointId) {
                return {
                  ...point,
                  photos: type === 'photo' ? [...point.photos, url] : point.photos,
                  videos: type === 'video' ? [...point.videos, url] : point.videos,
                };
              }
              return point;
            })
          };
        }
        return category;
      }));
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      alert('Erreur lors de l\'upload du fichier');
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

      const checkedPoints = category.points.filter(p => p.checked).length;
      const totalPoints = category.points.length;
      const categoryScore = totalPoints > 0 ? Math.round((checkedPoints / totalPoints) * 100) : 0;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${category.name} (${categoryScore}%)`, 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      category.points.forEach(point => {
        const status = point.checked ? '✓' : '✗';
        const statusColor = point.checked ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(`${status} ${point.label}`, 25, yPos);
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
  React.useEffect(() => {
    calculateHealthScore();
  }, [categories]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="bg-white w-full max-w-5xl rounded-[48px] p-6 sm:p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Expertise Véhicule</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Check-list d'inspection interactive</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

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

        {/* Health Score Display */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl mb-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1">Score de Santé Global</p>
              <p className="text-4xl font-black text-indigo-600">{healthScore}%</p>
            </div>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              healthScore >= 75 ? 'bg-green-100 text-green-600' :
              healthScore >= 50 ? 'bg-amber-100 text-amber-600' :
              'bg-red-100 text-red-600'
            }`}>
              {healthScore >= 75 ? <CheckCircle2 size={40} /> :
               healthScore >= 50 ? <Circle size={40} /> :
               <X size={40} />}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-900">{category.name}</h3>
                <span className="text-xs font-bold text-gray-500">
                  {category.points.filter(p => p.checked).length}/{category.points.length} OK
                </span>
              </div>

              <div className="space-y-3">
                {category.points.map((point) => (
                  <div key={point.id} className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => togglePoint(category.id, point.id)}
                        className={`mt-1 p-1 rounded-full transition-all ${
                          point.checked ? 'text-green-600 bg-green-50' : 'text-gray-300 bg-gray-50'
                        }`}
                      >
                        {point.checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${point.checked ? 'text-gray-900 line-through' : 'text-gray-700'}`}>
                          {point.label}
                        </p>

                        {/* Media Gallery */}
                        {(point.photos.length > 0 || point.videos.length > 0) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {point.photos.map((photo, idx) => (
                              <div key={idx} className="relative group">
                                <img src={photo} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                                <button
                                  onClick={() => removeMedia(category.id, point.id, photo, 'photo')}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            {point.videos.map((video, idx) => (
                              <div key={idx} className="relative group">
                                <video src={video} className="w-20 h-20 object-cover rounded-lg" />
                                <button
                                  onClick={() => removeMedia(category.id, point.id, video, 'video')}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Buttons */}
                        <div className="mt-2 flex gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(category.id, point.id, file, 'photo');
                              }}
                            />
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                              <Camera size={14} /> Photo
                            </span>
                          </label>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(category.id, point.id, file, 'video');
                              }}
                            />
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">
                              <Video size={14} /> Vidéo
                            </span>
                          </label>
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
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customPointInput[category.id] || ''}
                    onChange={(e) => setCustomPointInput(prev => ({ ...prev, [category.id]: e.target.value }))}
                    placeholder="Ajouter un point personnalisé..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomPoint(category.id)}
                  />
                  <button
                    onClick={() => addCustomPoint(category.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations Preview */}
        {recommendations.length > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Recommandations Générées</h3>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4 justify-end sticky bottom-0 bg-white pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={!vehicleData.make || !vehicleData.model || healthScore === 0}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            Générer Rapport PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertiseModal;

