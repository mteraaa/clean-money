"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronsUpDown,
  LogOut,
  LayoutDashboard,
  Archive,
  FileBarChart,
  ClipboardList,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AppSidebar() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.role === "super_admin") {
        setIsSuperAdmin(true);
      }
      setUserEmail(user?.email ?? "");
      setUserName(user?.user_metadata?.full_name ?? user?.email ?? "");
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Sidebar
      className="shadow-[4px_0px_10px_0px_rgba(74,85,104,0.2)] overflow-hidden relative z-20"
      collapsible="none"
    >
      <SidebarHeader>
        <img
          src="/logo.png"
          alt="Logo"
          className="w-max h-20 mx-auto mb-8 mt-10"
        />
      </SidebarHeader>
      <SidebarGroup title="Main" className="font-inter ml-2">
        <SidebarContent>
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/archives" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Archives
          </Link>
          <Link href="/reports" className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            Reports
          </Link>
          <Link href="/activity-log" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Activity Logs
          </Link>
          {isSuperAdmin && <SidebarSeparator className="mx-0 w-full" />}
          {isSuperAdmin && (
            <Link href="/admin-controls" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Admin Controls
            </Link>
          )}
        </SidebarContent>
      </SidebarGroup>
      <SidebarFooter className="mt-auto mb-4 px-2">
        <Link
          className="font-inter text-sm px-2 py-1 hover:underline flex items-center gap-2"
          href="/settings"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button suppressHydrationWarning className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-accent transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userName ? userName[0].toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left flex-1 min-w-0">
                <span className="font-inter text-sm font-medium truncate">
                  {userName}
                </span>
                <span className="font-inter text-xs text-muted-foreground truncate">
                  {userEmail}
                </span>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem
              onClick={handleLogout}
              className="font-inter cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
