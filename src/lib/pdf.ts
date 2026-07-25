"use client";

/**
 * Render a DOM node to a multi-page A4 PDF. Loaded dynamically so jsPDF +
 * html2canvas stay out of the initial bundle (see ReportCard).
 */
export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  const img = canvas.toDataURL("image/png");

  let remaining = imgH;
  let position = 0;
  pdf.addImage(img, "PNG", 0, position, pageW, imgH);
  remaining -= pageH;
  while (remaining > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, position, pageW, imgH);
    remaining -= pageH;
  }
  pdf.save(filename);
}
