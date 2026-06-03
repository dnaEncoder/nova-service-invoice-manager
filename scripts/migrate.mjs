#!/usr/bin/env node
/**
 * migrate.mjs
 * Reads nova_service_invoice_manager_v2 from Chrome's LevelDB localStorage
 * and writes it into the Tauri desktop app's WebKit SQLite as a UTF-16LE blob
 * (the exact format WKWebView expects).
 *
 * Usage:
 *   node scripts/migrate.mjs            -- Chrome → Tauri
 *   node scripts/migrate.mjs --dry-run  -- preview only, no writes
 */

import { ClassicLevel } from "classic-level";
import { execFileSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import os from "os";

const HOME = os.homedir();
const STORAGE_KEY = "nova_service_invoice_manager_v2";
const DRY_RUN = process.argv.includes("--dry-run");

// ── Chrome LevelDB: all profiles ──────────────────────────────────────────────
function findChromeLevelDBPaths() {
  const chromeBase = path.join(HOME, "Library/Application Support/Google/Chrome");
  if (!existsSync(chromeBase)) return [];

  const profilePaths = [];
  try {
    for (const entry of readdirSync(chromeBase)) {
      const leveldb = path.join(chromeBase, entry, "Local Storage", "leveldb");
      if (existsSync(leveldb)) profilePaths.push({ profile: entry, leveldb });
    }
  } catch { /* ignore */ }
  return profilePaths;
}

// Chrome localStorage LevelDB format:
//   key   = _<origin>\x00\x01<localStorage key name>
//   value = 0x01 byte prefix + UTF-16LE JSON string
const ORIGIN_PREFIXES = ["_http://localhost:5173", "_http://127.0.0.1:5173"];

function chromeLevelDBKeys(storageKey) {
  return ORIGIN_PREFIXES.map((o) => `${o}\x00\x01${storageKey}`);
}

function decodeChromeLevelDBValue(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  // Chrome stores a 1-byte header (0x00 or 0x01) before the UTF-16LE payload
  const first = buf[0];
  if (first === 0x00 || first === 0x01) return buf.slice(1).toString("utf16le");
  return buf.toString("utf8");
}

// ── Tauri WebKit SQLite ───────────────────────────────────────────────────────
function findTauriSqlite() {
  const base = path.join(HOME, "Library/WebKit/co.otsi.nova-invoice-manager");
  if (!existsSync(base)) return null;
  try {
    return execFileSync("find", [base, "-name", "localstorage.sqlite3"], {
      encoding: "utf8",
    }).trim() || null;
  } catch {
    return null;
  }
}

// WKWebView stores localStorage values as UTF-16LE blobs in SQLite.
// We write them using SQLite's X'hex' blob literal syntax.
function readTauriData(sqlitePath) {
  try {
    const hexVal = execFileSync(
      "sqlite3",
      [sqlitePath, `SELECT hex(value) FROM ItemTable WHERE key='${STORAGE_KEY}';`],
      { encoding: "utf8" }
    ).trim();
    if (!hexVal) return null;
    return Buffer.from(hexVal, "hex").toString("utf16le");
  } catch {
    return null;
  }
}

function writeTauriData(sqlitePath, jsonString) {
  const hexBlob = Buffer.from(jsonString, "utf16le").toString("hex").toUpperCase();
  const sql = `INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('${STORAGE_KEY}', X'${hexBlob}');`;
  execFileSync("sqlite3", [sqlitePath, sql]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function summarise(parsed) {
  const c = parsed.clients?.length ?? 0;
  const p = parsed.projects?.length ?? 0;
  const i = parsed.invoices?.length ?? 0;
  const py = parsed.payments?.length ?? 0;
  const biz = parsed.business?.name || "(no business name)";
  return `${c} clients · ${p} projects · ${i} invoices · ${py} payments | Business: ${biz}`;
}

async function askYN(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (ans) => { rl.close(); resolve(ans.toLowerCase() === "y"); })
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Nova Invoice Manager — Data Migration");
  console.log("======================================");
  if (DRY_RUN) console.log("DRY RUN — no data will be written\n");

  // ── 1. Show what's already in the Tauri app ───────────────────────────────
  const tauriSqlite = findTauriSqlite();
  if (tauriSqlite) {
    const existingJson = readTauriData(tauriSqlite);
    if (existingJson) {
      try {
        const existing = JSON.parse(existingJson);
        console.log(`ℹ  Tauri app currently has: ${summarise(existing)}`);
      } catch {
        console.log("ℹ  Tauri app has data but it could not be parsed.");
      }
    } else {
      console.log("ℹ  Tauri app has no data yet.");
    }
  } else {
    console.log("ℹ  Tauri app SQLite not found — launch the app once then re-run.");
  }
  console.log();

  // ── 2. Scan all Chrome profiles for the key ───────────────────────────────
  const profiles = findChromeLevelDBPaths();
  if (profiles.length === 0) {
    console.error("✗ Google Chrome not found.");
    console.error("  This script requires Chrome. If you used a different browser,");
    console.error("  export your data via Settings → Export in the browser app.");
    process.exit(1);
  }

  console.log(`→ Scanning ${profiles.length} Chrome profile(s) for your data...`);

  const candidates = [];

  for (const { profile, leveldb } of profiles) {
    let db;
    try {
      db = new ClassicLevel(leveldb, { createIfMissing: false });
    } catch {
      // Profile locked (Chrome is open with this profile) — skip silently
      continue;
    }

    for (const key of chromeLevelDBKeys(STORAGE_KEY)) {
      try {
        const raw = await db.get(key, { valueEncoding: "buffer" });
        const json = decodeChromeLevelDBValue(raw);
        const parsed = JSON.parse(json);
        const origin = key.split("\x00")[0];
        candidates.push({ profile, origin, json, parsed });
        break;
      } catch {
        // key not in this profile/origin
      }
    }

    await db.close();
  }

  if (candidates.length === 0) {
    console.error("\n✗ No app data found in any Chrome profile.");
    console.error("  Possible reasons:");
    console.error("  · You used Safari or another browser (not Chrome)");
    console.error("  · Chrome is currently open — close it fully and retry");
    console.error("  · You haven't saved any data in the dev server app yet");
    console.error("\n  Alternative: open Settings in the browser app and use Export,");
    console.error("  then Import inside the desktop app.");
    process.exit(1);
  }

  // ── 3. Pick which candidate to use ───────────────────────────────────────
  let chosen;

  if (candidates.length === 1) {
    chosen = candidates[0];
    console.log(`✓ Found data in Chrome profile "${chosen.profile}" (${chosen.origin}):`);
    console.log(`   ${summarise(chosen.parsed)}`);
  } else {
    console.log(`\nFound data in ${candidates.length} Chrome profiles:\n`);
    candidates.forEach((c, i) =>
      console.log(`  [${i + 1}] Profile "${c.profile}" — ${summarise(c.parsed)}`)
    );
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) =>
      rl.question("\nWhich profile to migrate? (enter number): ", resolve)
    );
    rl.close();
    const idx = parseInt(answer, 10) - 1;
    if (idx < 0 || idx >= candidates.length) {
      console.error("Invalid selection. Aborted."); process.exit(1);
    }
    chosen = candidates[idx];
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would write this data to the Tauri app:");
    console.log(JSON.stringify(chosen.parsed, null, 2).slice(0, 800) + "\n  ...(truncated)");
    console.log("\nRun without --dry-run to migrate for real.");
    return;
  }

  // ── 4. Write to Tauri SQLite ──────────────────────────────────────────────
  if (!tauriSqlite) {
    console.error("\n✗ Tauri app SQLite not found.");
    console.error("  Launch Nova Invoice Manager.app once, quit it, then run this script.");
    process.exit(1);
  }

  const existingJson = readTauriData(tauriSqlite);
  if (existingJson) {
    const ok = await askYN(
      "\n⚠  The Tauri app already has data. Overwrite it? (y/N) "
    );
    if (!ok) { console.log("Aborted — existing data kept."); process.exit(0); }
  }

  console.log("\n→ Writing to Tauri app SQLite (UTF-16LE blob)...");
  try {
    writeTauriData(tauriSqlite, chosen.json);
  } catch (err) {
    console.error("✗ Write failed:", err.message);
    process.exit(1);
  }

  // Verify
  const verifyJson = readTauriData(tauriSqlite);
  if (!verifyJson) {
    console.error("✗ Verification failed — could not read back the written data.");
    process.exit(1);
  }
  const verified = JSON.parse(verifyJson);
  console.log(`✓ Verified: ${summarise(verified)}`);

  console.log("\n✅ Migration complete!");
  console.log("   Open Nova Invoice Manager.app — your data is there.");
}

main().catch((err) => {
  console.error("\n✗ Unexpected error:", err.message || err);
  process.exit(1);
});
