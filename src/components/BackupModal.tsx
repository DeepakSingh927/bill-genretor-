import React, { useState, useMemo } from "react";
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  Calendar,
  CloudCheck,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { SavedBill, Client } from "@/types/bill";
import { exportBillRegisterToExcel, exportDetailedItemsToExcel } from "@/lib/excelExport";
import { parseBillDate, formatCurrency } from "@/lib/utils";

interface BackupModalProps {
  isOpen: boolean;
  bills: SavedBill[];
  clients: Client[];
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  bills,
  clients,
  onClose,
  onDataRestored,
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);

  // Group bills by Month (e.g. "October 2026")
  const monthlyGroups = useMemo(() => {
    const groups: { [key: string]: { label: string; bills: SavedBill[]; totalAmount: number } } = {};

    bills.forEach((bill) => {
      const d = parseBillDate(bill.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "long", year: "numeric" });

      if (!groups[key]) {
        groups[key] = { label, bills: [], totalAmount: 0 };
      }
      groups[key].bills.push(bill);
      if (bill.status === "active") {
        groups[key].totalAmount += bill.totalAmount;
      }
    });

    return groups;
  }, [bills]);

  const monthKeys = Object.keys(monthlyGroups).sort().reverse();

  // Active selected month
  const activeMonthKey = selectedMonthKey || (monthKeys.length > 0 ? monthKeys[0] : "");
  const currentMonthData = monthlyGroups[activeMonthKey] || null;

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const jsonStr = storage.exportBackup();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PureGreen_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMonthJSON = () => {
    if (!currentMonthData) return;
    const backup = {
      app: "Pure Green Harvest Farms Bill Generator",
      report: `Monthly Backup - ${currentMonthData.label}`,
      exportDate: new Date().toISOString(),
      billsCount: currentMonthData.bills.length,
      totalAmount: currentMonthData.totalAmount,
      bills: currentMonthData.bills,
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PureGreen_Backup_${currentMonthData.label.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMonthExcel = () => {
    if (!currentMonthData) return;
    exportBillRegisterToExcel(
      currentMonthData.bills,
      `PureGreen_Register_${currentMonthData.label.replace(/\s+/g, "_")}`
    );
  };

  const handleExportMonthDetailedExcel = () => {
    if (!currentMonthData) return;
    exportDetailedItemsToExcel(
      currentMonthData.bills,
      `PureGreen_Itemized_${currentMonthData.label.replace(/\s+/g, "_")}`
    );
  };

  const handleDeleteMonthBills = async () => {
    if (!currentMonthData || currentMonthData.bills.length === 0) return;

    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to delete ${currentMonthData.bills.length} bills from ${currentMonthData.label}?\n\nTotal value: ${formatCurrency(
        currentMonthData.totalAmount
      )}\n\nThis will permanently clear these bills from Turso Cloud Database to free up storage space. All registered hotel and client accounts will remain safe.\n\nPlease confirm you have already downloaded your Monthly Backup!`
    );

    if (!confirmed) return;

    setIsDeletingMonth(true);
    const billIds = currentMonthData.bills.map((b) => b.id);
    await storage.deleteBillsByIds(billIds);
    setIsDeletingMonth(false);

    setImportStatus({
      type: "success",
      message: `Cleared ${billIds.length} bills for ${currentMonthData.label}. Storage is clean!`,
    });
    onDataRestored();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = storage.importBackup(content);
      if (res.success) {
        setImportStatus({
          type: "success",
          message: `${res.message} (${res.billsCount} bills, ${res.clientsCount} clients loaded)`,
        });
        onDataRestored();
      } else {
        setImportStatus({
          type: "error",
          message: res.message,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetSample = () => {
    if (confirm("Reset to default sample data? Existing newly added bills will be replaced with clean sample records.")) {
      storage.resetToSample();
      setImportStatus({
        type: "success",
        message: "Reset to default sample data successfully.",
      });
      onDataRestored();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-emerald-950 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Database className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">Cloud Storage &amp; Backup Manager</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Turso 9 GB Active
                </span>
              </div>
              <p className="text-gray-300 text-xs mt-0.5">
                Download monthly Excel reports, JSON archives, or clear old data to keep storage clean
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {importStatus.type && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
                importStatus.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {importStatus.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Current Database Overview */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-500">Stored Bills</span>
              <div className="text-2xl font-black text-gray-900">{bills.length}</div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-500">Registered Hotels</span>
              <div className="text-2xl font-black text-gray-900">{clients.length}</div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-500">Cloud Status</span>
              <div className="text-sm font-black text-emerald-700 flex items-center justify-center gap-1 mt-1">
                Turso Live (9 GB)
              </div>
            </div>
          </div>

          {/* 1. MONTHLY BACKUP & STORAGE CLEANUP SECTION */}
          <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Monthly Tool
                </span>
                <h4 className="text-sm font-black text-gray-900 mt-1">
                  Monthly Report &amp; Data Cleanup
                </h4>
                <p className="text-[11px] text-gray-500">
                  Export any month&apos;s bills to Excel, then purge that month to free up space.
                </p>
              </div>

              {/* Month Picker Dropdown */}
              {monthKeys.length > 0 ? (
                <div className="relative">
                  <select
                    value={activeMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="py-1.5 px-3 bg-white border border-emerald-300 rounded-xl font-bold text-gray-900 text-xs focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                  >
                    {monthKeys.map((key) => (
                      <option key={key} value={key}>
                        {monthlyGroups[key].label} ({monthlyGroups[key].bills.length} bills)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-gray-400">No monthly records yet</span>
              )}
            </div>

            {currentMonthData && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-700 bg-white p-3 rounded-xl border border-emerald-100">
                  <span>
                    Selected: <strong className="text-gray-900">{currentMonthData.label}</strong>
                  </span>
                  <span>
                    Bills: <strong className="text-gray-900">{currentMonthData.bills.length}</strong> • Total:{" "}
                    <strong className="text-emerald-800">{formatCurrency(currentMonthData.totalAmount)}</strong>
                  </span>
                </div>

                {/* Monthly Download Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleExportMonthExcel}
                    className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Export Monthly Register (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Monthly Register
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthDetailedExcel}
                    className="p-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Export Itemized Veg Breakdown (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-400" /> Itemized Details
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthJSON}
                    className="p-2.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Download raw JSON archive of this month"
                  >
                    <Download className="w-4 h-4 text-gray-500" /> JSON Archive
                  </button>
                </div>

                {/* Clean Up & Delete Month Button */}
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    Done backing up? Clear this month to keep the database light.
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteMonthBills}
                    disabled={isDeletingMonth}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeletingMonth ? "Deleting..." : `Delete ${currentMonthData.label} Bills`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. FULL DATABASE BACKUP */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Full All-Time Backup
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportJSON}
                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-green-700" /> Complete JSON Backup
              </button>

              <button
                type="button"
                onClick={() => exportBillRegisterToExcel(bills)}
                className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export All Records to Excel
              </button>
            </div>
          </div>

          {/* 3. RESTORE FROM BACKUP */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Restore Database from File
            </h4>
            <label className="w-full p-4 border-2 border-dashed border-gray-300 hover:border-green-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-gray-50/50 hover:bg-green-50/20 transition-all">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-bold text-gray-700">Choose Backup JSON to Restore</span>
              <span className="text-[11px] text-gray-400">
                Restores all bills, client profiles, and numbering back into Turso Cloud
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* 4. SAMPLE DATA RESET */}
          <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500">Need to reset demo records?</span>
            <button
              type="button"
              onClick={handleResetSample}
              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Sample Data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
