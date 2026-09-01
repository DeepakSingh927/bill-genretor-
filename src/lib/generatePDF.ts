import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generatePDF(elementId: string, filename: string): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    
    // Save or return as blob
    pdf.save(filename);
    return pdf.output('blob');
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return null;
  }
}
