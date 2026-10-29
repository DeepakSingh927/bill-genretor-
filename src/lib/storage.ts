import { Client, SavedBill, SavedBillItem, BillItem } from "@/types/bill";
import { getItemAmount, generateNextBillNumber, parseBillDate } from "./utils";
import { format } from "date-fns";

const CLIENTS_STORAGE_KEY = "puregreen_clients_v2";
const BILLS_STORAGE_KEY = "puregreen_bills_v2";
const MAX_SEQ_STORAGE_KEY = "puregreen_max_seq_v2";

const SAMPLE_CLIENTS: Client[] = [
  {
    id: "client-taj",
    hotelName: "The Grand Palace Hotel",
    contactPerson: "Mr. Rajesh Sharma (Head Chef)",
    phone: "9820112233",
    address: "Marine Drive, Nariman Point, Mumbai",
    notes: "Requires morning delivery before 8:00 AM",
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "client-sagar",
    hotelName: "Hotel Sagar Ratna",
    contactPerson: "Mr. Ramesh Shetty",
    phone: "9819223344",
    address: "Bandra West, Mumbai",
    notes: "Strict quality check on leafy greens",
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: "client-spice",
    hotelName: "Spice Symphony Lounge",
    contactPerson: "Chef Vikram Nair",
    phone: "9769334455",
    address: "Andheri East, Metro Station Rd, Mumbai",
    notes: "Weekly billing cycle",
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

const SAMPLE_BILLS: SavedBill[] = [
  {
    id: "bill-1001",
    billNumber: "PGH-1001",
    clientId: "client-taj",
    hotelName: "The Grand Palace Hotel",
    clientPhone: "9820112233",
    clientAddress: "Marine Drive, Nariman Point, Mumbai",
    date: format(new Date(Date.now() - 4 * 86400000), "dd-MM-yyyy"),
    status: "active",
    itemCount: 6,
    totalAmount: 3450,
    items: [
      { id: "1", name: "TOMATO", hindiName: "टमाटर", quantity: "25", unit: "kg", rate: "35", amount: 875 },
      { id: "18", name: "BIG POTATO", hindiName: "बड़ा आलू", quantity: "40", unit: "kg", rate: "28", amount: 1120 },
      { id: "19", name: "ONION", hindiName: "प्याज़", quantity: "30", unit: "kg", rate: "32", amount: 960 },
      { id: "8", name: "GREEN CHILIES", hindiName: "हरी मिर्च", quantity: "2", unit: "kg", rate: "80", amount: 160 },
      { id: "7", name: "GINGER", hindiName: "अदरक", quantity: "1.5", unit: "kg", rate: "120", amount: 180 },
      { id: "15", name: "CORINDER", hindiName: "धनिया", quantity: "5", unit: "bunch", rate: "31", amount: 155 },
    ],
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "bill-1002",
    billNumber: "PGH-1002",
    clientId: "client-sagar",
    hotelName: "Hotel Sagar Ratna",
    clientPhone: "9819223344",
    clientAddress: "Bandra West, Mumbai",
    date: format(new Date(Date.now() - 2 * 86400000), "dd-MM-yyyy"),
    status: "active",
    itemCount: 5,
    totalAmount: 2240,
    items: [
      { id: "4", name: "CARROT", hindiName: "गाजर", quantity: "15", unit: "kg", rate: "40", amount: 600 },
      { id: "2", name: "CABBAGE", hindiName: "पत्तागोभी", quantity: "20", unit: "kg", rate: "25", amount: 500 },
      { id: "3", name: "FRENCH BEANS", hindiName: "फ्रेंच बीन्स", quantity: "8", unit: "kg", rate: "70", amount: 560 },
      { id: "9", name: "CAPSICUM", hindiName: "शिमला मिर्च", quantity: "10", unit: "kg", rate: "48", amount: 480 },
      { id: "12", name: "LEMON", hindiName: "नींबू", quantity: "100", unit: "pcs", rate: "1", amount: 100 },
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "bill-1003",
    billNumber: "PGH-1003",
    clientId: "client-spice",
    hotelName: "Spice Symphony Lounge",
    clientPhone: "9769334455",
    clientAddress: "Andheri East, Metro Station Rd, Mumbai",
    date: format(new Date(), "dd-MM-yyyy"),
    status: "active",
    itemCount: 5,
    totalAmount: 2890,
    items: [
      { id: "24", name: "MASHROOM", hindiName: "मशरूम", quantity: "6", unit: "kg", rate: "140", amount: 840 },
      { id: "25", name: "BROCCOLI", hindiName: "ब्रोकोली", quantity: "5", unit: "kg", rate: "130", amount: 650 },
      { id: "26", name: "RED/YELLOW CAPSICUM", hindiName: "लाल/पीली शिमला मिर्च", quantity: "4", unit: "kg", rate: "160", amount: 640 },
      { id: "27", name: "AMERECION BABYCON", hindiName: "अमेरिकन बेबी कॉर्न", quantity: "4", unit: "kg", rate: "120", amount: 480 },
      { id: "14", name: "MINT", hindiName: "पुदीना", quantity: "10", unit: "bunch", rate: "28", amount: 280 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class StorageService {
  private isBrowser = typeof window !== "undefined";

  constructor() {
    if (this.isBrowser) {
      this.initLocalData();
      this.syncFromBackend();
    }
  }

  private initLocalData() {
    if (!this.isBrowser) return;

    try {
      const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (!storedClients) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(SAMPLE_CLIENTS));
      }

      const storedBills = localStorage.getItem(BILLS_STORAGE_KEY);
      if (!storedBills) {
        localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(SAMPLE_BILLS));
      }

      const storedMaxSeq = localStorage.getItem(MAX_SEQ_STORAGE_KEY);
      if (!storedMaxSeq) {
        localStorage.setItem(MAX_SEQ_STORAGE_KEY, "1003");
      }
    } catch (e) {
      console.error("Error initializing storage:", e);
    }
  }

  public async syncFromBackend(): Promise<{ clients: Client[]; bills: SavedBill[] } | null> {
    try {
      const res = await fetch("/api/records");
      if (res.ok) {
        const data = await res.json();
        if (data.clients && Array.isArray(data.clients)) {
          localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(data.clients));
        }
        if (data.bills && Array.isArray(data.bills)) {
          localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(data.bills));
        }
        if (data.maxSeq) {
          localStorage.setItem(MAX_SEQ_STORAGE_KEY, String(data.maxSeq));
        }
        return { clients: data.clients || [], bills: data.bills || [] };
      }
    } catch (e) {
      console.warn("Could not sync from cloud database:", e);
    }
    return null;
  }

  private async syncToBackend(clients: Client[], bills: SavedBill[], maxSeq: number) {
    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients, bills, maxSeq }),
      });
    } catch {
      // Graceful offline fallback
    }
  }

  // --- CLIENTS ---

  public getClients(): Client[] {
    if (!this.isBrowser) return SAMPLE_CLIENTS;
    try {
      const data = localStorage.getItem(CLIENTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  public getClientByName(name: string): Client | undefined {
    const clean = name.trim().toLowerCase();
    return this.getClients().find((c) => c.hotelName.trim().toLowerCase() === clean);
  }

  public saveClient(data: {
    hotelName: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): { client: Client; isDuplicateWarning?: boolean } {
    const clients = this.getClients();
    const cleanName = data.hotelName.trim();

    // Check duplicate
    const existing = clients.find(
      (c) => c.hotelName.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      if (!existing.isActive) {
        // Reactivate if inactive
        existing.isActive = true;
        existing.updatedAt = new Date().toISOString();
        if (data.contactPerson) existing.contactPerson = data.contactPerson;
        if (data.phone) existing.phone = data.phone;
        if (data.address) existing.address = data.address;
        if (data.notes) existing.notes = data.notes;
        this.saveClientsList(clients);
        return { client: existing };
      }
      return { client: existing, isDuplicateWarning: true };
    }

    const newClient: Client = {
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      hotelName: cleanName,
      contactPerson: data.contactPerson?.trim() || "",
      phone: data.phone?.trim() || "",
      address: data.address?.trim() || "",
      notes: data.notes?.trim() || "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clients.unshift(newClient);
    this.saveClientsList(clients);
    return { client: newClient };
  }

  public updateClient(id: string, updates: Partial<Client>): Client | null {
    const clients = this.getClients();
    const index = clients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    clients[index] = {
      ...clients[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveClientsList(clients);
    return clients[index];
  }

  public toggleClientStatus(id: string): Client | null {
    const clients = this.getClients();
    const client = clients.find((c) => c.id === id);
    if (!client) return null;

    client.isActive = !client.isActive;
    client.updatedAt = new Date().toISOString();
    this.saveClientsList(clients);
    return client;
  }

  private saveClientsList(clients: Client[]) {
    if (!this.isBrowser) return;
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    this.syncToBackend(clients, this.getBills(), this.getMaxSeq());
  }

  // --- BILLS ---

  public getBills(): SavedBill[] {
    if (!this.isBrowser) return SAMPLE_BILLS;
    try {
      const data = localStorage.getItem(BILLS_STORAGE_KEY);
      const bills: SavedBill[] = data ? JSON.parse(data) : [];
      // Sort newest first by creation timestamp or parsed bill date
      return bills.sort((a, b) => {
        const dateA = new Date(a.createdAt || parseBillDate(a.date)).getTime();
        const dateB = new Date(b.createdAt || parseBillDate(b.date)).getTime();
        return dateB - dateA;
      });
    } catch {
      return [];
    }
  }

  public getBillById(id: string): SavedBill | undefined {
    return this.getBills().find((b) => b.id === id);
  }

  public getMaxSeq(): number {
    if (!this.isBrowser) return 1003;
    const stored = localStorage.getItem(MAX_SEQ_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 1003;
  }

  public getNextBillNumber(): string {
    const bills = this.getBills();
    const maxSeq = this.getMaxSeq();
    return generateNextBillNumber(bills, maxSeq);
  }

  public saveBill(payload: {
    billNumber?: string;
    clientId?: string;
    hotelName: string;
    clientPhone?: string;
    clientAddress?: string;
    date: string;
    items: BillItem[];
    notes?: string;
  }): SavedBill {
    const bills = this.getBills();
    const clients = this.getClients();

    // Auto-associate or create client if not exists
    let client = clients.find(
      (c) =>
        (payload.clientId && c.id === payload.clientId) ||
        c.hotelName.trim().toLowerCase() === payload.hotelName.trim().toLowerCase()
    );

    if (!client) {
      const res = this.saveClient({
        hotelName: payload.hotelName,
        phone: payload.clientPhone,
        address: payload.clientAddress,
      });
      client = res.client;
    }

    // Determine unique bill number
    const billNumber = payload.billNumber?.trim() || this.getNextBillNumber();

    // Filter only items with quantity or rate entered, calculate amount accurately
    const validItems: SavedBillItem[] = payload.items
      .filter((i) => (parseFloat(i.quantity) > 0 || parseFloat(i.rate) > 0) && i.name.trim() !== "")
      .map((item) => {
        const amt = getItemAmount(item);
        return {
          id: item.id || Date.now().toString(),
          name: item.name.trim(),
          hindiName: item.hindiName || "",
          quantity: item.quantity,
          unit: item.unit || "kg",
          rate: item.rate,
          amount: amt,
          isCustom: item.isCustom,
        };
      });

    const totalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);

    const newBill: SavedBill = {
      id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      billNumber,
      clientId: client.id,
      hotelName: client.hotelName,
      clientPhone: payload.clientPhone || client.phone,
      clientAddress: payload.clientAddress || client.address,
      date: payload.date || format(new Date(), "dd-MM-yyyy"),
      items: validItems,
      totalAmount,
      itemCount: validItems.length,
      status: "active",
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update max sequence if higher
    const match = billNumber.match(/\d+/g);
    if (match) {
      const num = parseInt(match[match.length - 1], 10);
      const currentMax = this.getMaxSeq();
      if (!isNaN(num) && num > currentMax) {
        if (this.isBrowser) {
          localStorage.setItem(MAX_SEQ_STORAGE_KEY, num.toString());
        }
      }
    }

    bills.unshift(newBill);
    this.saveBillsList(bills);

    return newBill;
  }

  public archiveBill(id: string): SavedBill | null {
    const bills = this.getBills();
    const bill = bills.find((b) => b.id === id);
    if (!bill) return null;

    bill.status = "archived";
    bill.updatedAt = new Date().toISOString();
    this.saveBillsList(bills);
    return bill;
  }

  public restoreBill(id: string): SavedBill | null {
    const bills = this.getBills();
    const bill = bills.find((b) => b.id === id);
    if (!bill) return null;

    bill.status = "active";
    bill.updatedAt = new Date().toISOString();
    this.saveBillsList(bills);
    return bill;
  }

  public deleteBill(id: string): boolean {
    const bills = this.getBills();
    const filtered = bills.filter((b) => b.id !== id);
    if (filtered.length === bills.length) return false;

    this.saveBillsList(filtered);
    return true;
  }

  public async deleteBillsByIds(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return false;
    const bills = this.getBills();
    const set = new Set(ids);
    const filtered = bills.filter((b) => !set.has(b.id));

    this.saveBillsList(filtered);

    try {
      await fetch("/api/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billIds: ids }),
      });
    } catch (e) {
      console.warn("Could not delete from cloud database:", e);
    }
    return true;
  }

  private saveBillsList(bills: SavedBill[]) {
    if (!this.isBrowser) return;
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
    this.syncToBackend(this.getClients(), bills, this.getMaxSeq());
  }

  // --- BACKUP & RESTORE ---

  public exportBackup(): string {
    const backup = {
      app: "Pure Green Harvest Farms Bill Generator",
      version: "2.0",
      exportDate: new Date().toISOString(),
      clients: this.getClients(),
      bills: this.getBills(),
      maxSeq: this.getMaxSeq(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public importBackup(jsonString: string): {
    success: boolean;
    message: string;
    clientsCount?: number;
    billsCount?: number;
  } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.clients || !parsed.bills) {
        return { success: false, message: "Invalid backup file format. Missing clients or bills." };
      }

      if (this.isBrowser) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(parsed.clients));
        localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(parsed.bills));
        if (parsed.maxSeq) {
          localStorage.setItem(MAX_SEQ_STORAGE_KEY, parsed.maxSeq.toString());
        }
        this.syncToBackend(parsed.clients, parsed.bills, parsed.maxSeq || 1000);
      }

      return {
        success: true,
        message: "Database restored successfully!",
        clientsCount: parsed.clients.length,
        billsCount: parsed.bills.length,
      };
    } catch (err: any) {
      return { success: false, message: `Failed to import: ${err.message}` };
    }
  }

  // Reset to initial sample data
  public resetToSample(): void {
    if (!this.isBrowser) return;
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(SAMPLE_CLIENTS));
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(SAMPLE_BILLS));
    localStorage.setItem(MAX_SEQ_STORAGE_KEY, "1003");
    this.syncToBackend(SAMPLE_CLIENTS, SAMPLE_BILLS, 1003);
  }
}

export const storage = new StorageService();
