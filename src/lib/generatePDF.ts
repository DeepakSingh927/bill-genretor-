import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const generatePDF = async (elementId: string, filename: string): Promise<Blob | null> => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return null;

  // Create an off-screen wrapper to force desktop-like rendering of the A4 layout
  // This prevents mobile screen constraints from squishing or damaging the PDF layout
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.top = "-9999px";
  wrapper.style.left = "-9999px";
  // A4 width in pixels (approx 794px at 96 DPI)
  wrapper.style.width = "794px"; 
  wrapper.style.backgroundColor = "white";

  const clone = originalElement.cloneNode(true) as HTMLElement;
  // Remove any margin/scale that might affect the clone
  clone.style.margin = "0";
  clone.style.transform = "none";
  wrapper.appendChild(clone);
  
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794, // Force html2canvas to act like a desktop screen
    });
    
    // Cleanup the DOM immediately
    document.body.removeChild(wrapper);

    const imgData = canvas.toDataURL("image/png");
    
    // A4 width in mm
    const pdfWidth = 210;
    // Calculate height proportionally
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [210, Math.max(297, pdfHeight)], // Make page taller than A4 if needed
    });

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    
    // Save for download
    pdf.save(filename);
    
    return pdf.output("blob");
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Ensure cleanup even if error occurs
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    return null;
  }
};
