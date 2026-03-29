import { useState, useEffect } from "react";
import {
  FileText,
  Folder,
  File,
  Image,
  ChevronUp,
  ChevronDown,
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export type PublishedFile = {
  id: string;
  title: string;
  mime_type: string | null;
  published_at: string;
  url?: string;
  folder_id?: number;
};

type SortField = "title" | "published_at";
type SortDir = "asc" | "desc";
type FileViewer = { url: string; title: string; mime_type: string };

function isImage(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}

function isPdf(mimeType: string | null) {
  return mimeType === "application/pdf";
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (isPdf(mimeType))
    return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
  if (isImage(mimeType))
    return <Image className="w-4 h-4 text-green-500 shrink-0" />;
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "folder" ||
    mimeType === null
  )
    return <Folder className="w-4 h-4 text-blue-500 shrink-0" />;
  return <File className="w-4 h-4 text-gray-400 shrink-0" />;
}

function ViewerIcon({ mimeType }: { mimeType: string }) {
  if (isPdf(mimeType))
    return <FileText className="w-5 h-5 text-red-400 shrink-0" />;
  if (isImage(mimeType))
    return <Image className="w-5 h-5 text-green-400 shrink-0" />;
  return <File className="w-5 h-5 text-gray-400 shrink-0" />;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
  return sortDir === "asc" ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}

type Props = {
  files: PublishedFile[];
  onFolderClick?: (folderId: number) => void;
};

export default function PublishedFilesTable({ files, onFolderClick }: Props) {
  const [sortField, setSortField] = useState<SortField>("published_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewer, setViewer] = useState<FileViewer | null>(null);
  const [zoom, setZoom] = useState(0.75);
  useEffect(() => {
    if (!viewer || !isImage(viewer.mime_type)) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        return Math.min(4, Math.max(0.25, +(z + delta).toFixed(2)));
      });
    };
    document.addEventListener("wheel", handler, { passive: false });
    return () => document.removeEventListener("wheel", handler);
  }, [viewer]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = [...files].sort((a, b) => {
    let cmp = 0;
    if (sortField === "title") {
      cmp = a.title.localeCompare(b.title);
    } else {
      cmp =
        new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleRowClick(file: PublishedFile) {
    if (
      (isPdf(file.mime_type) || isImage(file.mime_type)) &&
      file.url &&
      file.mime_type
    ) {
      setViewer({
        url: file.url,
        title: file.title,
        mime_type: file.mime_type,
      });
    } else if (file.mime_type === "folder" && file.folder_id && onFolderClick) {
      onFolderClick(file.folder_id);
    }
  }

  return (
    <>
      <Dialog
        open={!!viewer}
        onOpenChange={(open) => {
          if (!open) {
            setViewer(null);
            setZoom(0.75);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[75vw] max-w-none! h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        >
          <VisuallyHidden>
            <DialogTitle>{viewer?.title}</DialogTitle>
          </VisuallyHidden>
          {/* Google Drive-style toolbar */}
          <div className="flex items-center justify-between bg-[#1f1f1f] px-4 py-2 shrink-0">
            <div className="flex items-center gap-3">
              {viewer && <ViewerIcon mimeType={viewer.mime_type} />}
              <span className="font-inter text-sm text-white truncate max-w-lg">
                {viewer?.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {viewer && isImage(viewer.mime_type) && (
                <>
                  <button
                    onClick={() =>
                      setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))
                    }
                    className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-white text-xs w-10 text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() =>
                      setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))
                    }
                    className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
              )}
              <a
                href={viewer?.url}
                download
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <a
                href={viewer?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setViewer(null)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Content viewer */}
          <div className="flex-1 bg-[#525659] overflow-auto flex items-center justify-center">
            {viewer && isPdf(viewer.mime_type) && (
              <iframe src={viewer.url} className="w-full h-full border-0" />
            )}
            {viewer && isImage(viewer.mime_type) && (
              <img
                src={viewer.url}
                alt={viewer.title}
                className="object-contain shadow-lg transition-transform duration-150"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#E5E7EB] hover:bg-[#E5E7EB] border-b border-gray-200">
              <TableHead
                className="font-inter font-bold text-gray-800 py-3 px-4 w-3/4 cursor-pointer select-none"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-1">
                  Name
                  <SortIcon
                    field="title"
                    sortField={sortField}
                    sortDir={sortDir}
                  />
                </div>
              </TableHead>
              <TableHead
                className="font-inter font-bold text-gray-800 py-3 px-4 w-1/4 cursor-pointer select-none"
                onClick={() => handleSort("published_at")}
              >
                <div className="flex items-center gap-1">
                  Date Published
                  <SortIcon
                    field="published_at"
                    sortField={sortField}
                    sortDir={sortDir}
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((file) => (
              <TableRow
                key={file.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(file)}
              >
                <TableCell className="font-inter text-sm py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileIcon mimeType={file.mime_type} />
                    {file.title}
                  </div>
                </TableCell>
                <TableCell className="font-inter text-sm py-3 px-4">
                  {formatDate(file.published_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
