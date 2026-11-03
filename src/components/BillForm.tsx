"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Plus, Trash2, FileDown, Share2, Eye, Building2, PlusCircle, CheckCircle, AlertCircle, RefreshCw, Hash, Calendar as CalendarIcon, Save } from "lucide-react";
import { BillData, BillItem, Client, SavedBill } from "@/types/bill";
import { generatePDF } from "@/lib/generatePDF";
import { shareOnWhatsApp } from "@/lib/share";
import { getItemAmount, formatCurrency } from "@/lib/utils";
import { storage } from "@/lib/storage";
import { AddClientModal } from "./AddClientModal";
import { DatePicker } from "./DatePicker";

interface BillFormProps {
  onPreviewDataChange: (data: BillData) => void;
  onBillSaved?: (savedBill: SavedBill) => void;
  onViewRegister?: () => void;
}

export const BillForm: React.FC<BillFormProps> = ({
  onPreviewDataChange,
  onBillSaved,
  onViewRegister,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [hotelSearch, setHotelSearch] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [hotelName, setHotelName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientAddress, setClientAddress] = useState<string>("");

  const [billNumber, setBillNumber] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "dd-MM-yyyy"));
  const [items, setItems] = useState<BillItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedSuccessBill, setSavedSuccessBill] = useState<SavedBill | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize clients, bill number, and items on mount
  useEffect(() => {
    refreshClientsList();
    const nextNum = storage.getNextBillNumber();
    setBillNumber(nextNum);

    import("@/lib/constants").then(({ INITIAL_ITEMS }) => {
      setItems(INITIAL_ITEMS.map((item) => ({ ...item, isCustom: false })));
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshClientsList = () => {
    const list = storage.getClients().filter((c) => c.isActive);
    setClients(list);
  };

  // Sync state up to parent for preview
  useEffect(() => {
    onPreviewDataChange({
      billNumber,
      hotelName,
      date,
      clientPhone,
      clientAddress,
      items,
    });
  }, [billNumber, hotelName, date, clientPhone, clientAddress, items, onPreviewDataChange]);

  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setHotelName(client.hotelName);
    setHotelSearch(client.hotelName);
    setClientPhone(client.phone || "");
    setClientAddress(client.address || "");
    setIsDropdownOpen(false);
    setFormError(null);
  };

  const handleClientSavedFromModal = (newClient: Client) => {
    refreshClientsList();
    handleSelectClient(newClient);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", quantity: "", unit: "kg", rate: "", isCustom: true },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BillItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + getItemAmount(item), 0);
  };

  const getValidItemsCount = () => {
    return items.filter((i) => parseFloat(i.quantity) > 0 && parseFloat(i.rate) > 0).length;
  };

  const getFilename = () => {
    const formattedHotel = (hotelName || "Customer").trim().replace(/\s+/g, "_");
    const num = billNumber || "BILL";
    return `${formattedHotel}_${num}_${date}.pdf`;
  };

  const validateForm = (): boolean => {
    if (!hotelName.trim()) {
      setFormError("Hotel / Client selection is mandatory. Please select or add a hotel.");
      return false;
    }
    const filledCount = getValidItemsCount();
    if (filledCount === 0) {
      setFormError("Please enter quantity and rate for at least one vegetable.");
      return false;
    }
    setFormError(null);
    return true;
  };

  // Save bill record into permanent storage
  const executeSaveBill = async (): Promise<SavedBill | null> => {
    if (!validateForm()) return null;

    setIsSaving(true);
    try {
      const saved = await storage.saveBill({
        id: savedSuccessBill?.id,
        billNumber: savedSuccessBill?.billNumber || billNumber,
        clientId: selectedClientId || undefined,
        hotelName: hotelName.trim(),
        clientPhone,
        clientAddress,
        date,
        items,
      });

      if (!saved) {
        setFormError("Could not save bill. Please try again.");
        return null;
      }

      setSavedSuccessBill(saved);
      if (saved.billNumber !== billNumber) {
        setBillNumber(saved.billNumber);
      }

      if (onBillSaved) {
        onBillSaved(saved);
      }

      return saved;
    } catch (err) {
      console.error("Save error:", err);
      setFormError("Failed to save bill. Please try again.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectSave = async () => {
    if (isSaving || isGenerating) return;
    const saved = await executeSaveBill();
    if (saved) {
      setFormError(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (isGenerating || isSaving) return; // Prevent duplicate clicks
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      // 1. Mandatory rule: Bill MUST be saved first!
      const saved = await executeSaveBill();
      if (!saved) {
        // Without saved, nothing should happen!
        return;
      }

      // 2. Only after saving successfully, proceed to download PDF
      await generatePDF("bill-preview", getFilename());
      // Keep saved bill active so user can also share to WhatsApp without duplicating
    } catch (err) {
      console.error("Error generating bill:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (isGenerating || isSaving) return;
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      // 1. Mandatory rule: Bill MUST be saved first!
      const saved = await executeSaveBill();
      if (!saved) {
        // Without saved, nothing should happen!
        return;
      }

      // 2. Only after saving successfully, proceed to share on WhatsApp
      const activeBillNum = saved.billNumber || billNumber;
      const blob = await generatePDF("bill-preview", getFilename(), { download: false });
      if (blob) {
        const text = `Bill from PURE GREEN HARVEST FARMS\nBill No: ${activeBillNum}\nHotel: ${hotelName}\nDate: ${date}\nTotal Amount: ${formatCurrency(calculateTotal())}`;
        await shareOnWhatsApp(blob, getFilename(), text);
      }
      // Keep saved bill active so no duplicate bill is created
    } catch (err) {
      console.error("Error sharing on WhatsApp:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetForNewBill = () => {
    setSavedSuccessBill(null);
    setSelectedClientId("");
    setHotelName("");
    setHotelSearch("");
    setClientPhone("");
    setClientAddress("");
    const nextNum = storage.getNextBillNumber();
    setBillNumber(nextNum);
    setDate(format(new Date(), "dd-MM-yyyy"));

    // Reset quantities and rates to blank while keeping standard vegetable names
    import("@/lib/constants").then(({ INITIAL_ITEMS }) => {
      setItems(INITIAL_ITEMS.map((item) => ({ ...item, quantity: "", rate: "", isCustom: false })));
    });
  };

  const scrollToPreview = () => {
    document.getElementById("preview-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Filter clients for dropdown
  const filteredClients = clients.filter((c) =>
    c.hotelName.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 p-6 text-white flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              New Bill Entry
            </span>
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Hash className="w-3 h-3" /> {billNumber}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-1">Generate Vegetable Bill</h2>
          <p className="text-green-100 text-xs">
            Select hotel, enter quantities, preview & auto-save to records
          </p>
        </div>

        <button
          onClick={handleResetForNewBill}
          type="button"
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Start fresh bill"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Clear Form
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccessBill && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Bill {savedSuccessBill.billNumber} Saved Successfully!
                </p>
                <p className="text-xs text-emerald-700">
                  Recorded for {savedSuccessBill.hotelName} (Total: {formatCurrency(savedSuccessBill.totalAmount)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetForNewBill}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Start Next Bill
              </button>
              {onViewRegister && (
                <button
                  type="button"
                  onClick={onViewRegister}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 transition-colors cursor-pointer"
                >
                  View Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Error Notification */}
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        {/* Header Details (Hotel, Bill#, Date) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Hotel Selection */}
          <div className="md:col-span-6 relative" ref={dropdownRef}>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Select Hotel / Client <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddClientModalOpen(true)}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" /> + New Hotel
              </button>
            </div>

            <div className="relative">
              <Building2 className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search or select existing hotel..."
                value={hotelSearch}
                onChange={(e) => {
                  setHotelSearch(e.target.value);
                  setHotelName(e.target.value);
                  setIsDropdownOpen(true);
                  setFormError(null);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            {/* Dropdown Options */}
            {isDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <span className="text-[11px] font-bold uppercase text-gray-500">
                    Saved Hotels ({filteredClients.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsAddClientModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-green-700 hover:underline"
                  >
                    + Add New Hotel
                  </button>
                </div>

                {filteredClients.length > 0 ? (
                  filteredClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-sm text-gray-900">{c.hotelName}</div>
                        {c.contactPerson && (
                          <div className="text-xs text-gray-500">{c.contactPerson}</div>
                        )}
                      </div>
                      {c.phone && <div className="text-xs text-gray-400 font-mono">{c.phone}</div>}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No hotel found matching &quot;{hotelSearch}&quot;.
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsAddClientModalOpen(true);
                      }}
                      className="mt-2 block w-full py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100"
                    >
                      + Register &quot;{hotelSearch}&quot; as New Hotel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Unique Bill Number */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Bill Number
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Bill Date with Smooth Interactive Calendar */}
          <div className="md:col-span-3">
            <DatePicker
              label="Bill Date"
              value={date}
              onChange={(newDate) => setDate(newDate)}
            />
          </div>
        </div>

        {/* Vegetables Items Table */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Vegetables &amp; Rates</h3>
              <p className="text-xs text-gray-500">
                {getValidItemsCount()} of {items.length} items entered
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Extra Item
            </button>
          </div>

          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            <div className="col-span-5">Vegetable Name</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-1 text-center">Unit</div>
            <div className="col-span-2 text-center">Rate (₹)</div>
            <div className="col-span-2 text-right">Amount (₹)</div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {items.map((item, index) => {
              const itemAmt = getItemAmount(item);
              const isFilled = parseFloat(item.quantity) > 0 || parseFloat(item.rate) > 0;

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center p-3 rounded-xl border transition-all ${
                    isFilled
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Name column */}
                  <div className="md:col-span-5">
                    {item.isCustom ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Vegetable Name (English/Hindi)"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                          className="w-full py-1.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            {index + 1}. {item.name}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">{item.hindiName}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="flex md:col-span-2 items-center gap-1">
                    <span className="md:hidden text-xs text-gray-500 w-12">Qty:</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                      className="w-full py-1.5 px-2 border border-gray-300 rounded-lg text-center text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  {/* Unit */}
                  <div className="flex md:col-span-1 items-center gap-1">
                    <span className="md:hidden text-xs text-gray-500 w-12">Unit:</span>
                    <select
                      value={item.unit || "kg"}
                      onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                      className="w-full py-1.5 px-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 text-center focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                    >
                      <option value="kg">kg</option>
                      <option value="gm">gm</option>
                      <option value="pcs">pcs</option>
                      <option value="bunch">bunch</option>
                    </select>
                  </div>

                  {/* Rate */}
                  <div className="flex md:col-span-2 items-center gap-1">
                    <span className="md:hidden text-xs text-gray-500 w-12">Rate:</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="₹ Rate"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                      className="w-full py-1.5 px-2 border border-gray-300 rounded-lg text-center text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="flex md:col-span-2 items-center justify-between md:justify-end text-sm font-bold text-gray-900">
                    <span className="md:hidden text-xs text-gray-500 font-normal">Amount:</span>
                    <span>{itemAmt > 0 ? formatCurrency(itemAmt) : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grand Total Summary Card */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-green-200 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Grand Total ({getValidItemsCount()} items)
            </span>
            <div className="text-xs text-emerald-600 mt-0.5">
              Auto-calculated based on quantities and rates
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-900">
            {formatCurrency(calculateTotal())}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
          <button
            type="button"
            onClick={scrollToPreview}
            className="flex items-center justify-center gap-1.5 w-full py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>

          <button
            type="button"
            onClick={handleDirectSave}
            disabled={isSaving || isGenerating}
            className={`flex items-center justify-center gap-1.5 w-full py-3 px-3 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-70 ${
              savedSuccessBill
                ? "bg-emerald-700 hover:bg-emerald-800"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {savedSuccessBill ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" /> Saved ({savedSuccessBill.billNumber})
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Bill"}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating || isSaving}
            className="flex items-center justify-center gap-1.5 w-full py-3 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-md shadow-green-200 transition-all disabled:opacity-70 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            {isGenerating ? "Processing..." : savedSuccessBill ? "Download PDF" : "Save & Download"}
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={isGenerating || isSaving}
            className="flex items-center justify-center gap-1.5 w-full py-3 px-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl text-xs shadow-md shadow-green-100 transition-all disabled:opacity-70 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            {savedSuccessBill ? "Share WhatsApp" : "Save & WhatsApp"}
          </button>
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onClientSaved={handleClientSavedFromModal}
      />
    </div>
  );
};
