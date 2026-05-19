"use client";

import {
  Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarFooter,
  SidebarSeparator, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Archive, FileBarChart, ClipboardList, ShieldCheck, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SidebarUserMenu from "./SidebarUserMenu";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/archives", icon: Archive, label: "Archives", exact: false },
  { href: "/reports", icon: FileBarChart, label: "Reports", exact: true },
  { href: "/activity-log", icon: ClipboardList, label: "Activity Logs", exact: true },
];

function NavItem({ href, icon: Icon, label, isActive }: { href: string; icon: LucideIcon; label: string; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className={isActive ? "text-base! font-bold!" : "text-base!"}
      >
        <Link href={href}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.role === "super_admin") setIsSuperAdmin(true);
      setUserEmail(user?.email ?? "");
      setUserName(user?.user_metadata?.full_name ?? user?.email ?? "");
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const active = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar
      className="shadow-[4px_0px_10px_0px_rgba(74,85,104,0.2)] overflow-hidden relative z-20"
      collapsible="icon"
    >
      <SidebarHeader className="relative group-data-[collapsible=icon]:h-19">
        <SidebarTrigger className="absolute top-2 right-2" />
        <img
          src="/logo.png"
          alt="Logo"
          className="w-max h-20 mx-auto mb-8 mt-10 group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>
      <SidebarGroup title="Main" className="font-inter ml-2 group-data-[collapsible=icon]:ml-0">
        <SidebarContent>
          <SidebarMenu>
            {navItems.map(({ href, icon, label, exact }) => (
              <NavItem key={href} href={href} icon={icon} label={label} isActive={active(href, exact)} />
            ))}
            {isSuperAdmin && <SidebarSeparator className="mx-0 w-full" />}
            {isSuperAdmin && (
              <NavItem href="/admin-controls" icon={ShieldCheck} label="Admin Controls" isActive={pathname === "/admin-controls"} />
            )}
          </SidebarMenu>
        </SidebarContent>
      </SidebarGroup>
      <SidebarFooter className="mt-auto mb-4 px-2">
        <SidebarMenu>
          <NavItem href="/settings" icon={Settings} label="Settings" isActive={pathname === "/settings"} />
        </SidebarMenu>
        <SidebarUserMenu userName={userName} userEmail={userEmail} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
