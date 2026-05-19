import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const campusCode = searchParams.get("campus_code");
  const facultyCode = searchParams.get("faculty_code") || null;
  const semesterId = searchParams.get("semester_id");

  if (!campusCode || !semesterId) {
    return new NextResponse("Missing params", { status: 400 });
  }

  const supabase = createAdminClient();

  const bucket = facultyCode ? "Faculties" : "Campus SEB";

  const query = supabase
    .from("archives")
    .select("file_path, title")
    .eq("semester_id", parseInt(semesterId))
    .ilike("title", "%Financial Summary%");

  if (facultyCode) query.eq("faculty_code", facultyCode);
  else query.eq("campus_code", campusCode);

  const { data } = await query.maybeSingle();
  if (!data?.file_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.file_path, 3600);

  if (!signed?.signedUrl) {
    return new NextResponse("Could not generate URL", { status: 500 });
  }

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    title: data.title ?? "Financial Report",
  });
}
