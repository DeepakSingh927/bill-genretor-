"use client";

import React, { useState } from "react";
import { BillForm } from "@/components/BillForm";
import { BillPreview } from "@/components/BillPreview";
import { BillData } from "@/types/bill";
import { format } from "date-fns";
import { INITIAL_ITEMS } from "@/lib/constants";

export default function Home() {
  const [billData, setBillData] = useState<BillData>({
    hotelName: "",
    date: format(new Date(), "dd-MM-yyyy"),
    items: INITIAL_ITEMS,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Vegetable Bill Generator
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Create, download, and share professional bills instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-5">
            <div className="sticky top-8">
              <BillForm onPreviewDataChange={setBillData} />
            </div>
          </div>

          {/* Preview Section */}
          <div id="preview-section" className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-8 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Bill Preview</h2>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">A4 Format</span>
            </div>
            
            {/* Wrapper to scale down the A4 preview if needed on smaller screens, but keep the actual dimensions for PDF generation */}
            <div className="w-full overflow-hidden flex justify-center bg-gray-100 rounded-lg p-4">
               {/* 
                 We render the BillPreview in its full A4 dimensions so html2canvas captures it perfectly.
                 We use CSS transform to scale it down visually for preview without altering actual DOM size.
               */}
               <div className="transform scale-[0.45] sm:scale-[0.6] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] origin-top h-[600px] sm:h-[800px] lg:h-[900px] w-full flex justify-center">
                 <BillPreview data={billData} />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
