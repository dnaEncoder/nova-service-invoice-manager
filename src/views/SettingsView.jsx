import { motion } from "framer-motion";
import { Download, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";

// Dynamically imported so a browser/non-Tauri build doesn't break
async function tauriCheck() {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    return await check();
  } catch {
    return null;
  }
}

export default function SettingsView({ onReset }) {
  const [updateState, setUpdateState] = useState("idle"); // idle | checking | available | downloading | done | error | uptodate
  const [updateInfo, setUpdateInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);

  async function handleCheck() {
    setUpdateState("checking");
    setErrorMsg("");
    setUpdateInfo(null);
    try {
      const update = await tauriCheck();
      if (!update || !update.available) {
        setUpdateState("uptodate");
      } else {
        setUpdateInfo(update);
        setUpdateState("available");
      }
    } catch (e) {
      setErrorMsg(String(e));
      setUpdateState("error");
    }
  }

  async function handleInstall() {
    if (!updateInfo) return;
    setUpdateState("downloading");
    setDownloadProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await updateInfo.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength || 0;
        if (event.event === "Progress") {
          downloaded += event.data.chunkLength || 0;
          setDownloadProgress(total > 0 ? Math.round((downloaded / total) * 100) : 0);
        }
      });
      setUpdateState("done");
    } catch (e) {
      setErrorMsg(String(e));
      setUpdateState("error");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
        <p className="text-sm text-slate-500">App-level preferences and data management.</p>
      </div>

      <div className="space-y-4">
        {/* Updates */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 mb-4">
            <RefreshCw size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-950 mb-1">Software Updates</h2>
          <p className="text-sm text-slate-500 mb-5">
            Check for new versions of Nova Invoice Manager.
          </p>

          {updateState === "idle" && (
            <button
              onClick={handleCheck}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Check for Updates
            </button>
          )}

          {updateState === "checking" && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Checking for updates…
            </p>
          )}

          {updateState === "uptodate" && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-700">You're up to date.</p>
              <button onClick={handleCheck} className="text-xs text-slate-400 hover:text-slate-600">
                Check again
              </button>
            </div>
          )}

          {updateState === "available" && updateInfo && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Update available — v{updateInfo.version}
              </p>
              {updateInfo.body && (
                <p className="text-xs text-blue-700 mb-3 whitespace-pre-wrap">{updateInfo.body}</p>
              )}
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Download size={14} /> Download &amp; Install
              </button>
            </div>
          )}

          {updateState === "downloading" && (
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Downloading… {downloadProgress > 0 ? `${downloadProgress}%` : ""}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: downloadProgress > 0 ? `${downloadProgress}%` : "100%", animationName: downloadProgress === 0 ? "pulse" : "none" }}
                />
              </div>
            </div>
          )}

          {updateState === "done" && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-1">Update installed!</p>
              <p className="text-xs text-emerald-700">Please close and reopen the app to use the new version.</p>
            </div>
          )}

          {updateState === "error" && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800 mb-1">Update check failed</p>
              <p className="text-xs text-rose-600 mb-3 break-all">{errorMsg}</p>
              <button onClick={handleCheck} className="text-xs font-semibold text-rose-700 hover:underline">
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 mb-4">
            <Settings size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-950 mb-1">Data Management</h2>
          <p className="text-sm text-slate-500 mb-5">
            All data is stored locally in your browser. Use the option below to reset to sample data for testing.
          </p>
          <button
            onClick={onReset}
            className="rounded-2xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            Reset to Sample Data
          </button>
        </div>
      </div>
    </motion.div>
  );
}
