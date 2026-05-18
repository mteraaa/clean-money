import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const campusCode = searchParams.get("campus_code");
  const facultyCode = searchParams.get("faculty_code");
  const semesterId = searchParams.get("semester_id");

  if (!campusCode || !semesterId) {
    return new NextResponse("Missing params", { status: 400 });
  }

  const supabase = createAdminClient();

  const query = supabase
    .from("reports")
    .select("summary_file_path, title")
    .eq("semester_id", parseInt(semesterId));

  if (facultyCode) {
    query.eq("faculty_code", facultyCode);
  } else {
    query.eq("campus_code", campusCode).is("faculty_code", null);
  }

  const { data } = await query.maybeSingle();

  if (!data?.summary_file_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bucket = facultyCode ? "Faculties" : "Campus SEB";

  const { data: fileData, error } = await supabase.storage
    .from(bucket)
    .download(data.summary_file_path);

  if (error || !fileData) {
    return new NextResponse("Failed to fetch PDF", { status: 500 });
  }

  const arrayBuffer = await fileData.arrayBuffer();

  return new NextResponse(Buffer.from(arrayBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
