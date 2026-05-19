import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Entry, formatDate } from "./entryUtils";
import { formatPeso } from "./entryFormTypes";

type Props = {
  entry: Entry;
  index: number;
  category: "income" | "expense";
  selectMode: boolean;
  selected: boolean;
  isPublished: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function EntriesTableRow({
  entry, index, category, selectMode, selected, isPublished, onToggle, onEdit, onDelete,
}: Props) {
  const displayDescription =
    entry.category === "expense" && entry.description.startsWith("Special Projects/Fund Raising")
      ? entry.description.replace("Special Projects/Fund Raising — ", "")
      : entry.description;

  return (
    <tr className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${selected ? "bg-gray-100" : ""}`}>
      {selectMode && (
        <td className="px-4 py-3">
          <input type="checkbox" checked={selected} onChange={onToggle} />
        </td>
      )}
      <td className="px-6 py-3 text-gray-500">{index + 1}</td>
      <td className="px-4 py-3 text-gray-900">{displayDescription}</td>
      <td className="px-4 py-3 text-gray-700">{formatPeso(entry.unit_price)}</td>
      <td className="px-4 py-3 text-gray-700">{entry.quantity}</td>
      <td className={`px-4 py-3 font-semibold ${category === "income" ? "text-green-500" : "text-red-500"}`}>
        {category === "income" ? "+" : "-"}{formatPeso(entry.unit_price * entry.quantity)}
      </td>
      <td className="px-4 py-3 text-gray-500">{formatDate(entry.entry_date)}</td>
      <td className="px-4 py-3">
        {!isPublished && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}
