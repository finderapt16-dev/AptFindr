import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  title: string;
  primaryImageUrl?: string;
}

export function ImageGallery({ images, title, primaryImageUrl }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-500 text-lg font-semibold">No images available</div>
        </div>
      </div>
    );
  }

  const previousImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
        <div className="aspect-video flex items-center justify-center">
          <img
            src={images[currentIndex]}
            alt={`${title} - ${currentIndex + 1}`}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={previousImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Primary Image Badge */}
            {primaryImageUrl && images[currentIndex] === primaryImageUrl && (
              <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Cover Photo
              </div>
            )}
          </>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">
            More Images ({images.length})
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToImage(index)}
                className={`relative flex-shrink-0 aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  currentIndex === index
                    ? "border-amber-500 ring-2 ring-amber-300"
                    : "border-slate-200 hover:border-amber-300"
                }`}
              >
                <img
                  src={img}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {primaryImageUrl && img === primaryImageUrl && (
                  <div className="absolute top-0.5 right-0.5 bg-yellow-400 rounded-full p-0.5">
                    <Star className="h-2.5 w-2.5 text-yellow-900 fill-current" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Navigation Info */}
      {images.length > 1 && (
        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
          💡 Use arrow buttons or click thumbnails to browse images
        </div>
      )}
    </div>
  );
}
