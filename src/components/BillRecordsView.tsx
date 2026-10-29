"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Eye,
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  Building2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Share2,
} from "lucide-react";
import { SavedBill, Client } from "@/types/bill";
import { formatCurrency, parseBillDate } from "@/lib/utils";
import { generatePDF } from "@/lib/generatePDF";
import { shareOnWhatsApp } from "@/lib/share";
import { exportBillRegisterToExcel, exportDetailedItemsToExcel } from "@/lib/excelExport";
import { storage } from "@/lib/storage";
import { BillDetailsModal } from "./BillDetailsModal";
import { ConfirmModal } from "./ConfirmModal";

interface BillRecordsViewProps {
  bills: SavedBill[];
  clients: Client[];
  onRefresh: () => void;
  onOpenHotelHistory: (client: Client) => void;
}

export const BillRecordsView: React.FC<BillRecordsViewProps> = ({
  bills,
  clients,
  onRefresh,
  onOpenHotelHistory,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHotelFilter, setSelectedHotelFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<"date" | "billNumber" | "hotelName" | "totalAmount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal states
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

  // Sorting toggle
  const handleSort = (field: "date" | "billNumber" | "hotelName" | "totalAmount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedHotelFilter("all");
    setSelectedStatusFilter("active");
    setStartDateFilter("");
    setEndDateFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
    setCurrentPage(1);
  };

  // Filter & Sort calculation
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // 1. Status Filter
      if (selectedStatusFilter !== "all" && bill.status !== selectedStatusFilter) {
        return false;
      }

      // 2. Hotel Filter
      if (selectedHotelFilter !== "all") {
        const matchesClient =
          bill.clientId === selectedHotelFilter ||
          bill.hotelName.toLowerCase() === selectedHotelFilter.toLowerCase();
        if (!matchesClient) return false;
      }

      // 3. Search query (matches Hotel name, Bill number, or item names)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesHotel = bill.hotelName.toLowerCase().includes(q);
        const matchesBillNum = bill.billNumber.toLowerCase().includes(q);
        const matchesItem = bill.items.some(
          (item) =>
            item.name.toLowerCase().includes(q) || (item.hindiName && item.hindiName.includes(q))
        );
        if (!matchesHotel && !matchesBillNum && !matchesItem) return false;
      }

      // 4. Amount Filter
      if (minAmountFilter && bill.totalAmount < parseFloat(minAmountFilter)) {
        return false;
      }
      if (maxAmountFilter && bill.totalAmount > parseFloat(maxAmountFilter)) {
        return false;
      }

      // 5. Date Range Filter
      if (startDateFilter || endDateFilter) {
        const billDateObj = parseBillDate(bill.date);
        if (startDateFilter) {
          const start = new Date(startDateFilter);
          start.setHours(0, 0, 0, 0);
          if (billDateObj < start) return false;
        }
        if (endDateFilter) {
          const end = new Date(endDateFilter);
          end.setHours(23, 59, 59, 999);
          if (billDateObj > end) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        const dateA = new Date(a.createdAt || parseBillDate(a.date)).getTime();
        const dateB = new Date(b.createdAt || parseBillDate(b.date)).getTime();
        comparison = dateA - dateB;
      } else if (sortField === "billNumber") {
        comparison = a.billNumber.localeCompare(b.billNumber, undefined, { numeric: true });
      } else if (sortField === "hotelName") {
        comparison = a.hotelName.localeCompare(b.hotelName);
      } else if (sortField === "totalAmount") {
        comparison = a.totalAmount - b.totalAmount;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    bills,
    selectedStatusFilter,
    selectedHotelFilter,
    searchQuery,
    minAmountFilter,
    maxAmountFilter,
    startDateFilter,
    endDateFilter,
    sortField,
    sortOrder,
  ]);

  // Summary Metrics of filtered bills
  const totalFilteredCount = filteredBills.length;
  const totalFilteredAmount = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + (b.status === "active" ? b.totalAmount : 0), 0);
  }, [filteredBills]);

  // Pagination calculation
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage, pageSize]);

  // Actions
  const handleDownloadPDF = async (bill: SavedBill) => {
    setDownloadingBillId(bill.id);
    setSelectedBillForDetails(bill); // Mounts details modal / offscreen
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

  // Confirm Modal Trigger
  const triggerArchiveConfirm = (bill: SavedBill) => {
    setConfirmModalData({
      isOpen: true,
      bill,
      actionType: "archive",
    });
  };

  const triggerRestoreConfirm = (bill: SavedBill) => {
    setConfirmModalData({
      isOpen: true,
      bill,
      actionType: "restore",
    });
  };

  const triggerDeleteConfirm = (bill: SavedBill) => {
    setConfirmModalData({
      isOpen: true,
      bill,
      actionType: "delete",
    });
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
      {/* Top Banner / Summary Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Excel-Like Master Register
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-1">Central Bill Records</h2>
          <p className="text-xs text-gray-500">
            Real-time searchable ledger of all generated bills with product-level snapshots
          </p>
        </div>

        {/* Live Filter Totals */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Active Revenue
            </span>
            <div className="text-2xl font-black text-emerald-900">
              {formatCurrency(totalFilteredAmount)}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              Showing {totalFilteredCount} of {bills.length} bills
            </span>
          </div>

          {/* Export Dropdown Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportBillRegisterToExcel(filteredBills)}
              className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer"
              title="Export visible register table to Excel"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Register (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => exportDetailedItemsToExcel(filteredBills)}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              title="Export all itemized vegetables and rates to Excel"
            >
              <FileDown className="w-4 h-4" /> Export Detailed Items
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Universal Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by hotel, bill #, or vegetable name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-medium"
            />
          </div>

          {/* Hotel Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedHotelFilter}
              onChange={(e) => {
                setSelectedHotelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium text-gray-800 cursor-pointer"
            >
              <option value="all">All Hotels &amp; Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.hotelName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium text-gray-800 cursor-pointer"
            >
              <option value="active">Active Bills Only</option>
              <option value="archived">Archived Bills</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> Reset Filters
            </button>
          </div>
        </div>

        {/* Date and Amount Range Sub-toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div>
            <label className="block text-gray-600 font-bold mb-1">From Date</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-3 border border-gray-300 rounded-xl text-gray-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1">To Date</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-3 border border-gray-300 rounded-xl text-gray-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1">Min Amount (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={minAmountFilter}
              onChange={(e) => {
                setMinAmountFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-3 border border-gray-300 rounded-xl text-gray-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1">Max Amount (₹)</label>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxAmountFilter}
              onChange={(e) => {
                setMaxAmountFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-3 border border-gray-300 rounded-xl text-gray-800 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <th
                  onClick={() => handleSort("date")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Bill Date</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("billNumber")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Bill Number</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("hotelName")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hotel / Client</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th
                  onClick={() => handleSort("totalAmount")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-200/70 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paginatedBills.length > 0 ? (
                paginatedBills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="hover:bg-emerald-50/40 transition-colors group"
                  >
                    {/* Bill Date */}
                    <td className="py-3.5 px-4 text-gray-900 whitespace-nowrap font-semibold">
                      {bill.date}
                    </td>

                    {/* Bill Number */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md text-xs">
                        {bill.billNumber}
                      </span>
                    </td>

                    {/* Hotel Name */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div
                          onClick={() => {
                            const client = clients.find((c) => c.id === bill.clientId || c.hotelName.toLowerCase() === bill.hotelName.toLowerCase());
                            if (client) onOpenHotelHistory(client);
                          }}
                          className="font-bold text-gray-900 hover:text-green-700 cursor-pointer transition-colors"
                          title="View this hotel's complete billing history"
                        >
                          {bill.hotelName}
                        </div>
                        {bill.clientPhone && (
                          <div className="text-xs text-gray-400">{bill.clientPhone}</div>
                        )}
                      </div>
                    </td>

                    {/* Item Count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap text-gray-700">
                      <span className="bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {bill.itemCount} items
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-extrabold text-base text-gray-900">
                        {formatCurrency(bill.totalAmount)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          bill.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Snapshot */}
                        <button
                          type="button"
                          onClick={() => setSelectedBillForDetails(bill)}
                          className="p-1.5 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="View complete bill snapshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(bill)}
                          disabled={downloadingBillId === bill.id}
                          className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Download PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>

                        {/* WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(bill)}
                          disabled={downloadingBillId === bill.id}
                          className="p-1.5 text-gray-600 hover:text-[#25D366] hover:bg-green-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Archive or Restore */}
                        {bill.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => triggerArchiveConfirm(bill)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Archive bill"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerRestoreConfirm(bill)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Restore bill to active"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => triggerDeleteConfirm(bill)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete bill permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <p className="font-semibold text-base">No bill records found matching your filters.</p>
                    <p className="text-xs text-gray-400 mt-1">Try clearing filters or search terms.</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-4 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100"
                    >
                      Clear All Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-gray-300 rounded-lg bg-white font-medium"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>records per page</span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Page <span className="font-bold text-gray-900">{currentPage}</span> of{" "}
              <span className="font-bold text-gray-900">{totalPages}</span> ({totalFilteredCount} total)
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Details Snapshot Modal */}
      <BillDetailsModal
        isOpen={!!selectedBillForDetails}
        bill={selectedBillForDetails}
        onClose={() => setSelectedBillForDetails(null)}
        onArchive={(b) => triggerArchiveConfirm(b)}
        onRestore={(b) => triggerRestoreConfirm(b)}
        onDelete={(b) => triggerDeleteConfirm(b)}
      />

      {/* Action Confirmation Modal */}
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
