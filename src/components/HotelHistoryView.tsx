"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  Calendar,
  FileSpreadsheet,
  FileDown,
  Eye,
  Plus,
  Share2,
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  Filter,
} from "lucide-react";
import { Client, SavedBill } from "@/types/bill";
import { formatCurrency, parseBillDate } from "@/lib/utils";
import { exportHotelHistoryToExcel } from "@/lib/excelExport";
import { generatePDF } from "@/lib/generatePDF";
import { shareOnWhatsApp } from "@/lib/share";
import { storage } from "@/lib/storage";
import { BillDetailsModal } from "./BillDetailsModal";
import { ConfirmModal } from "./ConfirmModal";

interface HotelHistoryViewProps {
  client: Client;
  bills: SavedBill[];
  onBack: () => void;
  onCreateBillForHotel: (client: Client) => void;
  onRefresh: () => void;
}

export const HotelHistoryView: React.FC<HotelHistoryViewProps> = ({
  client,
  bills,
  onBack,
  onCreateBillForHotel,
  onRefresh,
}) => {
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "archived">("active");

  const [selectedBillForDetails, setSelectedBillForDetails] = useState<SavedBill | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    bill: SavedBill | null;
    actionType: "archive" | "delete" | "restore";
  }>({
    isOpen: false,
    bill: null,
    actionType: "archive",
  });

  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);

  // Filter bills strictly belonging to this hotel
  const hotelBills = useMemo(() => {
    return bills.filter(
      (b) =>
        b.clientId === client.id ||
        b.hotelName.trim().toLowerCase() === client.hotelName.trim().toLowerCase()
    );
  }, [bills, client]);

  // Apply date and status filters
  const filteredBills = useMemo(() => {
    return hotelBills
      .filter((b) => {
        if (selectedStatus !== "all" && b.status !== selectedStatus) return false;

        if (startDateFilter || endDateFilter) {
          const billDate = parseBillDate(b.date);
          if (startDateFilter) {
            const start = new Date(startDateFilter);
            start.setHours(0, 0, 0, 0);
            if (billDate < start) return false;
          }
          if (endDateFilter) {
            const end = new Date(endDateFilter);
            end.setHours(23, 59, 59, 999);
            if (billDate > end) return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || parseBillDate(a.date)).getTime();
        const dateB = new Date(b.createdAt || parseBillDate(b.date)).getTime();
        return dateB - dateA;
      });
  }, [hotelBills, selectedStatus, startDateFilter, endDateFilter]);

  // Stats calculation
  const totalBilledLifetime = useMemo(() => {
    return hotelBills
      .filter((b) => b.status === "active")
      .reduce((sum, b) => sum + b.totalAmount, 0);
  }, [hotelBills]);

  const activeBillsCount = useMemo(() => {
    return hotelBills.filter((b) => b.status === "active").length;
  }, [hotelBills]);

  const currentMonthBilled = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return hotelBills
      .filter((b) => {
        if (b.status !== "active") return false;
        const d = parseBillDate(b.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + b.totalAmount, 0);
  }, [hotelBills]);

  const latestBill = hotelBills.length > 0 ? hotelBills[0] : null;

  // Actions
  const handleDownloadPDF = async (bill: SavedBill) => {
    setDownloadingBillId(bill.id);
    setSelectedBillForDetails(bill);
    setTimeout(async () => {
      try {
        const filename = `${bill.hotelName.replace(/\s+/g, "_")}_${bill.billNumber}_${bill.date}.pdf`;
        await generatePDF(`bill-details-snapshot-${bill.id}`, filename);
      } finally {
        setDownloadingBillId(null);
      }
    }, 150);
  };

  const handleShareWhatsApp = async (bill: SavedBill) => {
    setDownloadingBillId(bill.id);
    setSelectedBillForDetails(bill);
    setTimeout(async () => {
      try {
        const filename = `${bill.hotelName.replace(/\s+/g, "_")}_${bill.billNumber}_${bill.date}.pdf`;
        const blob = await generatePDF(`bill-details-snapshot-${bill.id}`, filename, { download: false });
        if (blob) {
          const text = `Bill from PURE GREEN HARVEST FARMS\nBill No: ${bill.billNumber}\nHotel: ${bill.hotelName}\nDate: ${bill.date}\nTotal Amount: ${formatCurrency(bill.totalAmount)}`;
          await shareOnWhatsApp(blob, filename, text);
        }
      } finally {
        setDownloadingBillId(null);
      }
    }, 150);
  };

  const executeConfirmedAction = () => {
    const { bill, actionType } = confirmModalData;
    if (!bill) return;

    if (actionType === "archive") {
      storage.archiveBill(bill.id);
    } else if (actionType === "restore") {
      storage.restoreBill(bill.id);
    } else if (actionType === "delete") {
      storage.deleteBill(bill.id);
    }

    setConfirmModalData({ isOpen: false, bill: null, actionType: "archive" });
    if (selectedBillForDetails?.id === bill.id) {
      setSelectedBillForDetails(null);
    }
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Back button & Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-colors cursor-pointer mt-1"
              title="Back to All Hotels"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {client.isActive ? "Active Client" : "Inactive / Archived"}
                </span>
                <span className="text-xs text-gray-400 font-mono">ID: {client.id.slice(-6)}</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mt-1">{client.hotelName}</h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-2">
                {client.contactPerson && (
                  <span className="flex items-center gap-1 font-semibold text-gray-800">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" /> {client.contactPerson}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {client.phone}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {client.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCreateBillForHotel(client)}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md shadow-green-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Bill for this Hotel
            </button>

            <button
              type="button"
              onClick={() => exportHotelHistoryToExcel(client, hotelBills)}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-2 transition-all cursor-pointer"
              title="Download entire billing ledger to Excel"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Hotel Ledger (.xlsx)
            </button>
          </div>
        </div>

        {/* Client KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Lifetime Total Billed
            </span>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {formatCurrency(totalBilledLifetime)}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Across {activeBillsCount} active bills
            </span>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              This Month Billing
            </span>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {formatCurrency(currentMonthBilled)}
            </div>
            <span className="text-[11px] text-blue-700 font-medium">Current calendar month</span>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Total Bills Recorded
            </span>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {hotelBills.length}
            </div>
            <span className="text-[11px] text-amber-700 font-medium">
              {hotelBills.filter((b) => b.status === "archived").length} archived
            </span>
          </div>

          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Latest Bill
            </span>
            <div className="text-lg font-black text-purple-950 mt-1">
              {latestBill ? latestBill.date : "None yet"}
            </div>
            <span className="text-[11px] text-purple-700 font-medium">
              {latestBill ? `${latestBill.billNumber} (${formatCurrency(latestBill.totalAmount)})` : "—"}
            </span>
          </div>
        </div>

        {client.notes && (
          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-200">
            <span className="font-bold text-gray-700">Client Notes: </span>
            {client.notes}
          </div>
        )}
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-md border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-700">Filter Dates:</span>
          </div>

          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-xl font-medium text-gray-800"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-xl font-medium text-gray-800"
          />

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="py-1.5 px-3 border border-gray-300 rounded-xl font-medium text-gray-800 bg-white"
          >
            <option value="active">Active Bills</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>

        {(startDateFilter || endDateFilter || selectedStatus !== "active") && (
          <button
            type="button"
            onClick={() => {
              setStartDateFilter("");
              setEndDateFilter("");
              setSelectedStatus("active");
            }}
            className="text-xs font-bold text-green-700 hover:underline"
          >
            Clear Date Filters
          </button>
        )}
      </div>

      {/* Hotel Bills Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-base text-gray-900">
            Billing History ({filteredBills.length} records)
          </h3>
          <span className="text-xs text-gray-500 font-semibold">
            Filtered Total:{" "}
            <span className="text-green-800 font-bold">
              {formatCurrency(filteredBills.reduce((s, b) => s + (b.status === "active" ? b.totalAmount : 0), 0))}
            </span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <th className="py-3 px-4">Bill Date</th>
                <th className="py-3 px-4">Bill Number</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Bill Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{bill.date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {bill.billNumber}
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-700">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {bill.itemCount} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-gray-900">
                      {formatCurrency(bill.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          bill.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedBillForDetails(bill)}
                          className="p-1.5 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="View product details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(bill)}
                          disabled={downloadingBillId === bill.id}
                          className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(bill)}
                          disabled={downloadingBillId === bill.id}
                          className="p-1.5 text-gray-600 hover:text-[#25D366] hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="Share WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {bill.status === "active" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModalData({ isOpen: true, bill, actionType: "archive" })
                            }
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Archive bill"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModalData({ isOpen: true, bill, actionType: "restore" })
                            }
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Restore bill"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmModalData({ isOpen: true, bill, actionType: "delete" })
                          }
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <p className="font-semibold">No bills found for this hotel.</p>
                    <button
                      type="button"
                      onClick={() => onCreateBillForHotel(client)}
                      className="mt-3 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      + Generate First Bill for {client.hotelName}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal */}
      <BillDetailsModal
        isOpen={!!selectedBillForDetails}
        bill={selectedBillForDetails}
        onClose={() => setSelectedBillForDetails(null)}
        onArchive={(b) => setConfirmModalData({ isOpen: true, bill: b, actionType: "archive" })}
        onRestore={(b) => setConfirmModalData({ isOpen: true, bill: b, actionType: "restore" })}
        onDelete={(b) => setConfirmModalData({ isOpen: true, bill: b, actionType: "delete" })}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={
          confirmModalData.actionType === "delete"
            ? "Confirm Delete Bill"
            : confirmModalData.actionType === "archive"
            ? "Confirm Archive Bill"
            : "Confirm Restore Bill"
        }
        actionType={confirmModalData.actionType}
        billDetails={
          confirmModalData.bill
            ? {
                billNumber: confirmModalData.bill.billNumber,
                hotelName: confirmModalData.bill.hotelName,
                date: confirmModalData.bill.date,
                amount: confirmModalData.bill.totalAmount,
              }
            : undefined
        }
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmModalData({ isOpen: false, bill: null, actionType: "archive" })}
      />
    </div>
  );
};
