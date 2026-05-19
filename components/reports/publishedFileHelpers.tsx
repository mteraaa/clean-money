import { FileText, Folder, File, Image, ChevronUp, ChevronDown } from "lucide-react";

export type SortField = "title" | "published_at";
export type SortDir = "asc" | "desc";

export function isImage(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}

export function isPdf(mimeType: string | null) {
  return mimeType === "application/pdf";
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (isPdf(mimeType)) return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
  if (isImage(mimeType)) return <Image className="w-4 h-4 text-green-500 shrink-0" />;
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "folder" ||
    mimeType === null
  )
    return <Folder className="w-4 h-4 text-blue-500 shrink-0" />;
  return <File className="w-4 h-4 text-gray-400 shrink-0" />;
}

export function ViewerIcon({ mimeType }: { mimeType: string }) {
  if (isPdf(mimeType)) return <FileText className="w-5 h-5 text-red-400 shrink-0" />;
  if (isImage(mimeType)) return <Image className="w-5 h-5 text-green-400 shrink-0" />;
  return <File className="w-5 h-5 text-gray-400 shrink-0" />;
}

export function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}
