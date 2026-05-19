"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronsUpDown, LogOut } from "lucide-react";

type Props = {
  userName: string;
  userEmail: string;
  onLogout: () => void;
};

export default function SidebarUserMenu({ userName, userEmail, onLogout }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-accent transition-colors"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {userName ? userName[0].toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-inter text-sm font-medium truncate">{userName}</span>
            <span className="font-inter text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem
          onClick={onLogout}
          className="font-inter cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
