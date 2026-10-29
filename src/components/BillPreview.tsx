import React from "react";
import { BillData } from "@/types/bill";
import { getItemAmount, numberToWordsINR } from "@/lib/utils";

interface BillPreviewProps {
  data: BillData;
  customId?: string;
}

export const BillPreview: React.FC<BillPreviewProps> = ({ data, customId = "bill-preview" }) => {
  // Only display delivered items (where quantity > 0 and rate > 0)
  const deliveredItems = (data.items || []).filter((item) => {
    const qty = parseFloat(item.quantity);
    const rate = parseFloat(item.rate);
    return !isNaN(qty) && qty > 0 && !isNaN(rate) && rate > 0 && (item.name || "").trim() !== "";
  });

  const totalAmount = deliveredItems.reduce((sum, item) => sum + getItemAmount(item), 0);

  const totalQuantity = deliveredItems.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    return sum + q;
  }, 0);

  return (
    <div
      id={customId}
      className="bg-white text-black p-6 sm:p-8 mx-auto"
      style={{
        width: "210mm",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Top Title */}
      <div className="text-center mb-2">
        <h2 className="text-lg font-black uppercase tracking-widest text-black">
          Tax Invoice
        </h2>
      </div>

      {/* Main Single Border Box */}
      <div className="border-2 border-black bg-white">
        {/* Header: Company Logo & Contact */}
        <div className="p-4 flex items-center justify-between border-b-2 border-black bg-white">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Pure Green Harvest Farms"
              className="h-16 w-auto object-contain"
              style={{ maxHeight: "70px", width: "auto" }}
            />
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black text-black tracking-tight leading-tight uppercase">
              Pure Green Harvest Farms
            </h1>
            <div className="text-xs font-bold text-black mt-1">
              Phone no.: <span className="font-extrabold tracking-wide">9324997275 / 9152552594</span>
            </div>
            <div className="text-[11px] font-medium text-gray-600">
              Fresh Vegetable Wholesaler &amp; Farm Supplier
            </div>
          </div>
        </div>

        {/* 3-Section Metadata Bar */}
        <div className="grid grid-cols-12 border-b-2 border-black text-xs">
          {/* 1. Bill To */}
          <div className="col-span-5 p-2.5 border-r-2 border-black">
            <div className="font-black text-black border-b border-black pb-1 mb-1.5 uppercase tracking-wider text-[11px]">
              Bill To
            </div>
            <div className="font-black text-sm text-black uppercase tracking-wide">
              {data.hotelName || "Customer / Hotel Name"}
            </div>
            {data.clientPhone && (
              <div className="text-xs font-semibold text-black mt-0.5">
                Phone: <span className="font-mono">{data.clientPhone}</span>
              </div>
            )}
            {data.clientAddress && (
              <div className="text-xs font-medium text-gray-700 mt-0.5 line-clamp-2">
                Address: {data.clientAddress}
              </div>
            )}
          </div>

          {/* 2. Transportation / Delivery Details */}
          <div className="col-span-4 p-2.5 border-r-2 border-black">
            <div className="font-black text-black border-b border-black pb-1 mb-1.5 uppercase tracking-wider text-[11px]">
              Transportation Details
            </div>
            <div className="text-xs text-black font-semibold">
              Vehicle: <span className="font-normal">Farm Fresh Delivery</span>
            </div>
            <div className="text-xs text-black font-semibold mt-0.5">
              Schedule: <span className="font-normal">Morning Harvest Drop</span>
            </div>
            {data.notes && (
              <div className="text-xs text-gray-700 mt-0.5 truncate">
                Notes: {data.notes}
              </div>
            )}
          </div>

          {/* 3. Invoice Details */}
          <div className="col-span-3 p-2.5">
            <div className="font-black text-black border-b border-black pb-1 mb-1.5 uppercase tracking-wider text-[11px] text-right">
              Invoice Details
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-black">
              <span>Invoice No.:</span>
              <span className="font-mono font-black">{data.billNumber || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-black mt-1">
              <span>Date:</span>
              <span className="font-mono">{data.date || "—"}</span>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <table className="w-full border-collapse text-xs font-bold border-b-2 border-black">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50/60 text-[11px] uppercase tracking-wider">
              <th className="border-r-2 border-black px-2 py-2 w-8 text-center">#</th>
              <th className="border-r-2 border-black px-3 py-2 text-left">Item Name</th>
              <th className="border-r-2 border-black px-3 py-2 text-left">भाजी का नाम</th>
              <th className="border-r-2 border-black px-2 py-2 w-20 text-center">Quantity</th>
              <th className="border-r-2 border-black px-2 py-2 w-16 text-center">Unit</th>
              <th className="border-r-2 border-black px-2 py-2 w-24 text-center">Price / Unit</th>
              <th className="px-3 py-2 w-28 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {deliveredItems.length > 0 ? (
              deliveredItems.map((item, index) => (
                <tr key={item.id || index} className="border-b border-gray-300">
                  <td className="border-r-2 border-black px-2 py-2 text-center text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="border-r-2 border-black px-3 py-2 uppercase font-black text-black">
                    {item.name}
                  </td>
                  <td className="border-r-2 border-black px-3 py-2 text-sm font-semibold text-gray-800">
                    {item.hindiName || "—"}
                  </td>
                  <td className="border-r-2 border-black px-2 py-2 text-center font-black text-black font-mono">
                    {item.quantity}
                  </td>
                  <td className="border-r-2 border-black px-2 py-2 text-center text-black uppercase font-semibold">
                    {item.unit || "Kg"}
                  </td>
                  <td className="border-r-2 border-black px-2 py-2 text-center text-black font-mono">
                    Rs {item.rate}
                  </td>
                  <td className="px-3 py-2 text-right font-black text-black font-mono text-sm">
                    Rs {getItemAmount(item) > 0 ? getItemAmount(item).toFixed(2) : "0.00"}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="h-16">
                <td colSpan={7} className="px-4 text-center text-gray-400 font-normal italic">
                  No delivered items selected. Enter quantities and rates to populate invoice items.
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="border-t-2 border-black bg-gray-50/80 font-black text-xs">
              <td colSpan={3} className="border-r-2 border-black px-3 py-2 uppercase tracking-wider text-black">
                Total
              </td>
              <td className="border-r-2 border-black px-2 py-2 text-center text-black font-mono font-black">
                {totalQuantity > 0 ? totalQuantity : ""}
              </td>
              <td className="border-r-2 border-black px-2 py-2"></td>
              <td className="border-r-2 border-black px-2 py-2"></td>
              <td className="px-3 py-2 text-right text-sm font-black text-black font-mono">
                Rs {totalAmount > 0 ? totalAmount.toFixed(2) : "0.00"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Invoice Amount in Words & Summary Section */}
        <div className="grid grid-cols-12 border-b-2 border-black">
          {/* Left Column: Words */}
          <div className="col-span-7 p-3.5 border-r-2 border-black flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-black border-b border-black pb-1 mb-2">
                Invoice Amount In Words
              </div>
              <div className="text-xs font-bold text-black italic py-1 leading-relaxed">
                {numberToWordsINR(totalAmount)}
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-gray-200 text-[10px] text-gray-500 font-semibold">
              Notice: All produce delivered is fresh grade-A harvest. Please verify quantity upon delivery.
            </div>
          </div>

          {/* Right Column: Amounts (without current balance) */}
          <div className="col-span-5 p-3.5 space-y-2 text-xs font-bold text-black">
            <div className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
              Amounts
            </div>

            <div className="flex justify-between items-center py-1">
              <span>Sub Total</span>
              <span className="font-mono text-sm">Rs {totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-t-2 border-black text-sm font-black">
              <span>Total Amount</span>
              <span className="font-mono text-base font-black">Rs {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Declaration & Signature with Rubber Stamp & Deepak Singh Signature */}
        <div className="grid grid-cols-12">
          {/* Left: Declaration Notes (Replacing Payment Details) */}
          <div className="col-span-6 p-3.5 border-r-2 border-black flex flex-col justify-between">
            <div className="text-xs space-y-1.5 text-black">
              <div className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-1.5">
                Declaration
              </div>
              <p className="text-[11px] font-semibold text-gray-700 leading-relaxed">
                1. Certified that the particulars given above are true and correct.
              </p>
              <p className="text-[11px] font-semibold text-gray-700 leading-relaxed">
                2. Goods once delivered in fresh and good condition cannot be returned.
              </p>
              <p className="text-[11px] font-semibold text-gray-700 leading-relaxed">
                3. Payment is due as per agreed hotel billing cycle.
              </p>
            </div>
            <div className="text-[10px] text-gray-600 font-bold mt-3 pt-2 border-t border-gray-200">
              Pure Green Harvest Farms • Fresh Farm Produce Wholesale
            </div>
          </div>

          {/* Right: Stamp & Deepak Singh Signature */}
          <div className="col-span-6 p-3.5 flex flex-col justify-between text-right relative overflow-hidden">
            <div className="text-xs font-bold text-black">
              For: <span className="font-black uppercase">Pure Green Harvest Farms</span>
            </div>

            {/* Signature & Stamp Area */}
            <div className="relative py-2 min-h-[75px] flex items-center justify-end">
              {/* Authentic Rubber Stamp */}
              <div className="absolute right-14 top-0 pointer-events-none transform -rotate-12 opacity-85 select-none">
                <div className="w-24 h-24 rounded-full border-2 border-blue-800 border-dashed p-1 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border border-blue-800 flex flex-col items-center justify-center text-center p-1 bg-white/40">
                    <div className="text-[7.5px] font-black text-blue-900 leading-tight tracking-wider uppercase">
                      Pure Green
                    </div>
                    <div className="text-[7px] font-extrabold text-blue-800 leading-tight tracking-wider uppercase">
                      Harvest Farms
                    </div>
                    <div className="text-[6.5px] font-bold text-blue-700 tracking-widest my-0.5">
                      ★ MUMBAI ★
                    </div>
                    <div className="text-[6.5px] font-black text-blue-900 border-t border-blue-800/80 pt-0.5 tracking-tight uppercase">
                      Authorized Sign
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Deepak Singh Signature */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/signature.png"
                alt="Deepak Singh Signature"
                className="h-16 w-auto object-contain relative z-10"
                style={{ maxHeight: "65px", width: "auto" }}
              />
            </div>

            <div>
              <div className="text-xs font-bold text-black">Deepak Singh</div>
              <div className="text-[11px] font-black uppercase tracking-wider text-black border-t border-black pt-1 mt-0.5">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
