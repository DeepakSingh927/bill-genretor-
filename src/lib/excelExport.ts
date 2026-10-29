import * as XLSX from "xlsx";
import { SavedBill, Client } from "@/types/bill";
import { format } from "date-fns";

/**
 * 1. Export Complete Bill Register
 */
export function exportBillRegisterToExcel(bills: SavedBill[], filenamePrefix: string = "PureGreen_Bill_Register"): void {
  const rows = bills.map((bill, index) => ({
    "S.No": index + 1,
    "Bill Date": bill.date,
    "Bill Number": bill.billNumber,
    "Hotel / Client Name": bill.hotelName,
    "Contact Phone": bill.clientPhone || "—",
    "No. of Items": bill.itemCount,
    "Total Amount (₹)": Number(bill.totalAmount.toFixed(2)),
    "Status": bill.status.toUpperCase(),
  }));

  // Add summary row
  const totalAmount = bills.reduce((sum, b) => sum + (b.status === "active" ? b.totalAmount : 0), 0);
  rows.push({
    "S.No": "" as any,
    "Bill Date": "",
    "Bill Number": "",
    "Hotel / Client Name": "TOTAL (Active Bills)",
    "Contact Phone": "",
    "No. of Items": bills.filter(b => b.status === "active").reduce((sum, b) => sum + b.itemCount, 0),
    "Total Amount (₹)": Number(totalAmount.toFixed(2)),
    "Status": "",
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 14 }, // Date
    { wch: 16 }, // Bill Number
    { wch: 28 }, // Hotel Name
    { wch: 16 }, // Phone
    { wch: 14 }, // Items
    { wch: 18 }, // Total Amount
    { wch: 12 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bill Register");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
}

/**
 * 2. Export Hotel-Wise Bill History
 */
export function exportHotelHistoryToExcel(client: Client, bills: SavedBill[]): void {
  const hotelBills = bills.filter((b) => b.clientId === client.id || b.hotelName.toLowerCase() === client.hotelName.toLowerCase());

  const rows = hotelBills.map((bill, index) => ({
    "S.No": index + 1,
    "Bill Date": bill.date,
    "Bill Number": bill.billNumber,
    "No. of Items": bill.itemCount,
    "Bill Amount (₹)": Number(bill.totalAmount.toFixed(2)),
    "Status": bill.status.toUpperCase(),
  }));

  const totalAmount = hotelBills.reduce((sum, b) => sum + (b.status === "active" ? b.totalAmount : 0), 0);
  rows.push({
    "S.No": "" as any,
    "Bill Date": "",
    "Bill Number": "GRAND TOTAL",
    "No. of Items": hotelBills.filter(b => b.status === "active").reduce((sum, b) => sum + b.itemCount, 0),
    "Bill Amount (₹)": Number(totalAmount.toFixed(2)),
    "Status": "",
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 14 }, // Date
    { wch: 18 }, // Bill Number
    { wch: 14 }, // Items
    { wch: 18 }, // Amount
    { wch: 12 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Billing History");

  const sanitizedHotelName = client.hotelName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(workbook, `${sanitizedHotelName}_Billing_History_${todayStr}.xlsx`);
}

/**
 * 3. Export Detailed Itemized Breakdown
 */
export function exportDetailedItemsToExcel(bills: SavedBill[], filenamePrefix: string = "PureGreen_Itemized_Bills"): void {
  const rows: any[] = [];
  let grandTotal = 0;

  bills.forEach((bill) => {
    bill.items.forEach((item, itemIdx) => {
      rows.push({
        "Bill Number": bill.billNumber,
        "Bill Date": bill.date,
        "Hotel Name": bill.hotelName,
        "Item #": itemIdx + 1,
        "Vegetable (English)": item.name,
        "भाजी का नाम (Hindi)": item.hindiName || "",
        "Quantity": parseFloat(item.quantity) || 0,
        "Unit": item.unit || "kg",
        "Rate (₹)": parseFloat(item.rate) || 0,
        "Line Total (₹)": Number(item.amount.toFixed(2)),
        "Status": bill.status.toUpperCase(),
      });
      if (bill.status === "active") {
        grandTotal += item.amount;
      }
    });
  });

  // Grand total row
  rows.push({
    "Bill Number": "GRAND TOTAL",
    "Bill Date": "",
    "Hotel Name": "",
    "Item #": "",
    "Vegetable (English)": "",
    "भाजी का नाम (Hindi)": "",
    "Quantity": "",
    "Unit": "",
    "Rate (₹)": "",
    "Line Total (₹)": Number(grandTotal.toFixed(2)),
    "Status": "",
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 16 }, // Bill Number
    { wch: 14 }, // Date
    { wch: 26 }, // Hotel Name
    { wch: 8 },  // Item #
    { wch: 22 }, // Veg English
    { wch: 22 }, // Veg Hindi
    { wch: 12 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 12 }, // Rate
    { wch: 16 }, // Line Total
    { wch: 12 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Itemized Details");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
}
