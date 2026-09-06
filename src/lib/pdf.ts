"use client";

/**
 * Render a report to a SINGLE A4 page with margins.
 *
 * Two things went wrong before. The image was placed at x=0 across the full
 * page width, so the PDF had no margins at all. And the element was captured at
 * whatever width it happened to occupy on screen — around 675px, which is below
 * the 768px breakpoint, so every two-column section stacked into one and the
 * capture came out 2.3x taller than wide. Scaled to the page width that ran to
 * 1391pt: two pages for a one-page report.
 *
 * So the element is widened to a fixed export width first, which brings the
 * two-column layout back and roughly halves the height, and the result is then
 * scaled to fit inside the margins on one page. There is no pagination loop:
 * one page is the contract.
 *
 * jsPDF + html2canvas are imported dynamically so they stay out of the initial
 * bundle (see ReportCard).
 */

/** Capture width in CSS px. Above the 768px breakpoint so the report renders
 *  in its two-column form rather than the stacked narrow one. */
const EXPORT_WIDTH = 1040;

/** Page margin in points. 36pt = 0.5in on every side. */
const MARGIN = 36;

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Widen for the capture, then put the element back exactly as it was.
  const prev = {
    width: el.style.width,
    minWidth: el.style.minWidth,
    maxWidth: el.style.maxWidth,
  };
  el.style.width = `${EXPORT_WIDTH}px`;
  el.style.minWidth = `${EXPORT_WIDTH}px`;
  el.style.maxWidth = "none";

  let canvas: HTMLCanvasElement;
  try {
    // The charts size themselves from their container, so they need a resize
    // event and a couple of frames to re-measure before we snapshot.
    window.dispatchEvent(new Event("resize"));
    await raf();
    await raf();
    await new Promise((r) => setTimeout(r, 120));

    canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      useCORS: true,
      windowWidth: EXPORT_WIDTH,
      width: EXPORT_WIDTH,
    });
  } finally {
    el.style.width = prev.width;
    el.style.minWidth = prev.minWidth;
    el.style.maxWidth = prev.maxWidth;
    window.dispatchEvent(new Event("resize"));
  }

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const availW = pageW - MARGIN * 2;
  const availH = pageH - MARGIN * 2;

  // Fit inside the margins, preserving aspect. Whichever side binds, the
  // result is one page with white space on the other axis.
  const scale = Math.min(availW / canvas.width, availH / canvas.height);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const x = MARGIN + (availW - w) / 2;   // centred horizontally
  const y = MARGIN;                      // top-aligned; reports read downward

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
  pdf.save(filename);
}
