import React from "react";
import { AlertTriangle, Trash2, Archive, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  actionType: "archive" | "delete" | "restore";
  billDetails?: {
    billNumber: string;
    hotelName: string;
    date: string;
    amount: number;
  };
  customMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  actionType,
  billDetails,
  customMessage,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const isDelete = actionType === "delete";
  const isArchive = actionType === "archive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between text-white ${isDelete ? "bg-red-600" : isArchive ? "bg-amber-600" : "bg-green-600"}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {isDelete ? <Trash2 className="w-6 h-6" /> : isArchive ? <Archive className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {customMessage ? (
            <p className="text-gray-700">{customMessage}</p>
          ) : (
            <p className="text-gray-700 text-sm">
              {isDelete
                ? "Are you sure you want to permanently delete this bill? This action cannot be undone."
                : isArchive
                ? "Are you sure you want to archive this bill? It will be excluded from active revenue calculations but can be restored at any time."
                : "Are you sure you want to restore this bill to active records?"}
            </p>
          )}

          {/* Mandatory bill details snapshot for confirmation */}
          {billDetails && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span>Bill Number:</span>
                <span className="font-bold text-gray-900">{billDetails.billNumber}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Hotel / Client:</span>
                <span className="font-bold text-gray-900">{billDetails.hotelName}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Bill Date:</span>
                <span className="font-bold text-gray-900">{billDetails.date}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-gray-700">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-base text-gray-900">
                  {formatCurrency(billDetails.amount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
              isDelete
                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                : isArchive
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                : "bg-green-600 hover:bg-green-700 shadow-green-200"
            }`}
          >
            {isProcessing ? "Processing..." : isDelete ? "Yes, Delete Permanently" : isArchive ? "Yes, Archive Bill" : "Yes, Restore Bill"}
          </button>
        </div>
      </div>
    </div>
  );
};
