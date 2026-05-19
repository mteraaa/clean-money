import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import {
  WHITE,
  type DrawPage,
  type PageSetupOpts,
  setupPage,
  drawPreparedBy,
} from "../generate-attachment-c/pdf-helpers";
import { fetchOrgData, fetchIncomeEntries, fetchFinesData } from "./data";
import { drawAttachmentA, drawAttachmentB, ensurePdfSpace, type PdfState, type PdfCtx, type CustomTable } from "./helpers";

const LEFT = 40, CONTENT_TOP = 680, CONTENT_BOT = 80;
const AB_COLS = [130, 90, 90, 90];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectionTitleA = searchParams.get("sectionTitleA") ?? "";
  const sectionTitleB = searchParams.get("sectionTitleB") ?? "";
  const preparedByName = searchParams.get("preparedByName") ?? "";
  const preparedByPosition = searchParams.get("preparedByPosition") ?? "";

  let customTables: CustomTable[] = [];
  try {
    const raw = searchParams.get("customTables");
    if (raw) customTables = JSON.parse(raw);
  } catch { /* empty */ }

  const allIds = customTables.flatMap((t) => t.entryIds);
  const templatePath = path.join(process.cwd(), "public", "attachment-a-b-template.pdf");

  if (allIds.length === 0) {
    const bytes = fs.readFileSync(templatePath);
    return new NextResponse(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" },
    });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const orgData = await fetchOrgData(supabase, user.id);
  if (!orgData) return new NextResponse("Not found", { status: 404 });
  const { faculty_code, campus_code, facultyName } = orgData;

  const { data: sem } = await supabase.from("semesters").select("id").eq("is_active", true).single();
  if (!sem) return new NextResponse("No active semester", { status: 404 });

  const [entryMap, finesCalc] = await Promise.all([
    fetchIncomeEntries(supabase, allIds, sem.id, faculty_code, campus_code),
    fetchFinesData(supabase, sem.id, faculty_code, campus_code),
  ]);

  const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
  while (pdfDoc.getPageCount() > 1) pdfDoc.removePage(1);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width } = pdfDoc.getPages()[0].getSize();
  const CONTENT_W = width - 80;

  const pageOpts: PageSetupOpts = { facultyName, font, boldFont, left: LEFT, contentW: CONTENT_W, contentTop: CONTENT_TOP, contentBot: CONTENT_BOT };
  const setup = (pg: DrawPage) => setupPage(pg, pageOpts);
  const cover = (pg: DrawPage) => pg.drawRectangle({ x: 0, y: CONTENT_TOP, width, height: 50, color: WHITE });

  const state: PdfState = { pageIndex: 0, curY: CONTENT_TOP, currentPage: pdfDoc.getPages()[0] as DrawPage };
  setup(state.currentPage);

  const ctx: PdfCtx = { pdfDoc, setup, cover, font, boldFont, width, CONTENT_W, LEFT, CONTENT_TOP, CONTENT_BOT };
  await drawAttachmentA(state, ctx, sectionTitleA, customTables, entryMap);
  await drawAttachmentB(state, ctx, sectionTitleB, finesCalc, AB_COLS);

  await ensurePdfSpace(state, ctx, 70);
  const orgCode = faculty_code ?? campus_code ?? "";
  const designation = [orgCode, orgCode ? "- SEB" : "SEB", preparedByPosition].filter(Boolean).join(" ");
  drawPreparedBy(state.currentPage, preparedByName, designation, LEFT, state.curY - 40, font, boldFont);

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" },
  });
}
