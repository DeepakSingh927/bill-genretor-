export type BillItem = {
  id: string;
  name: string;
  hindiName?: string;
  quantity: number;
  rate: number;
};

export type BillData = {
  hotelName: string;
  date: string;
  items: BillItem[];
};
