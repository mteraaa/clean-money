# clean-money

CLARO is a web-based transparent financial management system
for the Visayas State University - Student Election Board.

| Internal Release Code | Date Released |

| :--- | :--- |

| CM.010.001 | 2025-02-13 |

| CM.010.002 | 2025-03-02 |

| CM.010.003 | 2025-03-11 |

| CM.010.004 | 2026-04-27 |

---

## ## CM.010.004 Release Notes

\*\*\* Reporting & Documents

- Add report publishing workflow: Financial report PDF generation endpoint at /api/generate-report and a Publish dialog (components/PublishDialog.tsx) to preview, fill certification details, and publish reports to Supabase storage (Faculties / Campus SEB). Supports upsert to replace same-semester reports.
- Implement PublishedFilesTable with file/folder listing, sorting, select-mode, multi-delete, image zoom, PDF preview and download.
- Add PDFViewerCard for quick preview and download of the default financial report.
- Implement calculations from ledger entries to populate Financial Report inputs: report generation aggregates income and expense entries (by category, control numbers, totals) and computes fields required for the financial report PDF (totals, subtotals, amounts-in-words, control number summaries).
- Add auto-generate feature for Financial Report PDF inputs: Publish dialog and the PDF generation endpoint support an "Auto-generate" flow that fills certification fields and numeric report inputs from computed ledger values (with ability to review/edit before publishing).

\*\*\* Archives

- Implement Archives page with combined view of archived receipts and folder listing (receipt_archive_folders). Supports signed URLs, folder navigation, and delete for both files and folders.

\*\*\* Entries & Ledger

- Add AddEntrySheet for creating income/expense entries, batch entry support, control number generation, receipt upload, validation, and total calculation. Includes Income/Expense tables and balance cards (components/AddEntrySheet.tsx, IncomeEntriesTable.tsx, ExpenseEntriesTable.tsx, BalanceCards.tsx).

\*\*\* UI / Components

- Add PublishedFilesTable, PublishDialog, PDFViewerCard, UnpublishDialog and improved Published/Archive viewers with Drive-style toolbar, image zoom, and direct download/open in new tab.
- Sidebar and Protected layout improvements remain; Sidebar includes links for Reports, Archives, and Activity Logs.

\*\*\* Supabase & Data

- New/used tables: reports, archives, receipt_archive_folders, semesters, academic_years. Server interactions include publish (insert/update), signed URL generation for storage files, and bucket-aware uploads.

\*\*\* Middleware & Security

- Middleware (proxy.ts) protects routes and enforces role-based access (e.g., /super-admin). Authentication pages (login, reset-password) and role routing remain in place.

## ## CM.010.003 Release Notes

\*\*\* Navigation and Layout

- Add navigation links to Sidebar
- Create Archives, Reports, Activity Logs page
- Create Admin Controls, Accounts, and Requests

\*\*\* Authentication and Pages

- Add login functionality to Login
- Add reset password functionality
- Create separate routes for super_admin and admin roles after login
- Add Admin Controls, Accounts, and Requests to super_admin Sidebar

\*\*\* Infrastructure & UI Library

- Restructure folder layout for super_admin routes and admin routes

\*\*\* Supabase

- Create Database Tables

## ## CM.010.002 Release Notes

\*\*\* Navigation and Layout

- Add navigation links to Sidebar
- Add Sidebar component
- Resolve lint warnings in sidebar.tsx and tooltip.tsx
- Configure custom fonts in global.css and layout.tsx
- Reconfigure fonts in globals.css

\*\*\* Authentication and Pages

- Create login page and add LoginCard component
- Create LoginCard component
- Create Dashboard page

\*\*\* Infrastructure & UI Library

- Install shadcn/ui component

\*\*\* Supabase

- Establish Supabase connections

## ## CM.010.001 Release Notes

- Upload First document version

---

### Important Links:

- _Design Specs:_ [https://github.com/...](https://github.com/...)
