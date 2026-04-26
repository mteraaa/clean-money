import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .single();
    if (caller?.role !== "super_admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { authId } = await req.json();
    if (!authId) return NextResponse.json({ error: "Missing authId" }, { status: 400 });

    const admin = createAdminClient();

    // Get org identifiers before deleting
    const { data: publicUser } = await admin
      .from("users")
      .select("faculty_code, campus_code")
      .eq("auth_id", authId)
      .single();

    if (publicUser) {
      if (publicUser.faculty_code) {
        await admin.from("balance_cards").delete().eq("faculty_code", publicUser.faculty_code);
        await admin.from("entries").delete().eq("faculty_code", publicUser.faculty_code);
      } else if (publicUser.campus_code) {
        await admin.from("balance_cards").delete().eq("campus_code", publicUser.campus_code).is("faculty_code", null);
        await admin.from("entries").delete().eq("campus_code", publicUser.campus_code).is("faculty_code", null);
      }

      const { error: publicError } = await admin.from("users").delete().eq("auth_id", authId);
      if (publicError) return NextResponse.json({ error: publicError.message }, { status: 400 });
    }

    const { error: authError } = await admin.auth.admin.deleteUser(authId);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
