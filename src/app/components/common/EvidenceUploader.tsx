import { useState, useRef, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Upload,
  X,
  Eye,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export interface EvidenceFile {
  id: string;
  file: File | Blob;
  fileName: string;
  fileType: "image" | "document" | "screenshot";
  mimeType: string;
  fileSize: number;
  preview?: string; // DataURL for images
  uploadedAt?: Date;
}

interface EvidenceUploaderProps {
  evidenceFiles: EvidenceFile[];
  onEvidenceChange: (files: EvidenceFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  required?: boolean;
}

const ALLOWED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOCUMENT_FORMATS = ["application/pdf"];
const ALLOWED_FORMATS = [...ALLOWED_IMAGE_FORMATS, ...ALLOWED_DOCUMENT_FORMATS];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

const FORMAT_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG Image",
  "image/png": "PNG Image",
  "image/webp": "WebP Image",
  "application/pdf": "PDF Document",
};

const validateFile = (file: File, maxFileSize: number): string | null => {
  // Check file size
  const fileSizeInMB = file.size / (1024 * 1024);
  if (fileSizeInMB > maxFileSize) {
    return `File is too large (${fileSizeInMB.toFixed(1)}MB). Maximum is ${maxFileSize}MB.`;
  }

  // Check MIME type
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return `File format not supported. Accepted: JPG, PNG, WebP, PDF`;
  }

  // Check extension
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File extension not allowed. Use: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }

  return null;
};

const getFileTypeCategory = (mimeType: string): "image" | "document" | "screenshot" => {
  if (ALLOWED_IMAGE_FORMATS.includes(mimeType)) {
    return "image";
  }
  return "document";
};

export function EvidenceUploader({
  evidenceFiles,
  onEvidenceChange,
  maxFiles = 5,
  maxFileSize = 10,
  required = true,
}: EvidenceUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const remainingSlots = maxFiles - evidenceFiles.length;

  // Get preview URL for current image
  const currentPreviewUrl = useMemo(() => {
    if (!previewImageId) return null;
    const file = evidenceFiles.find((f) => f.id === previewImageId);
    return file?.preview;
  }, [previewImageId, evidenceFiles]);

  // Get images only for carousel
  const imageFiles = useMemo(
    () => evidenceFiles.filter((f) => f.fileType === "image"),
    [evidenceFiles]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    addFilesToState(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    addFilesToState(files);
  };

  const addFilesToState = (files: File[]) => {
    if (evidenceFiles.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: EvidenceFile[] = [];

    for (const file of files) {
      if (evidenceFiles.length + validFiles.length >= maxFiles) {
        toast.warning(`Added ${validFiles.length} files. Maximum ${maxFiles} reached.`);
        break;
      }

      const error = validateFile(file, maxFileSize);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      const fileId = `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileType = getFileTypeCategory(file.type);
      const mimeType = file.type;

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          onEvidenceChange([
            ...evidenceFiles,
            {
              id: fileId,
              file,
              fileName: file.name,
              fileType,
              mimeType,
              fileSize: file.size,
              preview,
              uploadedAt: new Date(),
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        validFiles.push({
          id: fileId,
          file,
          fileName: file.name,
          fileType,
          mimeType,
          fileSize: file.size,
          uploadedAt: new Date(),
        });
      }
    }

    if (validFiles.length > 0) {
      onEvidenceChange([...evidenceFiles, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    const updated = evidenceFiles.filter((f) => f.id !== id);
    onEvidenceChange(updated);
    if (previewImageId === id) {
      setPreviewImageId(null);
    }
  };

  const previousImage = () => {
    if (imageFiles.length === 0) return;
    const prevIndex = currentPreviewIndex === 0 ? imageFiles.length - 1 : currentPreviewIndex - 1;
    setCurrentPreviewIndex(prevIndex);
    setPreviewImageId(imageFiles[prevIndex].id);
  };

  const nextImage = () => {
    if (imageFiles.length === 0) return;
    const nextIndex = (currentPreviewIndex + 1) % imageFiles.length;
    setCurrentPreviewIndex(nextIndex);
    setPreviewImageId(imageFiles[nextIndex].id);
  };

  const goToImage = (id: string) => {
    setPreviewImageId(id);
    const index = imageFiles.findIndex((f) => f.id === id);
    setCurrentPreviewIndex(index);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Evidence Requirement Message */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold text-blue-900 text-sm">Evidence Required</p>
          <p className="text-xs text-blue-700 mt-1">
            Please upload at least one image, screenshot, or document to support your report. This helps our team review and investigate your issue effectively.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {remainingSlots > 0 && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-amber-500 bg-amber-50"
              : "border-amber-200 bg-amber-50/30 hover:border-amber-300"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Drag files here or click to browse
              </p>
              <p className="text-xs text-slate-600 mt-1">
                JPG, PNG, WebP, PDF • Max {maxFileSize}MB each • {remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remaining
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Gallery */}
      {imageFiles.length > 0 && (
        <div className="space-y-3">
          {/* Large Preview */}
          {previewImageId && currentPreviewUrl && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-amber-100 bg-slate-900">
              <img
                src={currentPreviewUrl}
                alt="Evidence preview"
                className="h-full w-full object-contain"
              />
              {imageFiles.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={previousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-900" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-900" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {imageFiles.findIndex((f) => f.id === previewImageId) + 1} / {imageFiles.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-4 gap-2">
            {imageFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => goToImage(file.id)}
                className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer border-2 transition-all hover:opacity-80 ${
                  previewImageId === file.id
                    ? "border-amber-500 ring-2 ring-amber-300"
                    : "border-amber-100 hover:border-amber-300"
                }`}
              >
                <img
                  src={file.preview}
                  alt={file.fileName}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List */}
      {evidenceFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-900">
            Attached Evidence ({evidenceFiles.length}/{maxFiles})
          </div>
          <div className="space-y-2">
            {evidenceFiles.map((file) => (
              <Card
                key={file.id}
                className="p-3 flex items-center justify-between border border-amber-100 bg-gradient-to-r from-amber-50/50 to-transparent hover:bg-amber-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {file.fileType === "image" ? (
                    <img
                      src={file.preview}
                      alt={file.fileName}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {FORMAT_LABELS[file.mimeType] || file.mimeType} • {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {file.fileType === "image" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => goToImage(file.id)}
                      className="h-8 w-8 text-slate-600 hover:text-amber-600"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8 text-slate-600 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Validation Message */}
      {required && evidenceFiles.length === 0 && (
        <div className="text-sm text-red-600 font-medium">
          ⚠ At least one file is required to submit this report
        </div>
      )}
    </div>
  );
}
