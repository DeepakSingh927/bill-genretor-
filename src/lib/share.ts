export async function shareOnWhatsApp(file: Blob, filename: string, text: string) {
  if (navigator.canShare && navigator.canShare({ files: [new File([file], filename, { type: file.type })] })) {
    try {
      await navigator.share({
        files: [new File([file], filename, { type: file.type })],
        title: "Bill",
        text: text,
      });
      return;
    } catch (error) {
      console.log("Error sharing:", error);
    }
  }
  
  // Fallback to WhatsApp URL (only text, no file attachment unfortunately)
  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}
