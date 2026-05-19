"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ActivityLogTable from "@/components/entries/ActivityLogTable";

type Log = { id: number; description: string; logged_at: string };

export default function ActivityLogPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code")
        .eq("auth_id", user.id)
        .single();
      if (!userData) { setIsLoading(false); return; }

      const q = supabase
        .from("activity_logs")
        .select("id, description, logged_at")
        .order("logged_at", { ascending: false })
        .limit(200);

      if (userData.faculty_code) q.eq("faculty_code", userData.faculty_code);
      else q.eq("campus_code", userData.campus_code);

      const { data } = await q;
      setLogs(data ?? []);
      setIsLoading(false);
    })();
  }, []);

  return (
    <div className="bg-[#f3f4f6] min-h-full p-4 md:p-8">
      {!isLoading && (
        <div className="animate-fade-in-up">
          <ActivityLogTable logs={logs} />
        </div>
      )}
    </div>
  );
}
