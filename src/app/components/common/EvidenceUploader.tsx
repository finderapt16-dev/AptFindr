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
      {required && <div className="flex items-start gap-3 rounded-lg border border-orange-100 bg-orange-50 p-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <div>
          <p className="text-sm font-black text-orange-900">Evidence required</p>
          <p className="mt-1 text-xs font-medium text-orange-700">
            Upload at least one image, screenshot, or document to support this report.
          </p>
        </div>
      </div>}

      {/* Upload Zone */}
      {remainingSlots > 0 && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
            dragActive
              ? "border-violet-500 bg-violet-50"
              : "border-violet-200 bg-violet-50/30 hover:border-violet-300 hover:bg-violet-50/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileInputChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-600 shadow-sm">
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <p className="font-black text-slate-950">
                Drag and drop files here or click to browse
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
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
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-lg hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-900" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-lg hover:bg-white"
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
                    ? "border-violet-500 ring-2 ring-violet-200"
                    : "border-slate-100 hover:border-violet-200"
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
          <div className="text-sm font-black text-slate-900">
            Attached Evidence ({evidenceFiles.length}/{maxFiles})
          </div>
          <div className="space-y-2">
            {evidenceFiles.map((file) => (
              <Card
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {file.fileType === "image" ? (
                    <img
                      src={file.preview}
                      alt={file.fileName}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-rose-50 text-rose-600">
                      <FileText className="h-5 w-5" />
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
                      className="h-8 w-8 text-slate-600 hover:text-violet-600"
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
        <div className="text-sm font-medium text-red-600">
          ⚠ At least one file is required to submit this report
        </div>
      )}
    </div>
  );
}
