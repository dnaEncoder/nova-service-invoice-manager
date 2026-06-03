import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { calculateInvoice, computeInvoiceStatus } from "../lib/calculations";
import { formatCurrency, safeNumber } from "../lib/utils";

// Register Noto Sans from local public/fonts — full Unicode coverage including ₹
Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/NotoSans-Bold.ttf", fontWeight: "bold" },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  dark: "#0f172a",
  darkMid: "#1e293b",
  blue: "#1d4ed8",
  blueLight: "#dbeafe",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate800: "#1e293b",
  white: "#ffffff",
  whiteFaint: "rgba(255,255,255,0.12)",
  whiteMid: "rgba(255,255,255,0.55)",
};

const STATUS_COLORS = {
  Draft: { bg: "#f1f5f9", text: "#475569" },
  Sent: { bg: "#dbeafe", text: "#1d4ed8" },
  Paid: { bg: "#dcfce7", text: "#16a34a" },
  "Partially Paid": { bg: "#fef9c3", text: "#a16207" },
  Overdue: { bg: "#fee2e2", text: "#dc2626" },
  Voided: { bg: "#f1f5f9", text: "#94a3b8" },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontWeight: "normal",
    fontSize: 9,
    color: C.slate800,
    backgroundColor: C.white,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 44,
    paddingRight: 44,
  },

  // ── Header ──
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  headerLeft: { flex: 1, marginRight: 20 },
  headerRight: { alignItems: "flex-end" },
  logoBox: {
    width: 34,
    height: 34,
    backgroundColor: C.dark,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },
  logoText: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: C.white },
  bizName: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 13, color: C.dark, marginBottom: 3 },
  bizLine: { fontSize: 8.5, color: C.slate500, marginBottom: 1.5 },
  invTitle: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 20,
    color: C.dark,
    textAlign: "right",
    marginBottom: 3,
    letterSpacing: 1,
  },
  invNo: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 12,
    color: C.blue,
    textAlign: "right",
    marginBottom: 7,
  },
  invLine: { fontSize: 8.5, color: C.slate500, textAlign: "right", marginBottom: 2 },
  statusPill: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5, alignSelf: "flex-end" },
  statusText: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8 },

  // ── Divider ──
  divider: { borderBottomWidth: 1, borderBottomColor: C.slate200, marginBottom: 18 },

  // ── 2-column info ──
  twoCol: { flexDirection: "row", marginBottom: 18 },
  infoBox: {
    flex: 1,
    backgroundColor: C.slate50,
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
  },
  infoBoxBlue: {
    flex: 1,
    backgroundColor: C.blueLight,
    borderRadius: 8,
    padding: 12,
  },
  boxLabel: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 7,
    color: C.slate400,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  boxLabelBlue: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 7,
    color: C.blue,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  boxTitle: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 11, color: C.dark, marginBottom: 4 },
  boxLine: { fontSize: 8.5, color: C.slate500, marginBottom: 2 },
  boxLineMt: { fontSize: 8.5, color: C.slate500, marginBottom: 2, marginTop: 6 },

  // ── Services table ──
  table: { marginBottom: 18 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.dark,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  thText: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 8,
    color: C.white,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tdText: { fontSize: 8.5, color: C.slate700 },
  tdBold: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8.5, color: C.dark },
  tdFaint: { fontSize: 8.5, color: C.slate400 },

  // ── Footer ──
  footer: { flexDirection: "row", marginTop: 6 },
  notesArea: { flex: 1, marginRight: 16 },
  notesHeading: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 8,
    color: C.dark,
    marginTop: 10,
    marginBottom: 3,
  },
  notesText: { fontSize: 8.5, color: C.slate500, lineHeight: 1.5 },
  bankBox: { backgroundColor: C.slate50, borderRadius: 6, padding: 10, marginTop: 10 },
  bankTitle: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    fontSize: 8,
    color: C.dark,
    marginBottom: 4,
  },
  bankLine: { fontSize: 8.5, color: C.slate500, marginBottom: 2 },

  // Totals dark card
  totalsBox: {
    width: 210,
    backgroundColor: C.dark,
    borderRadius: 10,
    padding: 16,
  },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  totLabel: { fontSize: 8.5, color: C.whiteMid },
  totValue: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8.5, color: C.white },
  totDivider: { borderBottomWidth: 1, borderBottomColor: C.whiteFaint, marginVertical: 9 },
  grandLabel: { fontSize: 9, color: C.whiteMid },
  grandValue: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 13, color: C.white },

  // ── Footer note ──
  pageFooter: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    paddingTop: 8,
  },
  pageFooterText: { fontSize: 7.5, color: C.slate400 },
});

// ── Components ────────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.Draft;
  return (
    <View style={[s.statusPill, { backgroundColor: colors.bg }]}>
      <Text style={[s.statusText, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

function TotRow({ label, value, large }) {
  return (
    <View style={s.totRow}>
      <Text style={large ? s.grandLabel : s.totLabel}>{label}</Text>
      <Text style={large ? s.grandValue : s.totValue}>{value}</Text>
    </View>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

export function InvoiceDocument({ invoice, client, project, projectSummary, allPayments }) {
  const totals = calculateInvoice(invoice, allPayments);
  const computedStatus = computeInvoiceStatus(invoice, allPayments);

  const hasBankDetails =
    invoice.business?.bankName ||
    invoice.business?.upi ||
    invoice.business?.accountNumber;

  return (
    <Document
      title={invoice.invoiceNo}
      author={invoice.business?.name || "Invoice Manager"}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>₹</Text>
            </View>
            <Text style={s.bizName}>{invoice.business?.name || "Your Business"}</Text>
            {invoice.business?.address && (
              <Text style={s.bizLine}>{invoice.business.address}</Text>
            )}
            {(invoice.business?.email || invoice.business?.phone) && (
              <Text style={s.bizLine}>
                {[invoice.business.email, invoice.business.phone].filter(Boolean).join("  •  ")}
              </Text>
            )}
            {invoice.business?.gstin && (
              <Text style={s.bizLine}>GSTIN: {invoice.business.gstin}</Text>
            )}
          </View>

          <View style={s.headerRight}>
            <Text style={s.invTitle}>SERVICE INVOICE</Text>
            <Text style={s.invNo}>{invoice.invoiceNo}</Text>
            <Text style={s.invLine}>Invoice Type: {invoice.type}</Text>
            <Text style={s.invLine}>Issue Date: {invoice.issueDate || "—"}</Text>
            <Text style={s.invLine}>Due Date: {invoice.dueDate || "—"}</Text>
            {invoice.sentDate && (
              <Text style={s.invLine}>Sent: {invoice.sentDate}</Text>
            )}
            <StatusPill status={computedStatus} />
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Bill To + Project ── */}
        <View style={s.twoCol}>
          <View style={s.infoBox}>
            <Text style={s.boxLabel}>BILL TO</Text>
            <Text style={s.boxTitle}>{client?.name || "Client Name"}</Text>
            {client?.contactPerson && (
              <Text style={s.boxLine}>{client.contactPerson}</Text>
            )}
            {client?.address && <Text style={s.boxLine}>{client.address}</Text>}
            {client?.email && <Text style={s.boxLine}>{client.email}</Text>}
            {client?.phone && <Text style={s.boxLine}>{client.phone}</Text>}
            {client?.gstin && (
              <Text style={[s.boxLine, { marginTop: 4 }]}>GSTIN: {client.gstin}</Text>
            )}
          </View>

          <View style={s.infoBoxBlue}>
            <Text style={s.boxLabelBlue}>PROJECT</Text>
            <Text style={s.boxTitle}>{project?.name || "Project"}</Text>
            {project?.category && (
              <Text style={s.boxLine}>{project.category}</Text>
            )}
            <Text style={s.boxLineMt}>
              Project Value: {formatCurrency(projectSummary?.projectValue || 0)}
            </Text>
            <Text style={s.boxLine}>
              Already Paid: {formatCurrency(projectSummary?.paid || 0)}
            </Text>
            <Text style={s.boxLine}>
              Outstanding: {formatCurrency(projectSummary?.pending || 0)}
            </Text>
          </View>
        </View>

        {/* ── Service items table ── */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.thText, { flex: 3 }]}>Service Description</Text>
            <Text style={[s.thText, { flex: 1.4, textAlign: "right" }]}>Base Amount</Text>
            <Text style={[s.thText, { flex: 0.7, textAlign: "right" }]}>GST %</Text>
            <Text style={[s.thText, { flex: 0.9, textAlign: "right" }]}>GST Amt</Text>
            <Text style={[s.thText, { flex: 1.4, textAlign: "right" }]}>Total</Text>
          </View>

          {(invoice.serviceItems || []).map((item, i) => {
            const amount = safeNumber(item.amount);
            const taxRate = safeNumber(item.tax);
            const taxAmount = (amount * taxRate) / 100;
            const rowBg = i % 2 === 1 ? C.slate50 : C.white;
            return (
              <View key={item.id} style={[s.tableRow, { backgroundColor: rowBg }]}>
                <Text style={[s.tdText, { flex: 3 }]}>
                  {item.description || "Service item"}
                </Text>
                <Text style={[s.tdFaint, { flex: 1.4, textAlign: "right" }]}>
                  {formatCurrency(amount)}
                </Text>
                <Text style={[s.tdFaint, { flex: 0.7, textAlign: "right" }]}>
                  {taxRate}%
                </Text>
                <Text style={[s.tdFaint, { flex: 0.9, textAlign: "right" }]}>
                  {formatCurrency(taxAmount)}
                </Text>
                <Text style={[s.tdBold, { flex: 1.4, textAlign: "right" }]}>
                  {formatCurrency(amount + taxAmount)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Footer: Notes + Totals ── */}
        <View style={s.footer}>
          {/* Notes / Terms / Bank */}
          <View style={s.notesArea}>
            {invoice.notes ? (
              <>
                <Text style={s.notesHeading}>Notes</Text>
                <Text style={s.notesText}>{invoice.notes}</Text>
              </>
            ) : null}
            {invoice.terms ? (
              <>
                <Text style={s.notesHeading}>Terms &amp; Conditions</Text>
                <Text style={s.notesText}>{invoice.terms}</Text>
              </>
            ) : null}
            {hasBankDetails && (
              <View style={s.bankBox}>
                <Text style={s.bankTitle}>Payment Details</Text>
                {invoice.business?.bankName && (
                  <Text style={s.bankLine}>Bank: {invoice.business.bankName}</Text>
                )}
                {invoice.business?.accountName && (
                  <Text style={s.bankLine}>Account Name: {invoice.business.accountName}</Text>
                )}
                {invoice.business?.accountNumber && (
                  <Text style={s.bankLine}>Account No: {invoice.business.accountNumber}</Text>
                )}
                {invoice.business?.ifsc && (
                  <Text style={s.bankLine}>IFSC: {invoice.business.ifsc}</Text>
                )}
                {invoice.business?.upi && (
                  <Text style={s.bankLine}>UPI: {invoice.business.upi}</Text>
                )}
              </View>
            )}
          </View>

          {/* Totals dark card */}
          <View style={s.totalsBox}>
            <TotRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <TotRow label="Total GST" value={formatCurrency(totals.taxTotal)} />
            {totals.discount > 0 && (
              <TotRow label="Discount" value={`- ${formatCurrency(totals.discount)}`} />
            )}
            <View style={s.totDivider} />
            <TotRow label="Invoice Total" value={formatCurrency(totals.total)} large />
            {totals.paid > 0 && (
              <>
                <View style={[s.totDivider, { marginVertical: 6 }]} />
                <TotRow label="Paid" value={formatCurrency(totals.paid)} />
                <TotRow label="Amount Due" value={formatCurrency(totals.due)} large />
              </>
            )}
          </View>
        </View>

        {/* ── Page footer ── */}
        <View style={s.pageFooter} fixed>
          <Text style={s.pageFooterText}>
            {invoice.business?.name || "Invoice"} — {invoice.invoiceNo}
          </Text>
          <Text
            style={s.pageFooterText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}
