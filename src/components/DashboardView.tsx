"use client";

import React, { useMemo, useState } from "react";
import {
  DollarSign,
  Receipt,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  PlusCircle,
  FileSpreadsheet,
  Users,
  Eye,
  FileDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { SavedBill, Client } from "@/types/bill";
import { formatCurrency, parseBillDate } from "@/lib/utils";
import { exportBillRegisterToExcel } from "@/lib/excelExport";
import { generatePDF } from "@/lib/generatePDF";
import { BillDetailsModal } from "./BillDetailsModal";

interface DashboardViewProps {
  bills: SavedBill[];
  clients: Client[];
  onNavigateTab: (tab: "dashboard" | "create" | "records" | "clients") => void;
  onOpenHotelHistory: (client: Client) => void;
  onOpenAddHotelModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bills,
  clients,
  onNavigateTab,
  onOpenHotelHistory,
  onOpenAddHotelModal,
}) => {
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<SavedBill | null>(null);
  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);

  // Compute live dashboard metrics
  const activeBills = useMemo(() => bills.filter((b) => b.status === "active"), [bills]);

  const totalBillingAmount = useMemo(() => {
    return activeBills.reduce((sum, b) => sum + b.totalAmount, 0);
  }, [activeBills]);

  const activeHotelsCount = useMemo(() => {
    return clients.filter((c) => c.isActive).length;
  }, [clients]);

  // Today's metrics
  const todayMetrics = useMemo(() => {
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();

    const todayBills = activeBills.filter((b) => {
      const d = parseBillDate(b.date);
      return (
        d.getDate() === todayDay &&
        d.getMonth() === todayMonth &&
        d.getFullYear() === todayYear
      );
    });

    const amount = todayBills.reduce((sum, b) => sum + b.totalAmount, 0);
    return { count: todayBills.length, amount };
  }, [activeBills]);

  // This Month's metrics
  const monthMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthBills = activeBills.filter((b) => {
      const d = parseBillDate(b.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const amount = monthBills.reduce((sum, b) => sum + b.totalAmount, 0);
    return { count: monthBills.length, amount };
  }, [activeBills]);

  // Recently Generated Bills (top 5)
  const recentBills = useMemo(() => {
    return [...bills]
      .sort((a, b) => {
        return (
          new Date(b.createdAt || parseBillDate(b.date)).getTime() -
          new Date(a.createdAt || parseBillDate(a.date)).getTime()
        );
      })
      .slice(0, 5);
  }, [bills]);

  // Frequently Billed Hotels (Top 5 by active billing revenue)
  const topHotels = useMemo(() => {
    const hotelMap = new Map<string, { hotelName: string; totalAmount: number; billCount: number; client?: Client }>();

    activeBills.forEach((b) => {
      const existing = hotelMap.get(b.hotelName.toLowerCase());
      if (existing) {
        existing.totalAmount += b.totalAmount;
        existing.billCount += 1;
      } else {
        const client = clients.find(
          (c) => c.id === b.clientId || c.hotelName.toLowerCase() === b.hotelName.toLowerCase()
        );
        hotelMap.set(b.hotelName.toLowerCase(), {
          hotelName: b.hotelName,
          totalAmount: b.totalAmount,
          billCount: 1,
          client,
        });
      }
    });

    return Array.from(hotelMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
  }, [activeBills, clients]);

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

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-700 to-emerald-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Pure Green Harvest Farms
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Vegetable Billing &amp; Client Ledger
          </h1>
          <p className="text-green-100 text-sm mt-2 font-medium">
            Permanent client accounts, automated unique bill numbering, real-time analytics, and instant Excel exports.
          </p>
        </div>

        {/* Quick Access Action Bar */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-white/20">
          <button
            type="button"
            onClick={() => onNavigateTab("create")}
            className="px-5 py-3 bg-white text-green-900 hover:bg-green-50 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-green-700" /> Generate New Bill
          </button>

          <button
            type="button"
            onClick={onOpenAddHotelModal}
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-bold text-xs backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" /> Add New Hotel
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("records")}
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-bold text-xs backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Receipt className="w-4 h-4" /> View Bill Records
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("clients")}
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-bold text-xs backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" /> View All Clients
          </button>

          <button
            type="button"
            onClick={() => exportBillRegisterToExcel(bills)}
            className="px-4 py-3 bg-emerald-950/60 hover:bg-emerald-950 text-white rounded-2xl font-bold text-xs backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer ml-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-400" /> Export to Excel
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Billing */}
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Revenue
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">
              {formatCurrency(totalBillingAmount)}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Across {activeBills.length} active bills</p>
          </div>
        </div>

        {/* Total Bills */}
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Bills Generated
            </span>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">{bills.length}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {bills.filter((b) => b.status === "archived").length} archived
            </p>
          </div>
        </div>

        {/* Registered Hotels */}
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Registered Hotels
            </span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">{activeHotelsCount}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">{clients.length} total client accounts</p>
          </div>
        </div>

        {/* Today's Bills */}
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Today&apos;s Billing
            </span>
            <div className="p-2 bg-purple-50 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">
              {formatCurrency(todayMetrics.amount)}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{todayMetrics.count} bills issued today</p>
          </div>
        </div>

        {/* This Month's Bills */}
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              This Month
            </span>
            <div className="p-2 bg-rose-50 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">
              {formatCurrency(monthMetrics.amount)}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{monthMetrics.count} bills this month</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Bills & Top Hotels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Bills (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Recently Generated Bills</h3>
                <p className="text-xs text-gray-400">Latest vegetable deliveries and invoices</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("records")}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 cursor-pointer"
              >
                View Register <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {recentBills.length > 0 ? (
                recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="py-3 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                          {bill.billNumber}
                        </span>
                        <span className="font-bold text-sm text-gray-900">{bill.hotelName}</span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{bill.date}</span>
                        <span>•</span>
                        <span>{bill.itemCount} items</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-gray-900">
                          {formatCurrency(bill.totalAmount)}
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            bill.status === "active" ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {bill.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedBillForDetails(bill)}
                          className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="View Snapshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(bill)}
                          disabled={downloadingBillId === bill.id}
                          className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Download PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No bills generated yet. Click &quot;Generate New Bill&quot; to begin.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("records")}
            className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors text-center"
          >
            Browse All {bills.length} Bills in Master Register →
          </button>
        </div>

        {/* Frequently Billed Hotels (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Frequently Billed Hotels</h3>
                <p className="text-xs text-gray-400">Top revenue clients by active billing</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("clients")}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 cursor-pointer"
              >
                All Clients <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {topHotels.length > 0 ? (
                topHotels.map((hotel, idx) => (
                  <div
                    key={hotel.hotelName}
                    onClick={() => {
                      if (hotel.client) onOpenHotelHistory(hotel.client);
                    }}
                    className="p-3.5 rounded-2xl bg-gray-50/70 hover:bg-green-50/50 border border-gray-100 hover:border-green-200 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-green-100 text-green-800 font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">{hotel.hotelName}</div>
                        <div className="text-xs text-gray-400 font-medium">
                          {hotel.billCount} bills completed
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-emerald-800">
                        {formatCurrency(hotel.totalAmount)}
                      </div>
                      <span className="text-[10px] text-green-700 font-bold">View Ledger →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No billing history recorded yet.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddHotelModal}
            className="w-full mt-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-800 font-bold rounded-xl text-xs transition-colors text-center"
          >
            + Register Another Hotel Client
          </button>
        </div>
      </div>

      {/* Snapshot Modal */}
      <BillDetailsModal
        isOpen={!!selectedBillForDetails}
        bill={selectedBillForDetails}
        onClose={() => setSelectedBillForDetails(null)}
        onArchive={() => {}}
        onRestore={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
};
