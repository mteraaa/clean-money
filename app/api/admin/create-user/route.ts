import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Server misconfiguration: missing service role key." }, { status: 500 });

  // Verify caller is a super_admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await supabase
    .from("users")
    .select("role, campus_code")
    .eq("auth_id", user.id)
    .single();
  if (caller?.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, password, facultyCode, campusCode, fullName } = await req.json();
  if (!email || !password || !campusCode)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const authId = authData.user.id;

  // Trigger already inserted the public.users row — update it with the remaining fields
  const { error: userError } = await admin.from("users").update({
    full_name: fullName || email,
    role: facultyCode ? "faculty" : "admin",
    faculty_code: facultyCode || null,
    campus_code: campusCode,
    is_active: true,
    created_by: user.id,
  }).eq("auth_id", authId);
  if (userError) {
    await admin.auth.admin.deleteUser(authId);
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  // Get active semester to seed balance_cards
  const { data: sem } = await admin
    .from("semesters")
    .select("id")
    .eq("is_active", true)
    .single();

  if (sem) {
    await admin.from("balance_cards").insert({
      faculty_code: facultyCode || null,
      campus_code: campusCode,
      semester_id: sem.id,
      initial_cash_on_hand: 0,
      initial_cash_on_bank: 0,
    });
  }

  return NextResponse.json({ success: true, authId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
