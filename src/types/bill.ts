export interface BillItem {
  id: string;
  name: string;
  hindiName?: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount?: number;
  isCustom?: boolean;
}

export interface BillData {
  id?: string;
  billNumber?: string;
  hotelName: string;
  clientId?: string;
  clientPhone?: string;
  clientAddress?: string;
  date: string;
  items: BillItem[];
  totalAmount?: number;
  notes?: string;
}

export interface Client {
  id: string;
  hotelName: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedBillItem {
  id: string;
  name: string;
  hindiName?: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount: number;
  isCustom?: boolean;
}

export interface SavedBill {
  id: string;
  billNumber: string;
  clientId?: string;
  hotelName: string;
  clientPhone?: string;
  clientAddress?: string;
  date: string; // DD-MM-YYYY format or ISO
  items: SavedBillItem[];
  totalAmount: number;
  itemCount: number;
  status: 'active' | 'archived' | 'cancelled';
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface HotelBillingSummary {
  clientId: string;
  hotelName: string;
  totalBills: number;
  totalAmount: number;
  latestBillDate: string | null;
  thisMonthAmount: number;
}
