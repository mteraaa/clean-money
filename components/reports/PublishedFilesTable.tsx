"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileIcon, SortIcon, formatDate, isImage, isPdf, type SortField, type SortDir } from "./publishedFileHelpers";
import FileViewerDialog, { type FileViewer } from "./FileViewerDialog";

export type PublishedFile = {
  id: string;
  title: string;
  mime_type: string | null;
  published_at: string;
  url?: string;
  folder_id?: number;
  file_path?: string;
};

type Props = {
  files: PublishedFile[];
  onFolderClick?: (folderId: number) => void;
  onDelete?: (ids: string[]) => Promise<void>;
};

export default function PublishedFilesTable({ files, onFolderClick, onDelete }: Props) {
  const [sortField, setSortField] = useState<SortField>("published_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewer, setViewer] = useState<FileViewer | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const sorted = [...files].sort((a, b) => {
    const cmp = sortField === "title"
      ? a.title.localeCompare(b.title)
      : new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSelectMode() { setSelectMode((v) => !v); setSelectedIds(new Set()); }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === sorted.length ? new Set() : new Set(sorted.map((f) => f.id)));
  }

  async function handleDelete() {
    if (selectedIds.size === 0 || !onDelete) return;
    setDeleting(true);
    await onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
    setDeleting(false);
  }

  function handleRowClick(file: PublishedFile) {
    if (selectMode) { toggleSelect(file.id); return; }
    if ((isPdf(file.mime_type) || isImage(file.mime_type)) && file.url && file.mime_type) {
      setViewer({ url: file.url, title: file.title, mime_type: file.mime_type });
    } else if (file.mime_type === "folder" && file.folder_id && onFolderClick) {
      onFolderClick(file.folder_id);
    }
  }

  return (
    <>
      <FileViewerDialog viewer={viewer} onClose={() => setViewer(null)} />
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#E5E7EB] hover:bg-[#E5E7EB] border-b border-gray-200">
              {selectMode && (
                <TableHead className="py-3 px-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0} onChange={toggleSelectAll} className="cursor-pointer" />
                </TableHead>
              )}
              <TableHead className="font-inter font-bold text-gray-800 py-3 px-4 cursor-pointer select-none" onClick={() => handleSort("title")}>
                <div className="flex items-center gap-1">Name <SortIcon field="title" sortField={sortField} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className="font-inter font-bold text-gray-800 py-3 px-4 cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("published_at")}>
                <div className="flex items-center gap-1">Date Published <SortIcon field="published_at" sortField={sortField} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {selectMode && onDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={selectedIds.size === 0 || deleting}
                      className="border border-red-300 text-red-500 rounded-lg px-3 py-1 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      {deleting ? "Deleting…" : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
                    </button>
                  )}
                  <button
                    onClick={toggleSelectMode}
                    className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${selectMode ? "border-gray-400 text-gray-600 hover:bg-gray-100" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  >
                    {selectMode ? "Cancel" : "Select"}
                  </button>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((file) => (
              <TableRow
                key={file.id}
                className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer ${selectedIds.has(file.id) ? "bg-gray-100" : ""}`}
                onClick={() => handleRowClick(file)}
              >
                {selectMode && (
                  <TableCell className="py-3 px-3 w-10">
                    <input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} onClick={(e) => e.stopPropagation()} className="cursor-pointer" />
                  </TableCell>
                )}
                <TableCell className="font-inter text-sm py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileIcon mimeType={file.mime_type} />
                    <div className="min-w-0">
                      <span className="block truncate">{file.title}</span>
                      <span className="block md:hidden text-xs text-gray-400 mt-0.5">{formatDate(file.published_at)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-inter text-sm py-3 px-4 hidden md:table-cell">
                  {formatDate(file.published_at)}
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
