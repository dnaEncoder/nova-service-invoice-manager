# Service Invoice Logic Rules Document

Client → Project → Invoice Plan → Payments logic for the React local-first invoice manager

## 1. Purpose
This document defines the billing and invoice-generation rules for a service-provider invoice manager. The goal is to move the current app from simple invoice creation to a structured client/project billing system where each project can have its own payment logic: advance, milestone invoices, final payment, full payment, monthly retainers, and add-on invoices.

The rules are written so they can be embedded directly into the current React logic using localStorage now, and later moved to IndexedDB or a backend without changing the core billing model.

## 2. Core Relationship Model
The app should follow this hierarchy:

Client → Projects → Invoice Plan → Invoices → Payments

A client can have many projects. Each project can have one invoice plan. The invoice plan defines how the project amount will be billed. Each invoice belongs to one client and one project, and ideally to one invoice-plan stage. Payments are recorded against invoices, not directly against the project. Project-level paid, pending, and balance values are calculated from linked invoices and payments.

This avoids duplicate tracking and makes project payment progress reliable.

## 3. Main Entities
Client stores company/contact information and default billing preferences. Project stores project value and billing model. Invoice Plan stores the expected billing breakdown. Invoice stores the actual bill sent to the client. Payment stores actual money received.

Recommended entity chain:
- Client: business/customer details.
- Project: commercial agreement for a scope of work.
- InvoicePlan: expected billing structure for that project.
- InvoicePlanStage: advance/milestone/final/full/retainer stage.
- Invoice: actual generated invoice.
- Payment: actual received amount against an invoice.

Important rule: project progress should not be updated manually. It should be calculated from invoices and payments.

## 4. Client Billing Profile Rules
Each client can have a default billing profile. This profile helps pre-fill project payment plans, but the project can override it.

Recommended billing profile fields:
- defaultPaymentTermsDays: Example: 7, 10, 15, or 30 days.
- defaultTaxRate: Example: 18% GST.
- defaultBillingModel: Example: Advance + Final, Milestone, Monthly Retainer.
- defaultAdvancePercent: Example: 40%.
- requiresAdvanceBeforeStart: true/false.
- preferredPaymentMode: UPI, bank transfer, cheque, etc.

Example: A website client may default to 40% advance and 60% after delivery. A monthly social media client may default to monthly retainers billed at the start of each month.

## 5. Project Billing Models
The project should have a billing model. This billing model decides which invoices can be generated and when.

Supported billing models:
1. Advance + Final
   Used for website, branding, landing page, and one-time service projects.
   Example: 40% advance + 60% after delivery.

2. Advance + Milestones
   Used for larger projects where payments are broken into multiple stages.
   Example: 30% advance + 40% after design approval + 30% after development handover.

3. Full Upfront
   Used for small fixed-scope projects.
   Example: 100% invoice before work starts.

4. Full After Delivery
   Used only for trusted clients or internal arrangements.
   Example: 100% invoice after delivery.

5. Monthly Retainer
   Used for recurring services like social media management, SEO, ad management, content marketing, and website maintenance.
   Example: ₹50,000 per month billed on the 1st of every month.

6. Add-on / Ad-hoc Invoice
   Used for extra work outside the original project scope.
   Example: extra shoot, additional landing page, extra campaign creatives.

## 6. Invoice Categories and Rules
Each invoice must have an invoiceType. The invoice type controls calculation and validation.

Advance Invoice
- Usually generated first.
- Can be percentage-based or fixed amount.
- Can block project start until paid if requiresAdvanceBeforeStart is true.
- Example: 40% of website project value.

Milestone Invoice
- Generated against a defined stage.
- Cannot exceed the amount assigned to that stage.
- Can be blocked until the previous required stage is paid.
- Example: 30% after design approval.

Final Invoice
- Generated after final delivery or before handover.
- Usually calculates the remaining unbilled project value.
- Should not be generated if there are pending required invoices, unless override is allowed.

Full Amount Invoice
- Bills 100% of project value in one invoice.
- Should automatically mark all plan stages as invoiced if used.

Monthly Retainer Invoice
- Generated for a service period, such as June 2026.
- Amount may not be linked to a total project value unless the project has a fixed contract duration.
- Should store billingPeriodStart and billingPeriodEnd.

Add-on Invoice
- Should be linked to a project but marked as outside original scope.
- Can increase project commercial value if add-ons are approved.
- Should not reduce the remaining balance of the original invoice plan unless configured to do so.

## 7. Payment Schedule Rules
Every project should have a payment schedule. This is the expected billing plan before actual invoices are generated.

Each schedule stage should include:
- stageId
- label: Advance, Design Milestone, Final Delivery, etc.
- invoiceType
- percentage or fixedAmount
- baseAmount
- taxRate
- invoiceId if generated
- status: Not Generated, Drafted, Sent, Partially Paid, Paid, Overdue, Voided
- dueTrigger: On Project Start, On Design Approval, On Delivery, Monthly, Custom Date
- dueDate or dueDaysAfterTrigger

Rule: invoices should be generated from schedule stages, not created as completely disconnected records. This allows project billing progress to remain accurate.

## 8. Amount Calculation Rules
Use the project base value as the source amount. GST/tax should be calculated separately.

Recommended formula:
Base Amount = Project Value × Stage Percentage
Tax Amount = Base Amount × Tax Rate
Invoice Total = Base Amount + Tax Amount - Discount
Amount Due = Invoice Total - Paid Amount

For fixed amount stages:
Base Amount = fixedAmount

For final payment:
Final Base Amount = Project Value - Sum of already scheduled base amounts, or Project Value - Sum of already invoiced base amounts depending on the selected mode.

Important rule: decide whether projectValue is tax-exclusive or tax-inclusive. For service billing, tax-exclusive is cleaner:
- Project Value: ₹1,00,000
- GST 18%: ₹18,000
- Total Collectable: ₹1,18,000

## 9. Status Logic
Invoice status should be computed from the invoice lifecycle and payment amount.

Draft:
Invoice exists but has not been sent.

Sent:
Invoice has been sent and paidAmount is 0.

Partially Paid:
paidAmount is greater than 0 but lower than invoice total.

Paid:
paidAmount is equal to or greater than invoice total.

Overdue:
Invoice is Sent or Partially Paid, dueDate is before today, and amountDue is greater than 0.

Void:
Invoice should not be counted in project billing totals.

Recommended rule: status can be manually selected, but the system should still auto-correct payment-based statuses when payment is recorded.

## Locked Invoice Stage Rules

Some invoices should not be generated, edited, sent, or marked paid until their unlock conditions are met.

The lock should primarily exist at the InvoicePlanStage level, not only on the Invoice level.

Recommended stage statuses:
- Locked
- Ready to Generate
- Drafted
- Sent
- Partially Paid
- Paid
- Overdue
- Voided

A locked stage means the invoice is planned but cannot yet be generated.

Examples:

1. Advance Invoice
- Usually unlocked immediately.
- Can be generated when the project billing plan is approved.

2. Final Invoice
- Locked until project status becomes Delivered.
- Can also require all previous mandatory invoices to be Paid.

3. Milestone Invoice
- Locked until the milestone status becomes Approved or Completed.
- Can require previous milestone invoices to be Paid or Sent based on project settings.

4. Monthly Retainer Invoice
- Locked until the billing period starts.
- Example: August retainer invoice becomes ready on 1 August.

5. Add-on Invoice
- Locked until the add-on scope is approved.

The system should prevent these actions for locked stages:
- Generate Invoice
- Send Invoice
- Mark Paid
- Record Payment
- Edit Amount, unless override is enabled

The UI should show:
- Lock icon
- Locked status badge
- Unlock condition message
- Disabled action buttons

## 10. Project Summary Calculation Rules
Project summary values should be calculated from linked invoices.

projectBaseValue = project.totalValue
projectTaxableTotal = sum(invoice.taxAmount for active invoices)
projectInvoicedBase = sum(invoice.subtotal for active invoices)
projectInvoicedTotal = sum(invoice.total for active invoices)
projectPaidTotal = sum(invoice.paidAmount for active invoices)
projectPendingTotal = sum(invoice.amountDue for active invoices)
projectRemainingBaseToInvoice = project.totalValue - projectInvoicedBase

Void invoices should be excluded from all project summary calculations.

If add-on invoices are approved as project value additions, project.totalValue should increase or project.approvedAddOnValue should be tracked separately.

## 11. Validation Rules
Core validation rules:
1. An invoice must always be linked to a client and project.
2. A project should not generate invoices beyond the project value unless add-ons are allowed.
3. A schedule stage should not generate more than one active invoice unless split billing is enabled.
4. Viewing, previewing, printing, or exporting an invoice must never create a new invoice.
5. Duplicate invoice should only happen through an explicit Duplicate action.
6. Mark Paid should record payment equal to the due amount and update paidDate.
7. Partial payment should create a payment record and update invoice.paidAmount.
8. Final invoice should be blocked if required advance or milestone invoices are unpaid, unless override is enabled.
9. Draft invoices should not be counted as sent, but can be counted as planned billing.
10. Void invoices should remain visible for audit but excluded from totals.

## 12. Suggested Data Shape
The current localStorage structure should evolve into a normalized data shape. This will make it easier to move to IndexedDB or Supabase later.

Recommended localStorage root object:
{
  version: 3,
  business: {},
  clients: [],
  projects: [],
  invoicePlans: [],
  invoices: [],
  payments: []
}

Recommended project object:
{
  id,
  clientId,
  name,
  serviceCategory,
  totalValue,
  taxMode: "exclusive",
  defaultTaxRate,
  billingModel,
  requiresAdvanceBeforeStart,
  allowAddOns,
  status,
  startDate,
  deliveryDate
}

Recommended invoicePlan stage object:
{
  id,
  projectId,
  label,
  invoiceType,
  percentage,
  fixedAmount,
  baseAmount,
  taxRate,
  dueTrigger,
  dueDate,
  invoiceId,
  status,
  sortOrder
}

Recommended invoice object:
{
  id,
  invoiceNo,
  clientId,
  projectId,
  planStageId,
  invoiceType,
  status,
  issueDate,
  sentDate,
  dueDate,
  paidDate,
  serviceItems,
  subtotal,
  taxAmount,
  discountAmount,
  total,
  paidAmount,
  amountDue,
  isVoid
}

Recommended payment object:
{
  id,
  invoiceId,
  clientId,
  projectId,
  amount,
  paymentDate,
  paymentMode,
  referenceNo,
  notes
}

## 13. Code Logic Functions to Add
Recommended functions for the React codebase:

createInvoicePlan(project, billingConfig)
Creates the payment schedule when a project is created.

calculateStageAmount(project, stage)
Calculates base amount, tax, and total for a schedule stage.

generateInvoiceFromStage(projectId, stageId)
Creates one invoice from a selected payment schedule stage.

recordPayment(invoiceId, paymentData)
Adds payment record and updates invoice paid amount/status.

markInvoicePaid(invoiceId)
Creates payment for the full due amount and sets invoice as Paid.

recalculateInvoiceStatus(invoice)
Returns Draft, Sent, Partially Paid, Paid, Overdue, or Void based on payment and dates.

getProjectBillingSummary(projectId)
Returns project value, invoiced, paid, pending, and remaining to invoice.

canGenerateInvoice(projectId, stageId)
Checks whether the stage can be invoiced based on previous invoices and rules.

voidInvoice(invoiceId)
Marks invoice as void without deleting it from history.

## 14. Example: Website Project With 40% Advance and 60% Final
Project Value: ₹1,00,000 excluding GST
GST: 18%
Billing Model: Advance + Final
Advance: 40%
Final: 60%

Payment Schedule:
Stage 1: Advance Invoice
- Base: ₹40,000
- GST: ₹7,200
- Invoice Total: ₹47,200
- Trigger: Before project start

Stage 2: Final Invoice
- Base: ₹60,000
- GST: ₹10,800
- Invoice Total: ₹70,800
- Trigger: On project delivery

Project Summary after advance is paid:
- Project Value: ₹1,00,000
- Invoiced Base: ₹40,000
- Invoiced Total: ₹47,200
- Paid: ₹47,200
- Remaining Base to Invoice: ₹60,000
- Pending Against Sent Invoices: ₹0

After final invoice is sent but unpaid:
- Invoiced Base: ₹1,00,000
- Invoiced Total: ₹1,18,000
- Paid: ₹47,200
- Pending Against Sent Invoices: ₹70,800
- Remaining Base to Invoice: ₹0

## 15. Example: Milestone-Based Project
Project Value: ₹5,00,000 excluding GST
Billing Model: Advance + Milestones

Suggested schedule:
- 30% Advance: ₹1,50,000
- 30% Strategy and Design Approval: ₹1,50,000
- 25% Production/Development Milestone: ₹1,25,000
- 15% Final Delivery: ₹75,000

Rules:
- Advance invoice can be generated immediately.
- Milestone invoices can be generated once the milestone is reached.
- Final invoice can be generated only after all previous stages are either Sent or Paid, depending on project settings.
- If a milestone invoice is partially paid, project pending should reflect the unpaid amount.

## 16. UI Rules for the Current App
Project Setup Screen:
- Add Billing Model selection.
- Add Payment Schedule builder.
- Allow percentages or fixed amounts.
- Show whether total schedule equals project value.
- Warn if schedule total is below or above project value.

Invoice Setup Screen:
- Invoice type should be selected from the project schedule.
- Amount should auto-fill from the selected stage.
- User can edit only if override is enabled.
- Show linked project summary in the side panel.

Invoices Screen:
- Mark Paid button should appear for Sent, Partially Paid, and Overdue invoices.
- Paid invoices should show Paid instead of Mark Paid.
- Draft invoices should show Send or Edit, not Mark Paid.
- Export/Preview should never duplicate invoice records.

Clients Screen:
- Client details should show total projects, total invoiced, collected, and pending.
- Client payment values should be computed from all projects and invoices.

## 17. Edge Cases
Partial Payment:
If the client pays only part of an invoice, create a payment record and set status to Partially Paid.

Overpayment:
If paidAmount is greater than invoice total, either block the entry or record credit balance.

Discount:
Discount should reduce invoice total, not project value, unless the discount is project-level.

Tax Rate Change:
Existing invoices should keep their historical tax rate. Future invoices can use the new tax rate.

Deleted Invoice:
Prefer Void instead of Delete once an invoice has been sent, paid, or exported.

Invoice Number:
Invoice number should be generated once and never changed automatically after sending.

Export:
Export should read the selected invoice by id. It should never call createInvoice or duplicateInvoice.

## 18. Acceptance Test Scenarios
1. Create a website project worth ₹1,00,000 with 40% advance and 60% final.
   Expected: two payment schedule stages are created.

2. Generate advance invoice.
   Expected: one invoice is created for ₹40,000 base + GST.

3. Preview/export the advance invoice.
   Expected: invoice count does not increase.

4. Click Mark Paid on advance invoice.
   Expected: payment record is created, invoice status becomes Paid, project paid amount updates.

5. Generate final invoice.
   Expected: final invoice is created for remaining ₹60,000 base + GST.

6. Record partial payment on final invoice.
   Expected: invoice status becomes Partially Paid and project pending updates.

7. Try to generate another advance invoice for same stage.
   Expected: system blocks duplicate active invoice unless split billing is enabled.

8. Void a sent invoice.
   Expected: invoice remains visible but is excluded from project totals.

## 19. Implementation Priority
Phase 1: Data and calculations
- Add invoicePlans and payments arrays.
- Add project billingModel and payment schedule.
- Add getProjectBillingSummary and recalculateInvoiceStatus.

Phase 2: UI integration
- Add payment schedule builder on project screen.
- Link invoice creation to schedule stages.
- Add Mark Paid and Record Payment flows.

Phase 3: Guardrails
- Block duplicate stage invoices.
- Add validation for overbilling.
- Convert delete to void for sent/paid invoices.

Phase 4: Advanced features
- Payment reminders.
- Client statements.
- Recurring monthly invoices.
- Export reports.
