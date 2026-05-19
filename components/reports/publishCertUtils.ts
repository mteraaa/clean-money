export type CertForm = {
  receiver: string;
  designation: string;
  dateDeposited: string;
  amount: string;
  treasurer: string;
  auditDate: string;
  auditor: string;
};

export const EMPTY_CERT: CertForm = {
  receiver: "",
  designation: "",
  dateDeposited: "",
  amount: "",
  treasurer: "",
  auditDate: "",
  auditor: "",
};

export function toWords(num: number): string {
  if (num === 0) return "Zero Pesos";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
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

export function buildCertUrl(form: CertForm): string {
  const p = new URLSearchParams({ t: Date.now().toString() });
  if (form.receiver) p.set("receiver", form.receiver);
  if (form.designation) p.set("designation", form.designation);
  if (form.dateDeposited) p.set("dateDeposited", form.dateDeposited);
  if (form.amount) p.set("amount", form.amount);
  if (form.treasurer) p.set("treasurer", form.treasurer);
  if (form.auditDate) p.set("auditDate", form.auditDate);
  if (form.auditor) p.set("auditor", form.auditor);
  return `/api/generate-report?${p.toString()}`;
}
