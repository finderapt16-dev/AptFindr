import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Star,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export interface UploadedImage {
  id: string;
  url: string; // Data URL or public URL
  file?: File | Blob;
  isPrimary: boolean;
  sortOrder: number;
  fingerprint?: string;
}

interface MultiImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in MB
  allowedFormats?: string[];
  uploadProgress?: number | null;
  disabled?: boolean;
}

const VALID_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const FORMAT_EXTENSIONS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export function MultiImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  maxFileSize = 5,
  allowedFormats = VALID_FORMATS,
  uploadProgress = null,
  disabled = false,
}: MultiImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const validateFile = (file: File): boolean => {
    if (!allowedFormats.includes(file.type)) {
      const validExtensions = allowedFormats
        .flatMap((format) => FORMAT_EXTENSIONS[format as keyof typeof FORMAT_EXTENSIONS] || [])
        .join(", ")
        .toUpperCase();
      toast.error(`Only ${validExtensions} formats are supported`);
      return false;
    }

    if (file.size > maxFileSize * 1024 * 1024) {
      toast.error(`Image size must be less than ${maxFileSize}MB`);
      return false;
    }

    return true;
  };

  const addImagesToState = (files: File[]) => {
    const seen = new Set(images.map((image) => image.fingerprint).filter(Boolean));
    const validFiles = files.filter((file) => {
      if (!validateFile(file)) return false;
      const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(fingerprint)) {
        toast.error(`${file.name} has already been selected`);
        return false;
      }
      seen.add(fingerprint);
      return true;
    });
    if (validFiles.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    // Load all data URLs properly
    const promises = filesToAdd.map(
      (file) =>
        new Promise<UploadedImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            resolve({
              id: `${Date.now()}-${Math.random()}`,
              url: dataUrl,
              file,
              isPrimary: images.length === 0,
              sortOrder: images.length,
              fingerprint: `${file.name}:${file.size}:${file.lastModified}`,
            });
          };
          reader.readAsDataURL(file);
        })
    );

    Promise.all(promises).then((loadedImages) => {
      const updatedImages = [
        ...images,
        ...loadedImages.map((img, idx) => ({
          ...img,
          sortOrder: images.length + idx,
        })),
      ];
      onImagesChange(updatedImages);
      toast.success(`${loadedImages.length} image(s) added`);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImagesToState(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reorderImage = (targetId: string) => {
    if (!draggedImageId || draggedImageId === targetId) return;
    const fromIndex = images.findIndex((image) => image.id === draggedImageId);
    const toIndex = images.findIndex((image) => image.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onImagesChange(reordered.map((image, index) => ({ ...image, sortOrder: index })));
    setDraggedImageId(null);
    setPreviewIndex(toIndex);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please drop image files");
      return;
    }
    addImagesToState(imageFiles as File[]);
  };

  const removeImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    // Reassign sort orders
    const reordered = updated.map((img, idx) => ({
      ...img,
      sortOrder: idx,
      isPrimary: idx === 0 ? true : img.isPrimary,
    }));
    onImagesChange(reordered);
    toast.success("Image removed");
  };

  const setPrimary = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }));
    onImagesChange(updated);
    toast.success("Primary image updated");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraStreamRef.current = stream;
      setIsCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      toast.error("Unable to open the live camera. Use the device camera picker instead.");
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            addImagesToState([new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })]);
          }
        }, "image/jpeg");
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const primaryImage = images.find((img) => img.isPrimary) || images[0];
  const previewImage = images[previewIndex] || primaryImage;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed transition-all p-8 text-center cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-amber-200 bg-amber-50 hover:border-amber-300"
          }`}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-amber-600" />
          <p className="font-semibold text-slate-900 mb-1">
            Drag images here or click to browse
          </p>
          <p className="text-sm text-slate-600">
            Supported: JPG, PNG, WebP (max {maxFileSize}MB each)
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {images.length} of {maxImages} images uploaded
          </p>

          <div className="flex gap-2 justify-center mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              disabled={disabled}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Select Images
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void startCamera();
              }}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
              disabled={disabled}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileInput} className="hidden" disabled={disabled} />
        </div>
      )}

      {uploadProgress !== null && (
        <div className="space-y-2 rounded-lg border border-orange-100 bg-orange-50 p-3" role="status" aria-live="polite">
          <div className="flex justify-between text-xs font-bold text-orange-800"><span>Uploading room images</span><span>{Math.round(uploadProgress)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full bg-orange-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }} /></div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraActive && (
        <Card className="p-4 border-2 border-blue-200">
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                className="flex-1 border-red-300 text-red-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Image Preview Gallery */}
      {images.length > 0 && (
        <div className="space-y-4">
          {/* Large Preview */}
          {previewImage && (
            <Card className="overflow-hidden border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="relative bg-slate-900 aspect-video flex items-center justify-center">
                <img
                  src={previewImage.url}
                  alt={previewImage.isPrimary ? "Primary" : "Preview"}
                  className="h-full w-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((prev) =>
                          prev === 0 ? images.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
                {previewImage.isPrimary && (
                  <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Cover Photo
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Thumbnails Grid */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">
              Images ({images.length}/{maxImages})
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable={!disabled}
                  onDragStart={() => setDraggedImageId(img.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorderImage(img.id)}
                  onDragEnd={() => setDraggedImageId(null)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer ${
                    img.isPrimary
                      ? "border-yellow-400 ring-2 ring-yellow-300"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onClick={() => setPreviewIndex(idx)}
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      type="button"
                      title="Set as primary"
                      onClick={(e) => {
                        e.preventDefault();
                        setPrimary(img.id);
                      }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white p-1.5 rounded transition-all"
                    >
                      <Star className="h-3 w-3 fill-current" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => {
                        e.preventDefault();
                        removeImage(img.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {img.isPrimary && (
                    <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                      <Star className="h-3 w-3 text-yellow-900 fill-current" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reorder Info */}
          {images.length > 1 && (
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
              Drag thumbnails to reorder them. The selected cover photo is saved first.
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
          <p className="font-medium">No images uploaded yet</p>
          <p className="text-sm">Add images using the upload area above</p>
        </div>
      )}
    </div>
  );
}
