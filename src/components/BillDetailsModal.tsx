import React, { useState } from "react";
import { X, FileDown, Share2, Archive, RotateCcw, Trash2, Calendar, Building2, Phone, MapPin, CheckCircle, Clock } from "lucide-react";
import { SavedBill } from "@/types/bill";
import { formatCurrency } from "@/lib/utils";
import { generatePDF } from "@/lib/generatePDF";
import { shareOnWhatsApp } from "@/lib/share";
import { BillPreview } from "./BillPreview";

interface BillDetailsModalProps {
  bill: SavedBill | null;
  isOpen: boolean;
  onClose: () => void;
  onArchive: (bill: SavedBill) => void;
  onRestore: (bill: SavedBill) => void;
  onDelete: (bill: SavedBill) => void;
}

export const BillDetailsModal: React.FC<BillDetailsModalProps> = ({
  bill,
  isOpen,
  onClose,
  onArchive,
  onRestore,
  onDelete,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "pdf_preview">("details");

  if (!isOpen || !bill) return null;

  const pdfFilename = `${bill.hotelName.replace(/\s+/g, "_")}_${bill.billNumber}_${bill.date}.pdf`;
  const previewCustomId = `bill-details-snapshot-${bill.id}`;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    await generatePDF(previewCustomId, pdfFilename);
    setIsGenerating(false);
  };

  const handleShareWhatsApp = async () => {
    setIsGenerating(true);
    const blob = await generatePDF(previewCustomId, pdfFilename, { download: false });
    setIsGenerating(false);

    if (blob) {
      const text = `Bill from PURE GREEN HARVEST FARMS\nBill No: ${bill.billNumber}\nHotel: ${bill.hotelName}\nDate: ${bill.date}\nTotal Amount: ₹${bill.totalAmount.toFixed(2)}`;
      await shareOnWhatsApp(blob, pdfFilename, text);
    }
  };

  // Prepare BillData object for BillPreview rendering
  const previewData = {
    billNumber: bill.billNumber,
    hotelName: bill.hotelName,
    date: bill.date,
    items: bill.items.map((i) => ({
      id: i.id,
      name: i.name,
      hindiName: i.hindiName,
      quantity: i.quantity,
      unit: i.unit,
      rate: i.rate,
      amount: i.amount,
    })),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-700 p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {bill.billNumber}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  bill.status === "active"
                    ? "bg-green-400/30 text-green-100 border border-green-300/40"
                    : "bg-amber-400/30 text-amber-100 border border-amber-300/40"
                }`}
              >
                {bill.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-2">{bill.hotelName}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-green-100 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date: {bill.date}
              </span>
              {bill.clientPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {bill.clientPhone}
                </span>
              )}
              {bill.createdAt && (
                <span className="flex items-center gap-1 text-green-200/80">
                  <Clock className="w-3.5 h-3.5" /> Created: {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="bg-gray-100 px-6 py-2.5 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "details"
                  ? "bg-white text-green-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Table View ({bill.items.length} items)
            </button>
            <button
              onClick={() => setActiveTab("pdf_preview")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "pdf_preview"
                  ? "bg-white text-green-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              A4 Bill Sheet Preview
            </button>
          </div>

          <div className="text-sm font-bold text-gray-800">
            Total: <span className="text-green-700 text-base">{formatCurrency(bill.totalAmount)}</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {activeTab === "details" ? (
            <div className="space-y-6">
              {/* Hotel Metadata Card */}
              {bill.clientAddress && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-start gap-3 text-sm">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-700">Delivery Address: </span>
                    <span className="text-gray-600">{bill.clientAddress}</span>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Vegetable / Ingredient</th>
                      <th className="py-3 px-4">भाजी का नाम</th>
                      <th className="py-3 px-4 text-center">Quantity</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4 text-right">Line Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {bill.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-gray-400 text-xs">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-gray-900 uppercase">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-normal">
                          {item.hindiName || "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-800">
                          {item.quantity} {item.unit || "kg"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          ₹{item.rate}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50/70 border-t-2 border-green-200 font-bold text-gray-900">
                      <td colSpan={4} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-green-900">
                        Grand Total Amount ({bill.itemCount} items)
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-right text-lg text-green-800 font-extrabold">
                        {formatCurrency(bill.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes snapshot if any */}
              {bill.notes && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-600">
                  <span className="font-bold text-gray-700">Notes: </span>
                  {bill.notes}
                </div>
              )}
            </div>
          ) : (
            /* Visual A4 Sheet Preview */
            <div className="flex justify-center bg-gray-200/80 p-4 rounded-2xl overflow-x-auto">
              <div className="transform scale-[0.7] sm:scale-[0.85] origin-top">
                <BillPreview data={previewData} customId={previewCustomId} />
              </div>
            </div>
          )}

          {/* Off-screen BillPreview for instant PDF rendering when tab is details */}
          <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none">
            <BillPreview data={previewData} customId={previewCustomId} />
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {bill.status === "active" ? (
              <button
                type="button"
                onClick={() => onArchive(bill)}
                className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1.5"
                title="Archive bill"
              >
                <Archive className="w-4 h-4" /> Archive
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRestore(bill)}
                className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center gap-1.5"
                title="Restore bill to active"
              >
                <RotateCcw className="w-4 h-4" /> Restore Bill
              </button>
            )}

            <button
              type="button"
              onClick={() => onDelete(bill)}
              className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5"
              title="Delete bill"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-4 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md shadow-green-200 transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              {isGenerating ? "Preparing PDF..." : "Download PDF"}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isGenerating}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#128C7E] rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
