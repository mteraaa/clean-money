import { toWords, type CertForm } from "./publishCertUtils";

type Props = {
  certForm: CertForm;
  onChange: (field: keyof CertForm, value: string) => void;
  onBlur: (field: keyof CertForm, value: string) => void;
};

function Field({
  label, value, onChange, onBlur, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
      />
    </div>
  );
}

export default function PublishCertTab({ certForm, onChange, onBlur }: Props) {
  const amountNum = parseFloat(certForm.amount);
  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Deposited With</p>
        <div className="space-y-3">
          <Field label="Name of Receiver" value={certForm.receiver} onChange={(v) => onChange("receiver", v)} onBlur={(v) => onBlur("receiver", v)} />
          <Field label="Designation / Office" value={certForm.designation} onChange={(v) => onChange("designation", v)} onBlur={(v) => onBlur("designation", v)} />
          <Field label="Date Deposited" type="date" value={certForm.dateDeposited} onChange={(v) => onChange("dateDeposited", v)} onBlur={(v) => onBlur("dateDeposited", v)} />
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Amount</label>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={certForm.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              onBlur={(e) => onBlur("amount", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {certForm.amount && !isNaN(amountNum) && amountNum > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5 italic leading-snug">{toWords(amountNum)}</p>
            )}
          </div>
        </div>
      </section>

      <section className="pt-4 border-t border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Treasurer</p>
        <Field label="Name of Treasurer" value={certForm.treasurer} onChange={(v) => onChange("treasurer", v)} onBlur={(v) => onBlur("treasurer", v)} />
      </section>

      <section className="pt-4 border-t border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Audit Certificate</p>
        <div className="space-y-3">
          <Field label="Date" type="date" value={certForm.auditDate} onChange={(v) => onChange("auditDate", v)} onBlur={(v) => onBlur("auditDate", v)} />
          <Field label="Name of Auditor" value={certForm.auditor} onChange={(v) => onChange("auditor", v)} onBlur={(v) => onBlur("auditor", v)} />
        </div>
      </section>
    </div>
  );
}
