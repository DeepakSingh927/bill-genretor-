import React, { useState, useEffect } from "react";
import { X, Building2, Phone, MapPin, User, FileText, AlertCircle } from "lucide-react";
import { Client } from "@/types/bill";
import { storage } from "@/lib/storage";

interface AddClientModalProps {
  isOpen: boolean;
  initialClient?: Client | null;
  onClose: () => void;
  onClientSaved: (client: Client) => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  initialClient,
  onClose,
  onClientSaved,
}) => {
  const [hotelName, setHotelName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (initialClient) {
      setHotelName(initialClient.hotelName);
      setContactPerson(initialClient.contactPerson || "");
      setPhone(initialClient.phone || "");
      setAddress(initialClient.address || "");
      setNotes(initialClient.notes || "");
    } else {
      setHotelName("");
      setContactPerson("");
      setPhone("");
      setAddress("");
      setNotes("");
    }
    setError(null);
    setDuplicateWarning(null);
  }, [initialClient, isOpen]);

  if (!isOpen) return null;

  // Real-time duplicate check
  const handleHotelNameChange = (val: string) => {
    setHotelName(val);
    setError(null);
    if (!val.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const clean = val.trim().toLowerCase();
    const existing = storage.getClients().find(
      (c) => c.hotelName.trim().toLowerCase() === clean && (!initialClient || c.id !== initialClient.id)
    );
    if (existing) {
      setDuplicateWarning(`A hotel named "${existing.hotelName}" is already registered.`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = hotelName.trim();
    if (!trimmedName) {
      setError("Hotel name is required.");
      return;
    }

    if (initialClient) {
      // Update
      const updated = storage.updateClient(initialClient.id, {
        hotelName: trimmedName,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      if (updated) {
        onClientSaved(updated);
        onClose();
      }
    } else {
      // Add new
      const result = storage.saveClient({
        hotelName: trimmedName,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });

      if (result.isDuplicateWarning) {
        setError(`A hotel named "${result.client.hotelName}" already exists in records. Please use a distinct name.`);
        return;
      }

      onClientSaved(result.client);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {initialClient ? "Edit Hotel / Client" : "Add New Hotel / Client"}
              </h3>
              <p className="text-green-100 text-xs">
                Maintain permanent records and bill history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Hotel / Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. Grand Hyatt Mumbai"
                value={hotelName}
                onChange={(e) => handleHotelNameChange(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Contact Person
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Chef Sanjay"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="tel"
                  placeholder="e.g. 9820123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Delivery Address
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. Bandra Kurla Complex, Mumbai"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Notes / Special Instructions
            </label>
            <div className="relative">
              <FileText className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <textarea
                placeholder="e.g. Delivery timings, preferred vegetable quality, payment cycle..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 outline-none transition-all resize-none text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md shadow-green-200 transition-all"
            >
              {initialClient ? "Update Hotel" : "Save Hotel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
