"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Leaf,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Building2,
  Database,
  FileSpreadsheet,
} from "lucide-react";
import { BillData, Client, SavedBill } from "@/types/bill";
import { storage } from "@/lib/storage";
import { INITIAL_ITEMS } from "@/lib/constants";
import { BillForm } from "@/components/BillForm";
import { BillPreview } from "@/components/BillPreview";
import { DashboardView } from "@/components/DashboardView";
import { BillRecordsView } from "@/components/BillRecordsView";
import { ClientsView } from "@/components/ClientsView";
import { HotelHistoryView } from "@/components/HotelHistoryView";
import { AddClientModal } from "@/components/AddClientModal";
import { BackupModal } from "@/components/BackupModal";

type ActiveTab = "dashboard" | "create" | "records" | "clients" | "hotel_history";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [bills, setBills] = useState<SavedBill[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  // Bill preview state for the "Generate Bill" tab
  const [previewData, setPreviewData] = useState<BillData>({
    hotelName: "",
    date: format(new Date(), "dd-MM-yyyy"),
    items: INITIAL_ITEMS,
  });

  // Modal states
  const [isAddHotelModalOpen, setIsAddHotelModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Reload all stored data with cloud database sync
  const loadData = useCallback(async () => {
    setBills(storage.getBills());
    setClients(storage.getClients());

    const cloud = await storage.syncFromBackend();
    if (cloud) {
      setBills(cloud.bills);
      setClients(cloud.clients);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate to hotel history
  const handleOpenHotelHistory = (client: Client) => {
    setSelectedClientForHistory(client);
    setActiveTab("hotel_history");
  };

  // Quick action: start bill pre-selected for this hotel
  const handleCreateBillForHotel = (client: Client) => {
    setPreviewData((prev) => ({
      ...prev,
      hotelName: client.hotelName,
      clientPhone: client.phone,
      clientAddress: client.address,
    }));
    setActiveTab("create");
  };

  const handleBillSaved = (newBill: SavedBill) => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-xl shadow-md shadow-green-200">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-black uppercase tracking-wider text-gray-900 block leading-tight">
                  Pure Green
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-green-700 block leading-none">
                  Harvest Farms
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 p-1 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white text-green-800 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "create"
                    ? "bg-white text-green-800 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Generate Bill
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("records")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "records"
                    ? "bg-white text-green-800 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Receipt className="w-4 h-4" />
                Bill Records
                <span className="ml-1 px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full text-[10px]">
                  {bills.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("clients")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "clients" || activeTab === "hotel_history"
                    ? "bg-white text-green-800 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Hotels &amp; Clients
                <span className="ml-1 px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full text-[10px]">
                  {clients.length}
                </span>
              </button>
            </nav>

            {/* Right Action: Backup & System Status */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(true)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Backup and restore data"
              >
                <Database className="w-3.5 h-3.5 text-green-700" />
                <span className="hidden sm:inline">Backup &amp; Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="md:hidden flex items-center justify-around bg-gray-50 border-t border-gray-200 py-1.5 px-2">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 ${
              activeTab === "dashboard" ? "text-green-800 bg-white shadow-xs" : "text-gray-500"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 ${
              activeTab === "create" ? "text-green-800 bg-white shadow-xs" : "text-gray-500"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("records")}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 ${
              activeTab === "records" ? "text-green-800 bg-white shadow-xs" : "text-gray-500"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Records ({bills.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("clients")}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 ${
              activeTab === "clients" || activeTab === "hotel_history"
                ? "text-green-800 bg-white shadow-xs"
                : "text-gray-500"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hotels</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* 1. DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <DashboardView
            bills={bills}
            clients={clients}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenHotelHistory={handleOpenHotelHistory}
            onOpenAddHotelModal={() => setIsAddHotelModalOpen(true)}
          />
        )}

        {/* 2. GENERATE BILL TAB */}
        {activeTab === "create" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Bill Form */}
              <div className="lg:col-span-5">
                <BillForm
                  onPreviewDataChange={setPreviewData}
                  onBillSaved={handleBillSaved}
                  onViewRegister={() => setActiveTab("records")}
                />
              </div>

              {/* Right Column: Live A4 Bill Sheet Preview */}
              <div
                id="preview-section"
                className="lg:col-span-7 bg-white rounded-3xl shadow-xl border border-gray-200 p-4 sm:p-8 overflow-hidden sticky top-24"
              >
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">A4 Bill Sheet Preview</h2>
                    <p className="text-xs text-gray-500">
                      Standardized format matching your print invoice
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Pure Green Print Format
                  </span>
                </div>

                {/* Scaled Preview Canvas */}
                <div className="w-full overflow-x-auto flex justify-center bg-gray-100/90 rounded-2xl p-4 shadow-inner min-h-[340px]">
                  <div className="transform scale-[0.46] sm:scale-[0.62] md:scale-[0.78] lg:scale-[0.7] xl:scale-[0.84] origin-top w-full flex justify-center transition-all">
                    <BillPreview data={previewData} customId="bill-preview" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CENTRAL BILL RECORDS TAB */}
        {activeTab === "records" && (
          <BillRecordsView
            bills={bills}
            clients={clients}
            onRefresh={loadData}
            onOpenHotelHistory={handleOpenHotelHistory}
          />
        )}

        {/* 4. CLIENTS / HOTEL MANAGEMENT TAB */}
        {activeTab === "clients" && (
          <ClientsView
            clients={clients}
            bills={bills}
            onRefresh={loadData}
            onOpenHotelHistory={handleOpenHotelHistory}
            onCreateBillForHotel={handleCreateBillForHotel}
          />
        )}

        {/* 5. DEDICATED HOTEL-WISE BILL HISTORY TAB */}
        {activeTab === "hotel_history" && selectedClientForHistory && (
          <HotelHistoryView
            client={selectedClientForHistory}
            bills={bills}
            onBack={() => setActiveTab("clients")}
            onCreateBillForHotel={handleCreateBillForHotel}
            onRefresh={loadData}
          />
        )}
      </main>

      {/* Global Add Client Modal */}
      <AddClientModal
        isOpen={isAddHotelModalOpen}
        onClose={() => setIsAddHotelModalOpen(false)}
        onClientSaved={() => loadData()}
      />

      {/* Global Backup / Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        bills={bills}
        clients={clients}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={() => loadData()}
      />
    </div>
  );
}
