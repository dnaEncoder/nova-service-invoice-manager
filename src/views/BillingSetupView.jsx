import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Lock,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  Unlock,
  Zap,
} from "lucide-react";
import { evaluateStageStatus } from "../lib/calculations";
import { formatCurrency, safeNumber, getBillingModelLabel } from "../lib/utils";
import { BILLING_MODEL_TYPES } from "../lib/constants";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import StatusBadge from "../components/ui/StatusBadge";

// ── Constants ─────────────────────────────────────────────────────────────────

const UNLOCK_RULES = [
  { value: "immediate", label: "Immediately (no condition)" },
  { value: "previous-paid", label: "Previous stage invoice paid" },
  { value: "project-delivered", label: "Project marked as Delivered" },
  { value: "milestone-approved", label: "Manual milestone approval" },
  { value: "period-start", label: "Billing period start date" },
];

const STAGE_TYPES = [
  "Advance", "Milestone", "Final Payment",
  "Monthly Retainer", "One-Time Service", "Add-on",
];

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ currentStep, onStep }) {
  const steps = ["Billing Model Setup", "Schedule Builder", "Generate Invoice"];
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const num = i + 1;
        const isDone = currentStep > num;
        const isActive = currentStep === num;
        return (
          <div key={label} className="flex items-center">
            <button
              onClick={() => isDone || isActive ? onStep(num) : undefined}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-blue-600 text-white" : isDone ? "text-blue-600 hover:bg-blue-50" : "text-slate-400"
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${isActive ? "bg-white/20" : isDone ? "bg-blue-100" : "bg-slate-100"}`}>
                {isDone ? <CheckCircle2 size={13} /> : num}
              </span>
              {label}
            </button>
            {i < steps.length - 1 && <ArrowRight size={14} className="mx-1 text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Billing type card ─────────────────────────────────────────────────────────

function BillingTypeCard({ type, selected, onSelect }) {
  const DESCRIPTIONS = {
    "advance-final": "Advance upfront, then final payment on delivery.",
    milestone: "Split value into milestone-based payment stages.",
    "full-amount": "Single invoice for the full project amount.",
    "monthly-retainer": "Fixed recurring monthly billing.",
    addon: "Additional scope outside the original project.",
  };
  const ICONS = {
    "advance-final": GitBranch,
    milestone: CheckCircle2,
    "full-amount": Zap,
    "monthly-retainer": Settings2,
    addon: Plus,
  };
  const Icon = ICONS[type.id] || GitBranch;
  return (
    <button
      onClick={() => onSelect(type.id)}
      className={`w-full rounded-2xl border-2 p-4 text-left transition ${
        selected ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white hover:border-blue-200"
      }`}
    >
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
        <Icon size={17} />
      </div>
      <p className="font-bold text-slate-950">{type.label}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{DESCRIPTIONS[type.id]}</p>
    </button>
  );
}

// ── Step 1: Billing model setup ───────────────────────────────────────────────

function Step1({ project, client, billingModel, selectedType, setSelectedType, updateProject, onSave, onNext }) {
  const pv = safeNumber(project.totalValue);

  // Derived logic rules for selected type
  const LOGIC_RULES = {
    "advance-final": [
      "Advance Invoice 40% upfront on project kickoff",
      "Final Invoice 60% on project delivery",
      "All invoices must be linked to billing stages",
    ],
    milestone: [
      "Each milestone has its own invoice stage",
      "Next stage unlocks after previous stage invoice is paid",
      "Splits must sum to 100% of project value",
    ],
    "full-amount": [
      "Single invoice raised for the full project value",
      "No stage structure required",
    ],
    "monthly-retainer": [
      "Fixed monthly invoice raised on billing start date",
      "Continues until project is marked Completed",
    ],
    addon: [
      "Standalone invoice not tied to project billing stages",
      "Does not count toward project balance-to-invoice",
    ],
  };
  const rules = LOGIC_RULES[selectedType] || [];

  // Live billing preview splits
  const PREVIEW_SPLITS = {
    "advance-final": [{ label: "Advance", pct: 40, color: "bg-blue-500" }, { label: "Final", pct: 60, color: "bg-slate-700" }],
    milestone: [{ label: "M1", pct: 25, color: "bg-blue-500" }, { label: "M2", pct: 25, color: "bg-blue-400" }, { label: "M3", pct: 25, color: "bg-blue-300" }, { label: "Final", pct: 25, color: "bg-slate-700" }],
    "full-amount": [{ label: "Full", pct: 100, color: "bg-blue-600" }],
    "monthly-retainer": [{ label: "Month 1", pct: 33, color: "bg-blue-500" }, { label: "Month 2", pct: 33, color: "bg-blue-400" }, { label: "Month 3+", pct: 34, color: "bg-blue-300" }],
    addon: [{ label: "Add-on", pct: 100, color: "bg-purple-500" }],
  };
  const splits = PREVIEW_SPLITS[selectedType] || [];

  const isValid = selectedType && project.totalValue > 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      {/* Left: form + type cards */}
      <div className="space-y-5">
        {/* Project & commercial details */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Project &amp; Commercial Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Client</p>
              <p className="font-bold text-slate-950">{client?.name || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Project</p>
              <p className="font-bold text-slate-950">{project.name}</p>
            </div>
            <Input
              label="Project Value (₹)"
              type="number"
              value={project.totalValue}
              onChange={(v) => updateProject(project.id, { totalValue: v })}
            />
            <Input
              label="Project Category"
              value={project.category}
              onChange={(v) => updateProject(project.id, { category: v })}
            />
            <Input
              label="Billing Start Date"
              type="date"
              value={project.billingStartDate}
              onChange={(v) => updateProject(project.id, { billingStartDate: v })}
            />
            <Input
              label="Billing Owner"
              value={project.billingOwner}
              onChange={(v) => updateProject(project.id, { billingOwner: v })}
            />
          </div>
        </div>

        {/* Billing logic cards */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Select Billing Logic</h2>
          <p className="mb-4 text-sm text-slate-500">Choose how billing is structured for this project.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BILLING_MODEL_TYPES.map((type) => (
              <BillingTypeCard key={type.id} type={type} selected={selectedType === type.id} onSelect={setSelectedType} />
            ))}
          </div>
        </div>

        {/* Selected logic rules */}
        {rules.length > 0 && (
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Selected Logic Rules</h2>
            <ul className="space-y-2">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
                  <span className="text-sm text-slate-700">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: live preview sidebar */}
      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        {/* Live billing preview */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-950">Live Billing Preview</h3>
          {pv > 0 ? (
            <>
              <div className="mb-4 flex h-6 w-full overflow-hidden rounded-full">
                {splits.map((s, i) => (
                  <div
                    key={i}
                    title={`${s.label}: ${s.pct}%`}
                    className={`h-full transition-all ${s.color}`}
                    style={{ width: `${s.pct}%` }}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {splits.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                      <span className="text-sm text-slate-600">{s.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">{s.pct}% · </span>
                      <span className="text-sm font-bold text-slate-950">{formatCurrency(Math.round(pv * s.pct / 100))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Set a project value to preview billing split.</p>
          )}
        </div>

        {/* Validation */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-950">Validation Status</h3>
          <div className="space-y-2.5">
            {[
              { label: "Billing logic selected", ok: !!selectedType },
              { label: "Project value set", ok: pv > 0 },
              { label: "Client assigned", ok: !!client },
              { label: "Billing start date set", ok: !!project.billingStartDate },
            ].map((check) => (
              <div key={check.label} className="flex items-center gap-2">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${check.ok ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {check.ok ? <CheckCircle2 size={12} /> : <div className="h-2 w-2 rounded-full bg-slate-300" />}
                </div>
                <span className={`text-sm ${check.ok ? "text-slate-700" : "text-slate-400"}`}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onSave}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            <Save size={15} /> Save Draft
          </button>
          <button
            onClick={onNext}
            disabled={!isValid}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Schedule <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stage card (Step 2) ───────────────────────────────────────────────────────

function StageCard({ stage, effectiveStatus, index, total, projectValue, onUpdate, onDelete, onMoveUp, onMoveDown, onGenerate }) {
  const [editing, setEditing] = useState(false);
  const isLocked = effectiveStatus === "Locked";
  const isGenerated = effectiveStatus === "Generated" || effectiveStatus === "Paid";
  const stageAmount = safeNumber(projectValue) > 0 && safeNumber(stage.splitPercent) > 0
    ? Math.round((safeNumber(projectValue) * safeNumber(stage.splitPercent)) / 100)
    : safeNumber(stage.amount);

  return (
    <div className={`rounded-[1.75rem] border-2 shadow-sm transition ${isLocked ? "border-rose-100 bg-white" : isGenerated ? "border-emerald-100 bg-white" : "border-slate-100 bg-white"}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Stage number */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black ${isLocked ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
          {index + 1}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-950">{stage.name}</span>
            <StatusBadge status={effectiveStatus} />
            {stage.splitPercent > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{stage.splitPercent}%</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {stage.type} · {formatCurrency(stageAmount)}
            {stage.trigger ? ` · ${stage.trigger}` : ""}
            {stage.dueDate ? ` · Due ${stage.dueDate}` : ""}
          </p>
          {isLocked && stage.unlockCondition && (
            <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
              <Lock size={11} /> {stage.unlockCondition}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button onClick={onMoveUp} disabled={index === 0 || isGenerated} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1 || isGenerated} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown size={14} /></button>
          {!isGenerated && !isLocked && (
            <button onClick={() => onGenerate(stage)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
              Generate Invoice
            </button>
          )}
          {isGenerated && <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Generated</span>}
          {isLocked && <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"><Lock size={11} /> Locked</span>}
          {!isGenerated && (
            <button onClick={() => setEditing((v) => !v)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && !isGenerated && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Stage Name" value={stage.name} onChange={(v) => onUpdate(stage.id, { name: v })} />
            <Select label="Stage Type" value={stage.type} onChange={(v) => onUpdate(stage.id, { type: v })} options={STAGE_TYPES} />
            <Input
              label="Split % of Project Value"
              type="number"
              value={stage.splitPercent}
              onChange={(v) => onUpdate(stage.id, { splitPercent: v, amount: Math.round((safeNumber(projectValue) * safeNumber(v)) / 100) })}
            />
            <Input label="Fixed Amount (₹)" type="number" value={stage.amount} onChange={(v) => onUpdate(stage.id, { amount: v })} />
            <Input label="Trigger / Milestone" value={stage.trigger} onChange={(v) => onUpdate(stage.id, { trigger: v })} placeholder="e.g. On project kickoff" />
            <Input label="Due Date" type="date" value={stage.dueDate} onChange={(v) => onUpdate(stage.id, { dueDate: v })} />
            <Select label="Unlock Rule" value={stage.unlockRule} onChange={(v) => onUpdate(stage.id, { unlockRule: v })} options={UNLOCK_RULES} />
            <Input label="Unlock Condition" value={stage.unlockCondition} onChange={(v) => onUpdate(stage.id, { unlockCondition: v })} placeholder="e.g. Advance must be paid in full" />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => onDelete(stage.id)} className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
              <Trash2 size={14} /> Remove Stage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Schedule builder ──────────────────────────────────────────────────

function Step2({ data, project, billingModel, stages, addInvoiceStage, updateInvoiceStage, deleteInvoiceStage, generateInvoiceFromStage, onBack }) {
  const pv = safeNumber(project.totalValue);
  const splitTotal = stages.reduce((s, st) => s + safeNumber(st.splitPercent), 0);
  const splitOk = stages.length === 0 || splitTotal === 100 || stages.every((s) => !s.splitPercent);

  function moveStage(stageId, dir) {
    const idx = stages.findIndex((s) => s.id === stageId);
    if (dir === "up" && idx > 0) {
      updateInvoiceStage(stageId, { order: stages[idx - 1].order });
      updateInvoiceStage(stages[idx - 1].id, { order: stages[idx].order });
    } else if (dir === "down" && idx < stages.length - 1) {
      updateInvoiceStage(stageId, { order: stages[idx + 1].order });
      updateInvoiceStage(stages[idx + 1].id, { order: stages[idx].order });
    }
  }

  const totalScheduled = pv > 0 && stages.some((s) => s.splitPercent > 0)
    ? stages.reduce((s, st) => s + Math.round((pv * safeNumber(st.splitPercent)) / 100), 0)
    : stages.reduce((s, st) => s + safeNumber(st.amount), 0);

  const generatedCount = stages.filter((s) => s.stageStatus === "Generated" || s.stageStatus === "Paid").length;
  const lockedCount = stages.filter((s) => {
    const eff = evaluateStageStatus(s, data.invoiceStages, data.invoices, data.payments, data.projects);
    return eff === "Locked";
  }).length;

  const validationChecks = [
    { label: stages.some((s) => s.splitPercent > 0) ? `Splits sum to ${splitTotal}%` : "Amounts assigned to stages", ok: splitOk },
    { label: "All stages have due dates", ok: stages.every((s) => s.dueDate) },
    { label: "All stages have trigger descriptions", ok: stages.every((s) => s.trigger) },
    { label: "Locked stages have unlock conditions", ok: stages.filter((s) => s.unlockRule !== "immediate").every((s) => s.unlockCondition) },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      {/* Left: stages */}
      <div className="space-y-5">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Linked Invoice Stages</h2>
              <p className="text-sm text-slate-500">
                {getBillingModelLabel(billingModel.type)} · {project.name}
              </p>
            </div>
            <button
              onClick={() => addInvoiceStage(billingModel.id, project.id, project.clientId)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={15} /> Add Stage
            </button>
          </div>

          {/* Split validation banner */}
          {stages.length > 0 && stages.some((s) => s.splitPercent > 0) && (
            <div className={`mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${splitOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {splitOk ? <Unlock size={14} /> : <Lock size={14} />}
              {splitOk ? "Stage splits sum to 100% — billing schedule is valid." : `Splits sum to ${splitTotal}% — adjust to reach 100%.`}
            </div>
          )}

          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const eff = evaluateStageStatus(stage, data.invoiceStages, data.invoices, data.payments, data.projects);
              return (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  effectiveStatus={eff}
                  index={idx}
                  total={stages.length}
                  projectValue={pv}
                  onUpdate={updateInvoiceStage}
                  onDelete={deleteInvoiceStage}
                  onMoveUp={() => moveStage(stage.id, "up")}
                  onMoveDown={() => moveStage(stage.id, "down")}
                  onGenerate={generateInvoiceFromStage}
                />
              );
            })}
            {!stages.length && (
              <div className="rounded-2xl bg-slate-50 py-12 text-center text-slate-400">
                No stages yet. Click "Add Stage" to build the billing schedule.
              </div>
            )}
          </div>

          {stages.length > 0 && (
            <button
              onClick={() => addInvoiceStage(billingModel.id, project.id, project.clientId)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 w-full justify-center"
            >
              <Plus size={15} /> Add Terminal Add-on Stage
            </button>
          )}
        </div>
      </div>

      {/* Right: plan summary + validation */}
      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        {/* Plan summary */}
        <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
          <h3 className="mb-4 font-bold">Plan Summary</h3>
          <div className="space-y-3">
            {[
              { label: "Project Value", value: formatCurrency(pv) },
              { label: "Total Scheduled", value: formatCurrency(totalScheduled) },
              { label: "Stages", value: `${stages.length} total` },
              { label: "Generated", value: `${generatedCount} invoice${generatedCount !== 1 ? "s" : ""}` },
              { label: "Locked", value: `${lockedCount} stage${lockedCount !== 1 ? "s" : ""}` },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-sm text-white/60">{m.label}</span>
                <span className="font-bold">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule validation */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-950">Schedule Validation</h3>
          <div className="space-y-2.5">
            {validationChecks.map((check, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${check.ok ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {check.ok ? <CheckCircle2 size={12} /> : <div className="h-2 w-2 rounded-full bg-slate-300" />}
                </div>
                <span className={`text-sm leading-snug ${check.ok ? "text-slate-700" : "text-slate-400"}`}>{check.label}</span>
              </div>
            ))}
          </div>
          {stages.length > 0 && validationChecks.every((c) => c.ok) && (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Schedule is valid — ready to generate invoices.
            </div>
          )}
        </div>

        {/* What's next */}
        <div className="rounded-[2rem] bg-blue-50 p-5 shadow-sm">
          <h3 className="mb-2 font-bold text-blue-900">What's Next?</h3>
          <p className="text-sm text-blue-700 leading-relaxed">
            Once the billing plan is finalised, generate invoices directly from Ready stages. Locked stages will auto-unlock as conditions are met.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main BillingSetupView ─────────────────────────────────────────────────────

export default function BillingSetupView({
  data,
  project,
  client,
  addBillingModel,
  updateBillingModel,
  deleteBillingModel,
  addInvoiceStage,
  updateInvoiceStage,
  deleteInvoiceStage,
  generateInvoiceFromStage,
  onBack,
  updateProject,
}) {
  const billingModel = data.billingModels.find((bm) => bm.projectId === project.id) || null;
  const stages = data.invoiceStages
    .filter((s) => s.projectId === project.id)
    .sort((a, b) => a.order - b.order);

  const [step, setStep] = useState(billingModel ? 2 : 1);
  const [selectedType, setSelectedType] = useState(billingModel?.type || "advance-final");

  function handleSave() {
    if (!billingModel) {
      addBillingModel(project.id, selectedType);
    } else {
      updateBillingModel(billingModel.id, { type: selectedType });
    }
  }

  function handleNext() {
    if (!billingModel) {
      addBillingModel(project.id, selectedType);
    } else {
      updateBillingModel(billingModel.id, { type: selectedType });
    }
    setStep(2);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={onBack} className="mt-1 rounded-2xl bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-950">Billing Model Setup</h1>
          <p className="text-sm text-slate-500">
            {client?.name} · {project.name}
            {project.totalValue > 0 && <span className="ml-2 font-semibold text-slate-700">({formatCurrency(safeNumber(project.totalValue))} project value)</span>}
          </p>
        </div>
      </div>

      {/* Step breadcrumb */}
      <div className="rounded-[2rem] bg-white p-4 shadow-sm overflow-x-auto">
        <StepBar currentStep={step} onStep={(s) => { if (billingModel || s === 1) setStep(s); }} />
      </div>

      {/* Step content */}
      {step === 1 && (
        <Step1
          project={project}
          client={client}
          billingModel={billingModel}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          updateProject={updateProject}
          onSave={handleSave}
          onNext={handleNext}
        />
      )}

      {step === 2 && billingModel && (
        <Step2
          data={data}
          project={project}
          billingModel={billingModel}
          stages={stages}
          addInvoiceStage={addInvoiceStage}
          updateInvoiceStage={updateInvoiceStage}
          deleteInvoiceStage={deleteInvoiceStage}
          generateInvoiceFromStage={generateInvoiceFromStage}
          onBack={() => setStep(1)}
        />
      )}

      {step === 2 && !billingModel && (
        <div className="rounded-[2rem] bg-white p-12 text-center shadow-sm">
          <p className="text-slate-500">Complete Step 1 first to set up the billing model.</p>
          <button onClick={() => setStep(1)} className="mt-4 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Go to Step 1
          </button>
        </div>
      )}
    </motion.div>
  );
}
