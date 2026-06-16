import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

export interface EvidenceItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: "image" | "document" | "screenshot";
  mimeType: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: string;
}

interface EvidenceViewerProps {
  evidence: EvidenceItem[];
  title?: string;
  onDownload?: (fileUrl: string, fileName: string) => void;
  isAdmin?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "application/pdf": "PDF",
};

const FORMAT_ICONS: Record<string, any> = {
  image: ImageIcon,
  document: FileText,
  screenshot: ImageIcon,
};

export function EvidenceViewer({
  evidence,
  title = "Supporting Evidence",
  onDownload,
  isAdmin = false,
}: EvidenceViewerProps) {
  const [previewImageId, setPreviewImageId] = useState<string | null>(
    evidence.find((e) => e.fileType === "image")?.id || null
  );
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const imageEvidence = useMemo(
    () => evidence.filter((e) => e.fileType === "image"),
    [evidence]
  );

  const documentEvidence = useMemo(
    () => evidence.filter((e) => e.fileType === "document"),
    [evidence]
  );

  if (evidence.length === 0) {
    return (
      <Card className="p-6 text-center border border-amber-100 bg-amber-50/30">
        <ImageIcon className="h-8 w-8 text-amber-400 mx-auto mb-2 opacity-50" />
        <p className="text-sm text-slate-600">No evidence attached</p>
      </Card>
    );
  }

  const handlePreviousImage = () => {
    if (imageEvidence.length === 0) return;
    const prevIndex =
      currentPreviewIndex === 0 ? imageEvidence.length - 1 : currentPreviewIndex - 1;
    setCurrentPreviewIndex(prevIndex);
    setPreviewImageId(imageEvidence[prevIndex].id);
  };

  const handleNextImage = () => {
    if (imageEvidence.length === 0) return;
    const nextIndex = (currentPreviewIndex + 1) % imageEvidence.length;
    setCurrentPreviewIndex(nextIndex);
    setPreviewImageId(imageEvidence[nextIndex].id);
  };

  const goToImage = (id: string) => {
    setPreviewImageId(id);
    const index = imageEvidence.findIndex((e) => e.id === id);
    setCurrentPreviewIndex(index);
  };

  const handleDownload = (evidence: EvidenceItem) => {
    if (onDownload) {
      onDownload(evidence.fileUrl, evidence.fileName);
    } else {
      // Default download behavior
      const link = document.createElement("a");
      link.href = evidence.fileUrl;
      link.download = evidence.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const currentPreviewEvidence = previewImageId
    ? evidence.find((e) => e.id === previewImageId)
    : null;

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-amber-600" />
          {title}
          <Badge variant="secondary" className="ml-2">
            {evidence.length} file{evidence.length !== 1 ? "s" : ""}
          </Badge>
        </h3>
      </div>

      {/* Image Preview */}
      {imageEvidence.length > 0 && currentPreviewEvidence && (
        <div className="space-y-3">
          {/* Large Preview */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-amber-100 bg-slate-100">
            <img
              src={currentPreviewEvidence.fileUrl}
              alt={currentPreviewEvidence.fileName}
              className="h-full w-full object-contain"
            />

            {/* Navigation Controls */}
            {imageEvidence.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handlePreviousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-900" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full"
                >
                  <ChevronRight className="h-5 w-5 text-slate-900" />
                </Button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {currentPreviewIndex + 1} / {imageEvidence.length}
                </div>
              </>
            )}

            {/* Download Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleDownload(currentPreviewEvidence)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-lg rounded-full"
              title="Download image"
            >
              <Download className="h-5 w-5 text-slate-900" />
            </Button>
          </div>

          {/* Thumbnail Gallery */}
          {imageEvidence.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {imageEvidence.map((img) => (
                <button
                  key={img.id}
                  onClick={() => goToImage(img.id)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:opacity-80 ${
                    previewImageId === img.id
                      ? "border-amber-500 ring-2 ring-amber-300"
                      : "border-amber-100 hover:border-amber-300"
                  }`}
                >
                  <img
                    src={img.fileUrl}
                    alt={img.fileName}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">
          All Evidence ({evidence.length})
        </div>
        <div className="space-y-2">
          {evidence.map((item) => {
            const Icon = FORMAT_ICONS[item.fileType] || FileText;
            return (
              <Card
                key={item.id}
                className="p-3 flex items-center justify-between border border-amber-100 bg-gradient-to-r from-amber-50/50 to-transparent hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`h-10 w-10 rounded flex items-center justify-center flex-shrink-0 ${
                      item.fileType === "image"
                        ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                        : "bg-gradient-to-br from-red-500 to-rose-600"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {FORMAT_LABELS[item.mimeType] || item.mimeType}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatFileSize(item.fileSize)}
                      </span>
                      {item.uploadedAt && (
                        <span className="text-xs text-slate-400">
                          {new Date(item.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.fileType === "image" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => goToImage(item.id)}
                      className="h-8 w-8 text-slate-600 hover:text-amber-600"
                      title="View image"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(item)}
                    className="h-8 w-8 text-slate-600 hover:text-amber-600"
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
