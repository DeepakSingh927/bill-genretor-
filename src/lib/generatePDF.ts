import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export const generatePDF = async (
  elementId: string,
  filename: string,
  options: { download?: boolean } = { download: true }
): Promise<Blob | null> => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    console.error(`Element #${elementId} not found for PDF generation`);
    return null;
  }

  // Create an off-screen wrapper to force desktop-like rendering of the A4 layout
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.top = "-9999px";
  wrapper.style.left = "-9999px";
  wrapper.style.width = "794px"; // A4 width at 96 DPI
  wrapper.style.backgroundColor = "white";

  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  clone.style.transform = "none";
  wrapper.appendChild(clone);

  document.body.appendChild(wrapper);

  try {
    // Wait for all images (like /logo.png) in the cloned element to be fully loaded
    const images = Array.from(clone.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 500); // 500ms safety timeout
        });
      })
    );

    const canvas = await html2canvas(clone, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    // Cleanup the DOM immediately
    document.body.removeChild(wrapper);

    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [210, Math.ceil(pdfHeight)],
    });

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    if (options.download !== false) {
      pdf.save(filename);
    }

    return pdf.output("blob");
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    return null;
  }
};
