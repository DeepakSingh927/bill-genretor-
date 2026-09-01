"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Trash2, FileDown, Share2, Eye } from "lucide-react";
import { BillData, BillItem } from "@/types/bill";
import { generatePDF } from "@/lib/generatePDF";
import { shareOnWhatsApp } from "@/lib/share";
import { getItemAmount } from "@/lib/utils";

interface BillFormProps {
  onPreviewDataChange: (data: BillData) => void;
}

export const BillForm: React.FC<BillFormProps> = ({ onPreviewDataChange }) => {
  const [hotelName, setHotelName] = useState("");
  const [date, setDate] = useState(format(new Date(), "dd-MM-yyyy"));
  const [items, setItems] = useState<BillItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize items only once on mount
  useEffect(() => {
    import("@/lib/constants").then(({ INITIAL_ITEMS }) => {
      setItems(INITIAL_ITEMS);
    });
  }, []);

  // Sync state up to parent for preview
  useEffect(() => {
    if (items.length > 0) {
      onPreviewDataChange({ hotelName, date, items });
    }
  }, [hotelName, date, items, onPreviewDataChange]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: "", quantity: "", unit: "kg", rate: "", isCustom: true },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BillItem, value: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + getItemAmount(item), 0);
  };

  const getFilename = () => {
    const formattedHotel = hotelName.trim().replace(/\s+/g, '_') || "Bill";
    return `${formattedHotel}_${date}.pdf`;
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    await generatePDF("bill-preview", getFilename());
    setIsGenerating(false);
  };

  const handleShareWhatsApp = async () => {
    setIsGenerating(true);
    const blob = await generatePDF("bill-preview", getFilename());
    setIsGenerating(false);
    
    if (blob) {
      const text = `Bill from PURE GREEN HARVEST FARMS for ${hotelName || 'Customer'}. Total Amount: ₹${calculateTotal().toFixed(2)}`;
      await shareOnWhatsApp(blob, getFilename(), text);
    }
  };

  const scrollToPreview = () => {
    document.getElementById("preview-section")?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
      <div className="bg-green-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Create Bill</h2>
        <p className="text-green-100 text-sm mt-1">Enter details to generate your bill</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Hotel Name</label>
            <input
              type="text"
              placeholder="e.g. Taj Hotel"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Date</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
            />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-black">Vegetables</h3>
          </div>
          
          <div className="space-y-2">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 py-1 text-xs font-semibold text-black uppercase">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Rate</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end md:items-center bg-gray-50 p-4 md:p-2 rounded-xl border border-gray-200 relative">
                {/* Mobile Label */}
                {!item.isCustom && <div className="md:hidden absolute top-2 left-4 text-xs font-bold text-black">{index + 1}. {item.name} ({item.hindiName})</div>}
                {item.isCustom && <div className="md:hidden absolute top-2 left-4 text-xs font-bold text-black">Extra Item</div>}
                
                <div className={`md:col-span-5 ${item.isCustom ? 'mt-4 md:mt-0' : 'mt-4 md:mt-0 hidden md:block'}`}>
                  {item.isCustom ? (
                    <input
                      type="text"
                      placeholder="Vegetable Name"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      className="w-full py-2 px-3 border border-gray-400 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-base text-black"
                    />
                  ) : (
                    <>
                      <div className="font-semibold text-black text-sm">{index + 1}. {item.name}</div>
                      <div className="text-xs text-black font-medium">{item.hindiName}</div>
                    </>
                  )}
                </div>
                
                <div className="flex md:col-span-4 gap-2 items-end">
                  <div className="flex-auto min-w-0">
                    <label className="md:hidden text-xs text-black mb-1 block truncate">Qty</label>
                    <div className="inline-grid items-center w-full">
                      <span className="invisible whitespace-pre col-start-1 row-start-1 py-2 px-3 text-base min-w-[3rem]">{item.quantity || "Qty"}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        className="col-start-1 row-start-1 w-full py-2 px-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-base text-black"
                      />
                    </div>
                  </div>
                  <div className="w-[45px] shrink-0 min-w-0">
                    <label className="md:hidden text-xs text-black mb-1 block truncate text-center">Unit</label>
                    <select
                      value={item.unit || "kg"}
                      onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                      className="w-full py-2 px-1 bg-gray-100 border border-gray-400 rounded-md text-xs font-bold text-black focus:ring-2 focus:ring-green-500 outline-none cursor-pointer appearance-none text-center"
                    >
                      <option value="kg">kg</option>
                      <option value="gm">gm</option>
                      <option value="pcs">pcs</option>
                      <option value="bunch">bunch</option>
                    </select>
                  </div>
                  <div className="flex-auto min-w-0">
                    <label className="md:hidden text-xs text-black mb-1 block truncate">Rate</label>
                    <div className="inline-grid items-center w-full">
                      <span className="invisible whitespace-pre col-start-1 row-start-1 py-2 px-3 text-base min-w-[3rem]">{item.rate || "Rate"}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                        className="col-start-1 row-start-1 w-full py-2 px-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-base text-black"
                      />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 text-right font-bold text-black text-sm flex items-center justify-end md:justify-end">
                  <span className="md:hidden text-xs text-black font-normal mr-2">Amount:</span>
                  ₹{getItemAmount(item).toFixed(2)}
                </div>
                <div className="md:col-span-1 flex justify-end">
                  {item.isCustom && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove custom item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddItem}
            className="mt-4 flex items-center gap-2 text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Extra Item
          </button>
        </div>

        {/* Total Summary */}
        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
          <span className="text-lg text-black font-bold">Grand Total</span>
          <span className="text-3xl font-bold text-green-700">₹{calculateTotal().toFixed(2)}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <button
            onClick={scrollToPreview}
            className="flex items-center justify-center gap-2 w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-all"
          >
            <Eye className="w-5 h-5" /> Preview
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 w-full p-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all disabled:opacity-70"
          >
            <FileDown className="w-5 h-5" /> {isGenerating ? "Generating..." : "Download PDF"}
          </button>
          <button
            onClick={handleShareWhatsApp}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 w-full p-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold rounded-xl transition-all disabled:opacity-70"
          >
            <Share2 className="w-5 h-5" /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
