import { useState, useEffect } from "react";
import { X, Download, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { isImage, isPdf, ViewerIcon } from "./publishedFileHelpers";

export type FileViewer = { url: string; title: string; mime_type: string };

type Props = {
  viewer: FileViewer | null;
  onClose: () => void;
};

export default function FileViewerDialog({ viewer, onClose }: Props) {
  const [zoom, setZoom] = useState(0.75);

  useEffect(() => {
    if (!viewer) { setZoom(0.75); return; }
    if (!isImage(viewer.mime_type)) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.25, +(z + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))));
    };
    document.addEventListener("wheel", handler, { passive: false });
    return () => document.removeEventListener("wheel", handler);
  }, [viewer]);

  return (
    <Dialog open={!!viewer} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="w-[75vw] max-w-none! h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
      >
        <VisuallyHidden>
          <DialogTitle>{viewer?.title}</DialogTitle>
        </VisuallyHidden>
        <div className="flex items-center justify-between bg-[#1f1f1f] px-4 py-2 shrink-0">
          <div className="flex items-center gap-3">
            {viewer && <ViewerIcon mimeType={viewer.mime_type} />}
            <span className="font-inter text-sm text-white truncate max-w-lg">{viewer?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {viewer && isImage(viewer.mime_type) && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                  className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-white text-xs w-10 text-center select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                  className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
            <a href={viewer?.url} download className="p-2 rounded hover:bg-white/10 text-white transition-colors" title="Download">
              <Download className="w-4 h-4" />
            </a>
            <a href={viewer?.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded hover:bg-white/10 text-white transition-colors" title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={onClose} className="p-2 rounded hover:bg-white/10 text-white transition-colors" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[#525659] overflow-auto flex items-center justify-center">
          {viewer && isPdf(viewer.mime_type) && (
            <iframe src={viewer.url} className="w-full h-full border-0" />
          )}
          {viewer && isImage(viewer.mime_type) && (
            <img
              src={viewer.url}
              alt={viewer.title}
              className="object-contain shadow-lg transition-transform duration-150"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
