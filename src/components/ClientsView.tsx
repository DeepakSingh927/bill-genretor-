"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Search,
  Plus,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Client, SavedBill } from "@/types/bill";
import { formatCurrency, parseBillDate } from "@/lib/utils";
import { storage } from "@/lib/storage";
import { AddClientModal } from "./AddClientModal";

interface ClientsViewProps {
  clients: Client[];
  bills: SavedBill[];
  onRefresh: () => void;
  onOpenHotelHistory: (client: Client) => void;
  onCreateBillForHotel: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  bills,
  onRefresh,
  onOpenHotelHistory,
  onCreateBillForHotel,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute metrics per client
  const clientMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      { totalBills: number; totalAmount: number; latestDate: string | null; thisMonthAmount: number }
    >();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    clients.forEach((c) => {
      const hotelBills = bills.filter(
        (b) =>
          b.clientId === c.id ||
          b.hotelName.trim().toLowerCase() === c.hotelName.trim().toLowerCase()
      );

      const activeBills = hotelBills.filter((b) => b.status === "active");

      const totalAmount = activeBills.reduce((sum, b) => sum + b.totalAmount, 0);

      const thisMonthAmount = activeBills
        .filter((b) => {
          const d = parseBillDate(b.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, b) => sum + b.totalAmount, 0);

      // Latest date
      let latestDate: string | null = null;
      if (hotelBills.length > 0) {
        const sorted = [...hotelBills].sort((a, b) => {
          return new Date(b.createdAt || parseBillDate(b.date)).getTime() -
                 new Date(a.createdAt || parseBillDate(a.date)).getTime();
        });
        latestDate = sorted[0].date;
      }

      map.set(c.id, {
        totalBills: activeBills.length,
        totalAmount,
        latestDate,
        thisMonthAmount,
      });
    });

    return map;
  }, [clients, bills]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = c.hotelName.toLowerCase().includes(q);
        const matchesContact = c.contactPerson?.toLowerCase().includes(q) || false;
        const matchesPhone = c.phone?.toLowerCase().includes(q) || false;
        const matchesAddr = c.address?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesContact && !matchesPhone && !matchesAddr) return false;
      }

      return true;
    });
  }, [clients, statusFilter, searchQuery]);

  const handleToggleStatus = (client: Client) => {
    storage.toggleClientStatus(client.id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Client / Hotel Database
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-1">Hotels &amp; Clients Management</h2>
          <p className="text-xs text-gray-500">
            Maintain permanent client records, contact profiles, and billing histories
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingClient(null);
            setIsAddModalOpen(true);
          }}
          className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-green-200 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Hotel
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-md border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search hotels, contacts, phone numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="font-bold text-gray-500">Status:</span>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === "active" ? "bg-white text-green-800 shadow-xs" : "text-gray-600"
              }`}
            >
              Active ({clients.filter((c) => c.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === "inactive" ? "bg-white text-gray-800 shadow-xs" : "text-gray-600"
              }`}
            >
              Inactive ({clients.filter((c) => !c.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === "all" ? "bg-white text-gray-800 shadow-xs" : "text-gray-600"
              }`}
            >
              All ({clients.length})
            </button>
          </div>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const metrics = clientMetricsMap.get(client.id) || {
              totalBills: 0,
              totalAmount: 0,
              latestDate: null,
              thisMonthAmount: 0,
            };

            return (
              <div
                key={client.id}
                className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:border-green-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Status & Menu Header */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {client.isActive ? "Active" : "Inactive"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(client);
                          setIsAddModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit client details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(client)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          client.isActive
                            ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                        }`}
                        title={client.isActive ? "Deactivate Hotel" : "Activate Hotel"}
                      >
                        {client.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Hotel Info */}
                  <div
                    onClick={() => onOpenHotelHistory(client)}
                    className="cursor-pointer group-hover:text-green-700 transition-colors"
                  >
                    <h3 className="text-xl font-black text-gray-900">{client.hotelName}</h3>
                    {client.contactPerson && (
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        {client.contactPerson}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-mono">{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Box */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Total Bills
                      </span>
                      <div className="font-black text-sm text-gray-900">
                        {metrics.totalBills} bills
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Lifetime Amount
                      </span>
                      <div className="font-black text-sm text-emerald-800">
                        {formatCurrency(metrics.totalAmount)}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70">
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        This Month
                      </span>
                      <div className="font-bold text-xs text-gray-900">
                        {formatCurrency(metrics.thisMonthAmount)}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70">
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Latest Bill
                      </span>
                      <div className="font-bold text-xs text-gray-900">
                        {metrics.latestDate || "None"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onOpenHotelHistory(client)}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View History
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateBillForHotel(client)}
                    className="py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Bill
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-3xl p-8 border border-gray-100">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No hotels found</h3>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? `No matches for "${searchQuery}"` : "Get started by adding your first hotel"}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingClient(null);
                setIsAddModalOpen(true);
              }}
              className="mt-4 px-5 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              + Add New Hotel
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      <AddClientModal
        isOpen={isAddModalOpen}
        initialClient={editingClient}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingClient(null);
        }}
        onClientSaved={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
