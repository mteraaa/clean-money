"use client";

import AccountMonitoringCard from "@/components/admin/AccountMonitoringCard";
import SemesterCard from "@/components/admin/SemesterCard";

export default function AdminControlsPage() {
  return (
    <div className="bg-[#f3f4f6] min-h-full p-4 md:p-8 font-lexend animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <SemesterCard />
        <AccountMonitoringCard />
      </div>
    </div>
  );
}
