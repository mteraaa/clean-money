import { createClient } from "@/utils/supabase/client";

type Module =
  | "DASHBOARD"
  | "ARCHIVES"
  | "REPORTS"
  | "ACTIVITY_LOGS"
  | "ACCOUNTS"
  | "ACADEMIC_SETTINGS";

export async function logActivity({
  description,
  action,
  module = "DASHBOARD",
  facultyCode,
  campusCode,
  targetTable,
  targetId,
}: {
  description: string;
  action: string;
  module?: Module;
  facultyCode?: string | null;
  campusCode?: string | null;
  targetTable?: string;
  targetId?: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    faculty_code: facultyCode ?? null,
    campus_code: campusCode ?? null,
    module,
    action,
    description,
    target_table: targetTable ?? null,
    target_id: targetId ?? null,
    logged_at: new Date().toISOString(),
  });
}
