# Invoice Manager PRD

**Product Type:** Local-first service invoice management web app  
**Target User:** Marketing agency / service provider team  
**Primary Stack:** React + Vite, localStorage for MVP, optional IndexedDB/Supabase later  
**Version:** PRD v1.0  
**Prepared For:** Nova Studios Marketing  
**Date:** 2 June 2026

## Product Thesis
Invoice Manager should not behave like a basic invoice creator. It should work as a client-project billing operating system where every project has a billing model, invoice chain, unlock rules, payment tracking, and clear upcoming actions.

## Core Data Flow
Client -> Project -> Billing Model -> Invoice Plan / Stage -> Generated Invoice -> Payment Entry -> Dashboard / Reports

## 1. Product Overview
Invoice Manager is a local-first web application for service provider companies that manage clients, projects, staged invoices, advance payments, milestone invoices, final invoices, monthly retainers, and collection follow-ups. The tool helps the team understand what has been billed, what has been paid, what is pending, and what invoice needs to be generated next.

### Objectives
- Create and manage clients and their projects in one place.
- Define project-level billing logic before generating invoices.
- Support advance + final, milestone-based, full amount, monthly retainer, and add-on invoice models.
- Track locked invoice stages that cannot be generated or updated until conditions are met.
- Track sent invoices, paid invoices, partially paid invoices, overdue invoices, and upcoming invoices.
- Make the dashboard action-oriented with upcoming invoices, collection reminders, milestone billing, and priority tasks.
- Keep the MVP local-first using browser storage, while structuring data so it can later move to a backend.

### Non-Goals for MVP
- No multi-user permissions in the first version.
- No automated email sending unless manually triggered later.
- No accounting software integration in the first version.
- No GST filing, tax return generation, or compliance filing automation.
- No payment gateway integration in the first version.

## 2. Core Product Architecture
The product should be built around linked records. Invoices should not be isolated entries. Every invoice should ideally connect back to a client, a project, and a billing stage.

| Entity | Purpose | Key Fields |
|---|---|---|
| Business | Stores company details used on invoices. | businessId, name, email, phone, address, GSTIN, bank details, UPI, invoice prefix |
| Client | Stores client company and contact details. | clientId, name, contactPerson, email, phone, address, GSTIN, status |
| Project | Commercial unit under a client. | projectId, clientId, name, category, projectValue, status, startDate, deliveryDate |
| Billing Model | Defines how project value will be billed. | billingModelId, projectId, type, totalSplit, status, createdAt |
| Invoice Stage | Planned invoice stage before an invoice is generated. | stageId, projectId, split, amount, trigger, unlockRule, stageStatus |
| Invoice | Generated invoice created from a stage. | invoiceId, stageId, invoiceNo, issueDate, dueDate, status, total, paid, due |
| Payment Entry | Payment record against an invoice. | paymentId, invoiceId, amount, date, mode, reference, notes |
| Activity Log | Timeline of important billing actions. | activityId, entityType, entityId, action, timestamp, actor |

### Locked Stage Rules
Locked status should primarily exist at the Invoice Stage level. A locked stage should not allow invoice generation or payment updates because no invoice should exist until the stage is unlocked and generated.

| Billing Type | Locked Condition | Unlock Condition |
|---|---|---|
| Advance | Usually not locked after billing model is approved. | Project billing plan is approved. |
| Final | Locked while project is not delivered. | Project status becomes Delivered and required previous invoices are Paid. |
| Milestone | Locked until milestone is approved/completed. | Milestone status becomes Approved or Completed. |
| Monthly Retainer | Locked before billing period starts. | Billing period start date is reached. |
| Add-on | Locked until scope/change request is approved. | Add-on request status becomes Approved. |

**Critical implementation rule:** A locked invoice stage must disable Generate Invoice, Send Invoice, Mark Paid, Record Payment, and editable amount changes. The UI should display a lock icon and explain the unlock condition.

## 3. Module Breakdown
The MVP has five major modules: Dashboard, Clients, Projects, Invoices, and Invoice Generation. Each module should reuse the same linked billing data model.

### 3.1 Dashboard Module
The dashboard is the operating center. It should show upcoming invoices, pending actions, collection work, and billing pipeline health.

Key features:
- Upcoming invoice widgets
- Pending collections
- Milestones ready to bill
- Priority actions
- Collection timeline
- Project billing pipeline
- Recent activity

Acceptance criteria:
- User can see what invoices are coming up without opening each project.
- Dashboard highlights locked, ready, pending, overdue, and action-required states.
- Dashboard values calculate from linked invoices and payments, not manual summaries.
- Clicking a dashboard row opens the relevant client, project, invoice, or invoice-generation step.

### 3.2 Clients Module
The Clients module manages client records and gives a client-level billing snapshot. It should show linked projects, billing models, invoice chains, upcoming invoices, collection status, and client-specific actions.

Key sections:
- Client Directory
- Client Overview
- Client Metrics
- Linked Projects
- Upcoming Invoices for Client
- Invoice Chain Summary
- Client Actions

Acceptance criteria:
- Selecting a client updates the entire client workspace without losing context.
- Client totals aggregate all active projects and invoices.
- Client screen clearly shows the next invoice action for each linked project.
- User can create a project or invoice from the selected client screen.

### 3.3 Projects Module
The Projects module is where commercial billing logic is defined. Each project must have a project value, billing status, project stage, billing model, invoice stages, and payment progress.

Key features:
- Project Profile
- Billing Model Assignment
- Invoice Plan / Stages
- Project Status Control
- Milestone Control
- Progress and Billing Summary

Acceptance criteria:
- A project cannot generate linked invoices until a billing model is selected and validated.
- For percentage-based plans, total split should equal 100%.
- If the project value changes before invoices are generated, planned stage amounts should recalculate.
- If an invoice already exists, commercial changes should require confirmation or create an adjustment/add-on stage.

### 3.4 Invoices Module
The Invoices module lists and manages all generated invoices. It is not the place where billing logic is created; it manages existing invoices, payments, reminders, previews, and status changes.

Key features:
- Invoice List
- Filters
- Mark Paid
- Record Partial Payment
- Send Reminder
- Preview / Export
- Void Invoice

Invoice status calculation:
- Created but not sent: Draft
- Sent and paidAmount = 0 and dueDate not passed: Sent
- paidAmount > 0 and paidAmount < invoiceTotal: Partially Paid
- paidAmount >= invoiceTotal: Paid
- dueDate passed and dueAmount > 0: Overdue
- cancelled by user: Voided

### 3.5 Invoice Generation Module
Invoice Generation is a guided flow for creating invoices from approved project billing stages. It should prevent disconnected invoices and protect locked stages.

Steps:
1. Billing Model Setup
2. Billing Schedule Builder
3. Generate Linked Invoice
4. Review & Send
5. Payment Actions

Supported billing logic:
- Advance + Final
- Milestone Based
- Full Amount
- Monthly Retainer
- Add-on / Additional Scope

Acceptance criteria:
- Invoice generation starts from a project or unlocked invoice stage.
- Locked stages cannot generate invoices until unlock conditions are met.
- Generated invoices retain linked stage ID, project ID, and client ID.
- Advance + Final plan creates at least two planned stages: advance and final.
- For a 40% / 60% website project, advance amount calculates as 40% of project value and final as 60%.
- Previewing or exporting an invoice must not create a new invoice record.

## 4. Key User Workflows

### Create Client, Project, and Billing Plan
1. User creates a client from the Clients module.
2. User creates a project under that client and enters project value.
3. User selects billing model in the Project or Invoice Generation flow.
4. System creates planned invoice stages and validates the split.
5. User reviews and saves the linked plan.

### Advance + Final Example
| Step | Logic |
|---|---|
| Project Value | ₹5,00,000 |
| Advance Stage | 40% = ₹2,00,000, unlocked immediately after plan approval. |
| Final Stage | 60% = ₹3,00,000, locked until project status is Delivered. |
| Advance Invoice | Can be generated and sent at project kickoff. |
| Final Invoice | Can be generated only when project status is Delivered and required previous stages are paid. |
| Project Totals | Project invoiced, collected, outstanding, and balance to invoice are calculated from linked invoices. |

### Payment Recording Workflow
1. User opens an invoice from the Invoices module or Project/Client workspace.
2. User clicks Mark Paid or Record Partial Payment.
3. System creates a payment entry linked to the invoice.
4. Invoice status updates based on total paid amount.
5. Project and client totals update automatically.
6. Dashboard pending collections and activity feed update automatically.

## 5. Validation and Calculation Rules
| Rule Area | Requirement |
|---|---|
| Project Value Split | For percentage plans, stage percentage totals must equal 100% before the plan is marked valid. |
| Stage Amount | stageAmount = projectValue * splitPercentage / 100 unless manually overridden before invoice generation. |
| GST Calculation | gstAmount = taxableAmount * GST percent / 100. |
| Invoice Total | invoiceTotal = subtotal + GST - discount. |
| Paid Amount | paidAmount = sum of payment entries against invoice. |
| Due Amount | dueAmount = invoiceTotal - paidAmount. |
| Project Invoiced | Sum of active invoice totals linked to the project. |
| Project Collected | Sum of payment entries linked to active project invoices. |
| Project Outstanding | Project invoiced - Project collected. |
| Balance to Invoice | Project value - generated invoice subtotal, excluding GST unless configured otherwise. |

## 6. UI Screen Requirements
| Screen | Purpose | Primary Components |
|---|---|---|
| Dashboard | Operational command center for upcoming invoices and collections. | Upcoming invoice widgets, priority actions, collection timeline, billing pipeline, recent activity. |
| Clients | Client workspace with linked projects and invoice chains. | Client directory, client profile, project cards, invoice chain summary, upcoming client invoices. |
| Projects | Project workspace and commercial billing setup. | Project details, billing model, invoice stages, project totals, unlock conditions. |
| Invoices | Manage generated invoices and payments. | Invoice table, filters, mark paid, partial payment, reminders, preview/export. |
| Invoice Generation | Guided linked invoice creation flow. | Billing model setup, schedule builder, generate invoice, review/send, payment actions. |

## 7. MVP Storage and Technical Notes
The current MVP can use localStorage for quick testing, but the schema should be structured so it can later be moved to IndexedDB, Supabase, or another backend without changing the product logic.

Recommended localStorage keys:
- business
- clients
- projects
- billingModels
- invoiceStages
- invoices
- payments
- activityLogs

Preview/export rule: Preview and export must use the existing invoice ID and must not call createInvoice or duplicateInvoice.

## 8. Success Metrics
- User can create a client, project, billing plan, and linked invoice without confusion.
- User can identify all upcoming invoices within 10 seconds from the dashboard.
- User can see which invoice stages are locked and why.
- User can mark invoices as paid or partially paid and see totals update instantly.
- Exporting or previewing invoices never creates duplicate invoice records.
- Project, client, and dashboard totals remain consistent across all modules.

## 9. Open Product Decisions
| Decision Area | Question | Suggested Default |
|---|---|---|
| GST Handling | Should project value be exclusive or inclusive of GST? | Store project value as exclusive of GST; invoice total includes GST. |
| Manual Overrides | Can users manually override calculated stage amount? | Allow only before invoice generation with warning. |
| Draft Payments | Can payment be recorded against Draft invoices? | Avoid in MVP; allow only Sent/Partially Paid/Overdue. |
| Retainer Recurrence | Should retainer invoices auto-create or be generated manually from upcoming stages? | Manual generation from ready stages in MVP. |
| Voiding Paid Invoices | Can paid invoices be voided? | Require admin override in future; hidden in MVP. |

## Implementation Priority
Start by building the linked data model and locked stage rules before polishing reports. The product value depends on invoice chains, not just invoice templates.
