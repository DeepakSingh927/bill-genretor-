export type BillItem = {
  id: string;
  name: string;
  hindiName?: string;
  quantity: string;
  unit?: string;
  rate: string;
  isCustom?: boolean;
};

export type BillData = {
  hotelName: string;
  date: string;
  items: BillItem[];
};
