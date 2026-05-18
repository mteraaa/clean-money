import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const campusCode = searchParams.get("campus_code");
  const facultyCode = searchParams.get("faculty_code") || null;
  const semesterId = searchParams.get("semester_id");

  if (!campusCode || !semesterId) {
    return new NextResponse("Missing params", { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );

  const query = supabase
    .from("reports")
    .select("summary_file_path")
    .eq("semester_id", parseInt(semesterId));

  if (facultyCode) query.eq("faculty_code", facultyCode);
  else query.eq("campus_code", campusCode).is("faculty_code", null);

  const { data } = await query.maybeSingle();
  if (!data?.summary_file_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bucket = facultyCode ? "Faculties" : "Campus SEB";

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.summary_file_path, 3600);

  if (!signed?.signedUrl) {
    return new NextResponse("Could not generate URL", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
