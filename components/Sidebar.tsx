"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AppSidebar() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.role === "super_admin") {
        setIsSuperAdmin(true);
      }
    });
  }, []);

  return (
    <Sidebar
      className="bg-[#f0f1f5] shadow-[4px_0px_8px_rgba(74,85,104,0.3)]"
      collapsible="none"
    >
      <SidebarHeader>
        <img
          src="/logo.png"
          alt="Logo"
          className="w-12 h-12 mx-auto mb-8 mt-10"
        />
      </SidebarHeader>
      <SidebarGroup title="Main" className="font-inter ml-2">
        <SidebarContent>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/archives">Archives</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/activity-log">Activity Logs</Link>
          {isSuperAdmin && <Link href="/accounts">Accounts</Link>}
        </SidebarContent>
      </SidebarGroup>
      <SidebarFooter className="mt-auto mb-4">
        <SidebarGroup title="FooterLinks">
          <SidebarContent>
            <Link className="font-inter" href="/settings">
              Settings
            </Link>
            <Link className="font-inter" href="/login">
              Logout
            </Link>
          </SidebarContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
