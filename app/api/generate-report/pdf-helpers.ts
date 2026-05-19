import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const SZ = 9;
const COLOR = rgb(0, 0, 0);
const XR = 468, XI = 240, XBD = 343, XOL = 170;
const XC = { receiver: 226, designation: 422, dateDep: 152, amtWords: 257, amtNum: 467, treasurer: 394, auditDay: 194, auditMonth: 278, auditYear: 354, auditor: 394 };
const Y = {
  semester: 734, orgName: 708,
  beginBal: 670, beginHand: 657, beginBank: 644,
  membership: 617, donations: 604, fines: 591, collections: 578,
  others: [565, 552, 539, 525] as const,
  spRevenues: 499, collectiblesB: 472, totalFunds: 459,
  lessExpenses: 446, netBalance: 433,
  bdHand: 406, bdBank: 393, bdCollectibles: 380,
  receiver: 340, designation: 340,
  dateDeposited: 327, amountWords: 327, amountNum: 327,
  treasurer: 266, auditDay: 213, auditMonth: 213, auditYear: 213, auditor: 173,
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(n: number) {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero Pesos";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tensArr = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function w(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + w(n % 100) : "");
    if (n < 1_000_000) return w(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + w(n % 1000) : "");
    return w(Math.floor(n / 1_000_000)) + " Million" + (n % 1_000_000 ? " " + w(n % 1_000_000) : "");
  }
  const intPart = Math.floor(Math.abs(num));
  const cents = Math.round((Math.abs(num) - intPart) * 100);
  let result = w(intPart) + " Pesos";
  if (cents > 0) result += " and " + w(cents) + " Centavos";
  return result;
}

export type ReportData = {
  semName: string; y1: string; y2: string; orgName: string;
  initialBal: number; initCashHand: number; initCashBank: number;
  membershipFee: number; donations: number; fines: number;
  collectiblesIncome: number; others: { label: string; amount: number }[];
  spRevenues: number; collectiblesB: number; totalFunds: number;
  totalExpenses: number; netFundBalance: number;
  cashOnHand: number; cashOnBank: number;
};

export type CertFields = {
  receiver: string; designation: string; dateDeposited: string;
  amount: string; treasurer: string; auditDate: string; auditor: string;
};

export async function buildReportPdf(data: ReportData, cert: CertFields): Promise<Uint8Array> {
  const templateBytes = fs.readFileSync(path.join(process.cwd(), "public", "report-template.pdf"));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  function draw(text: string, x: number, y: number, size = SZ) {
    page.drawText(text, { x, y, size, font, color: COLOR });
  }
  function fitSize(text: string, maxWidth: number, maxSize: number): number {
    const w = font.widthOfTextAtSize(text, maxSize);
    return w <= maxWidth ? maxSize : (maxWidth / w) * maxSize;
  }

  const orgW = font.widthOfTextAtSize(data.orgName, SZ);
  draw(data.semName, 248, Y.semester);
  draw(data.y1.slice(-2), 361, Y.semester);
  draw(data.y2.slice(-2), 406, Y.semester);
  draw(data.orgName, (618 - orgW) / 2, Y.orgName);
  draw(fmt(data.initialBal), XR, Y.beginBal);
  draw(fmt(data.initCashHand), XI, Y.beginHand);
  draw(fmt(data.initCashBank), XI, Y.beginBank);
  draw(fmt(data.membershipFee), XR, Y.membership);
  draw(fmt(data.donations), XR, Y.donations);
  draw(fmt(data.fines), XR, Y.fines);
  draw(fmt(data.collectiblesIncome), XR, Y.collections);
  data.others.slice(0, 4).forEach(({ label, amount }, i) => {
    draw(label, XOL, Y.others[i]);
    draw(fmt(amount), XR, Y.others[i]);
  });
  draw(fmt(data.spRevenues), XI, Y.spRevenues);
  draw(fmt(data.collectiblesB), XR, Y.collectiblesB);
  draw(fmt(data.totalFunds), XR, Y.totalFunds);
  draw(fmt(data.totalExpenses), XR, Y.lessExpenses);
  draw(fmt(data.netFundBalance), XR, Y.netBalance);
  draw(fmt(data.cashOnHand), XBD, Y.bdHand);
  draw(fmt(data.cashOnBank), XBD, Y.bdBank);
  draw(fmt(data.collectiblesB), XBD, Y.bdCollectibles);

  if (cert.receiver) draw(cert.receiver, XC.receiver, Y.receiver, fitSize(cert.receiver, XC.designation - XC.receiver - 48, 9));
  if (cert.designation) draw(cert.designation, XC.designation, Y.designation, fitSize(cert.designation, 559 - XC.designation - 5, 9));
  if (cert.dateDeposited) {
    const [dy, dm, dd] = cert.dateDeposited.split("-");
    draw(`${MONTHS[parseInt(dm) - 1] ?? ""} ${parseInt(dd)}, ${dy}`, XC.dateDep, Y.dateDeposited);
  }
  if (cert.amount) {
    const amtNum = parseFloat(cert.amount);
    if (!isNaN(amtNum)) {
      const words = numberToWords(amtNum);
      draw(words, XC.amtWords, Y.amountWords, Math.max(6, fitSize(words, 155, 11)));
      draw(fmt(amtNum), XC.amtNum, Y.amountNum);
    }
  }
  if (cert.treasurer) draw(cert.treasurer, XC.treasurer, Y.treasurer);
  if (cert.auditDate) {
    const [ay, am, ad] = cert.auditDate.split("-");
    draw(String(parseInt(ad)), XC.auditDay, Y.auditDay);
    draw(MONTHS[parseInt(am) - 1] ?? "", XC.auditMonth, Y.auditMonth);
    draw(ay.slice(-2), XC.auditYear, Y.auditYear);
  }
  if (cert.auditor) draw(cert.auditor, XC.auditor, Y.auditor);

  return pdfDoc.save();
}
