import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  title?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex, onClose, title }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Réinitialiser le zoom et la position quand on change d'image
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [currentIndex]);

  // Gestion du clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Empêcher le scroll de la page quand le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.25, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  // Gestion du drag pour déplacer l'image zoomée
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Gestion du zoom avec la molette
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Gestion du pinch-to-zoom sur mobile
  const touchStartRef = useRef<{ distance: number; scale: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      touchStartRef.current = { distance, scale };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scaleChange = distance / touchStartRef.current.distance;
      const newScale = Math.max(1, Math.min(touchStartRef.current.scale * scaleChange, 5));
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Double-clic pour zoom/dézoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={onClose}
    >
      {/* Contrôles supérieurs - Hors de l'image */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black border-b border-white/10">
        <div className="flex items-center gap-3">
          {title && (
            <h3 className="text-white font-bold text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
              {title}
            </h3>
          )}
          <span className="text-white/80 text-sm font-medium px-3 py-1 bg-white/10 rounded-full">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Réinitialiser"
          >
            <RotateCw size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fermer (Échap)"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Zone d'image principale - Aucun contrôle dessus */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />
      </div>

      {/* Miniatures - En bas, hors de l'image */}
      {images.length > 1 && (
        <div 
          className="flex-shrink-0 border-t border-white/10 bg-black overflow-x-auto py-3"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) transparent',
            msOverflowStyle: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            [data-thumbnails-scroll]::-webkit-scrollbar {
              height: 4px;
            }
            [data-thumbnails-scroll]::-webkit-scrollbar-track {
              background: rgba(255,255,255,0.1);
            }
            [data-thumbnails-scroll]::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.3);
              border-radius: 2px;
            }
            [data-thumbnails-scroll]::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.5);
            }
          `}</style>
          <div 
            ref={thumbnailsRef}
            data-thumbnails-scroll
            className="flex gap-2 items-center px-4"
            style={{ 
              width: 'max-content',
            }}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  currentIndex === idx
                    ? 'border-white scale-105'
                    : 'border-white/30 hover:border-white/60 opacity-70 hover:opacity-100'
                }`}
                style={{ 
                  minWidth: '56px',
                  scrollSnapAlign: 'center',
                  flexShrink: 0 
                }}
              >
                <img
                  src={img}
                  alt={`Miniature ${idx + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contrôles inférieurs - Hors de l'image */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 p-4 bg-black border-t border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Boutons de navigation (seulement si plusieurs images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              title="Image précédente (←)"
            >
              <ChevronLeft size={24} />
            </button>
          </>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          disabled={scale <= 1}
          className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Dézoomer (-)"
        >
          <ZoomOut size={20} />
        </button>

        <div className="px-4 py-2 bg-white/10 rounded-lg min-w-[70px] text-center">
          <span className="text-white text-sm font-medium">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          disabled={scale >= 5}
          className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoomer (+)"
        >
          <ZoomIn size={20} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRotate();
          }}
          className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Tourner"
        >
          <RotateCw size={20} />
        </button>

        {/* Boutons de navigation (seulement si plusieurs images) */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="Image suivante (→)"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;

