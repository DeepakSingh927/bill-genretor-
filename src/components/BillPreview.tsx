import React from "react";
import { BillData } from "@/types/bill";
import { Leaf } from "lucide-react"; // Fallback logo

interface BillPreviewProps {
  data: BillData;
}

export const BillPreview: React.FC<BillPreviewProps> = ({ data }) => {
  const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <div
      id="bill-preview"
      className="bg-white text-black p-8 mx-auto"
      style={{
        width: "210mm",
        minHeight: "297mm", // A4 Size
        fontFamily: "'Arial', sans-serif",
      }}
    >
      <div className="border-4 border-black p-1 h-full flex flex-col">
        <div className="border-2 border-black p-4 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div className="w-1/4"></div> {/* Spacer for symmetry if needed */}
            <div className="flex-1 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="w-8 h-8" />
                <h1 className="text-2xl font-bold uppercase tracking-wider">
                  PURE GREEN <br /> HARVEST FARMS
                </h1>
              </div>
            </div>
            <div className="w-1/4 text-right text-sm font-bold">
              M. 9324097275
            </div>
          </div>

          <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-2 font-bold">
            <div>
              Bill No. ___________
            </div>
            <div>
              Date : {data.date || "___________"}
            </div>
          </div>

          <div className="font-bold text-lg mb-4 border-b-2 border-black pb-2">
            Hotel Name : <span className="underline uppercase">{data.hotelName}</span>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border-2 border-black flex-1 text-[11px] font-bold leading-tight">
            <thead>
              <tr>
                <th className="border-2 border-black px-1 py-1 w-8 text-center uppercase">NO.</th>
                <th className="border-2 border-black px-1 py-1 text-left uppercase">INGREDIENTS</th>
                <th className="border-2 border-black px-1 py-1 text-left">भाजी का नाम</th>
                <th className="border-2 border-black px-1 py-1 w-12 text-center uppercase">QTY.</th>
                <th className="border-2 border-black px-1 py-1 w-16 text-center uppercase">RATE</th>
                <th className="border-2 border-black px-1 py-1 w-20 text-center uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className="h-6">
                  <td className="border-2 border-black px-1 text-center">{index + 1}</td>
                  <td className="border-2 border-black px-1 uppercase">{item.name}</td>
                  <td className="border-2 border-black px-1 text-sm font-medium">{item.hindiName}</td>
                  <td className="border-2 border-black px-1 text-center">{item.quantity || ""}</td>
                  <td className="border-2 border-black px-1 text-center">{item.rate || ""}</td>
                  <td className="border-2 border-black px-1 text-right">
                    {(item.quantity * item.rate) || ""}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="h-8 text-sm">
                <td colSpan={5} className="border-2 border-black px-2 text-right uppercase">
                  TOTAL
                </td>
                <td className="border-2 border-black px-2 text-right">
                  {totalAmount > 0 ? totalAmount.toFixed(2) : ""}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div className="text-right mt-4 font-bold uppercase pb-2">
            For PURE GREEN HARVEST FARMS
          </div>
        </div>
      </div>
    </div>
  );
};
