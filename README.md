# clean-money

CLARO is a web-based transparent financial management system
for the Visayas State University - Student Election Board.

| Internal Release Code | Date Released |

| :--- | :--- |

| CM.010.001 | 2025-02-13 |

| CM.010.002 | 2025-03-02 |

| CM.010.003 | 2025-03-11 |

| CM.010.004 | 2026-04-27 |

| CM.010.005 | 2026-05-20 |

---

## ## CM.010.005 Release Notes

\*\*\* Dashboard & Financial Entry Management

- Implement comprehensive Dashboard page with real-time financial overview and balance cards display.
- Add AddEntrySheet component with batch income/expense entry creation, control number generation, and receipt attachment support.
- Create IncomeEntriesTable and ExpenseEntriesTable for organized entry viewing, sorting, and filtering by category.
- Implement CategoryEntriesTable for detailed transaction view by expense/income category.
- Add EntryFormFields, EntryPriceFields, and EntryDescriptionFields for flexible entry creation workflow.
- Develop useCategoryEntries and useEntryDelete hooks for entry management operations.
- Implement soft delete functionality for entries with is_deleted, deleted_at, and deleted_by fields.

\*\*\* Activity Logging & Audit Trail

- Add ActivityLogTable component for comprehensive audit trail display showing all system activities.
- Implement activity_logs database table for recording user actions with timestamps and action types.
- Create logActivity utility function for automatic audit trail generation across all operations.
- Display activity logs on dedicated Activity Logs page with sorting and filtering capabilities.

\*\*\* Balance & Financial Tracking

- Implement BalanceCards component with visual display of total balance, cash on hand, and cash on bank.
- Create individual balance card components: TotalBalanceCard, CashOnHandCard, CashOnBankCard, CollectiblesCard, and FinesCard.
- Add CalculatorDialog for quick balance calculations and deposit/withdrawal computations.
- Implement FineEditDialog for managing fine amounts with automatic balance updates.
- Add InitialBalanceSetupCard for semester-opening balance configuration.
- Develop useBalanceActions and useFineActions hooks for balance update operations and fine management.
- Create executeBankUpdate utility for bank deposit tracking and reconciliation.

\*\*\* Multi-Attachment Report Generation

- Add AttachmentABTab and AttachmentABTableSection for income report (Attachment A/B) viewing and export.
- Implement AttachmentCTab and AttachmentCTableSection for expense report (Attachment C) viewing and export.
- Add /api/generate-attachment-ab endpoint for income attachment PDF generation.
- Add /api/generate-attachment-c endpoint for expense attachment PDF generation.
- Implement useAttachmentABData and useAttachmentCData hooks for attachment data aggregation.
- Add publishCertUtils for certification field handling in multi-attachment reports.

\*\*\* Admin Account Management

- Add /api/admin/create-user endpoint for super-admin user account creation.
- Add /api/admin/remove-user endpoint for user account deletion and deactivation.
- Implement AccountMonitoringCard for displaying active accounts and user status.
- Create AddAccountDialog for adding new users with role assignment.
- Create DeleteAccountDialog for account removal with confirmation workflow.
- Implement SemesterCard component for semester management and semester-based account linking.
- Add EndSemesterDialog for semester closure operations and data archival.

\*\*\* Public Report Viewer & Stakeholder Access

- Enhance /api/public-pdf endpoint for public financial report access without authentication.
- Implement PublishCertTab for viewing certification details in published reports.
- Add FileViewerDialog for image and document preview with zoom and download capabilities.
- Develop publishedFileHelpers utilities for file type detection and display formatting.
- Enable read-only access for stakeholders to view published semester reports.

\*\*\* Enhanced Archive & Receipt Organization

- Improve Archives page with advanced folder navigation and nested receipt viewing.
- Add receipt_archive_files table for individual file metadata and version control.
- Implement folder-based organization for receipt archives with automatic archival on data deletion.
- Add signed URL generation for secure archive file access.
- Support archive search, filtering, and bulk operations.

\*\*\* Infrastructure & Dependencies

- Add pdf-lib and @pdf-lib/fontkit for advanced PDF manipulation and font embedding.
- Add react-pdf for client-side PDF viewing capabilities.
- Add sonner for improved toast notification UI and animations.
- Update @supabase/supabase-js and @supabase/ssr to latest versions.
- Add date-fns for enhanced date formatting and manipulation utilities.
- Implement ProxyConfig in proxy.ts for role-based route protection (campus_account, faculty_account, public_users).

\*\*\* UI/UX Improvements

- Enhance ConfirmDialog with improved accessibility and user feedback.
- Improve email, password, and username settings components with validation feedback.
- Add SettingsCard wrapper for consistent settings page layout.
- Implement responsive design improvements across dashboard and entry components.
- Add loading states and skeleton screens for better perceived performance.

\*\*\* Database Enhancements

- New/updated tables: activity_logs, receipt_archive_files (audit trail and archive management).
- Enhanced entries table with soft delete support (is_deleted, deleted_at, deleted_by).
- Extended balance_cards table for multi-semester tracking and historical data.
- Improved report filtering and multi-semester report comparison support.

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

- _Design Specs:_ [https://github.com/clean-money-docportal](https://github.com/mteraaa/clean-money-docportal)
