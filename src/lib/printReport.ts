"use client";

/**
 * Save a report as a one-page A4 PDF with real, selectable text.
 *
 * This replaces an html2canvas + jsPDF export that screenshotted the report
 * into a single image. That had three problems. Text was pixels, so it could
 * not be selected or searched, and any PDF compressor or print-to-PDF step
 * re-encoded it to low-resolution JPEG and smeared the words. html2canvas also
 * mis-set some text: the "score" caption was drawn on top of the number. And
 * a whole page of screenshot is a large file.
 *
 * Printing uses the browser's own renderer instead, so the PDF holds vector
 * text and vector charts (every chart here is SVG): sharp at any zoom,
 * selectable, small, and immune to recompression. The cost is one step in
 * the print dialog, where the user picks "Save as PDF".
 *
 * How it stays on one page:
 *  1. The live report is widened to EXPORT_WIDTH so the charts re-measure for
 *     the two-column layout, then copied into a print-only container.
 *  2. The copy is laid out at that fixed width, measured, and scaled down to
 *     fit the A4 printable area. Its container is sized to the SCALED box, so
 *     the layout never reaches a second page.
 *  3. Print CSS in globals.css hides everything except that container.
 */

/** Layout width of the printed report, in CSS px. Above the 768px breakpoint
 *  the page uses on screen, and the md: two-column grid is pinned on in the
 *  print container, so the print media's narrower width cannot collapse it. */
const EXPORT_WIDTH = 1040;

/** A4 (210 x 297 mm) less the 12 mm @page margins, in CSS px at 96/in, with a
 *  little slack so rounding in the print engine cannot spill onto page two. */
const PRINTABLE = { width: 698, height: 1018 };

const ROOT_ID = "print-root";
const BODY_CLASS = "printing-report";

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export interface PrintHeading {
  title: string;
  subtitle?: string;
}

export async function printReport(el: HTMLElement, fileTitle: string, heading?: PrintHeading) {
  cleanup(); // a previous print that never fired afterprint

  // 1. Let the charts re-measure at the export width, copy, then restore.
  const prev = { width: el.style.width, minWidth: el.style.minWidth, maxWidth: el.style.maxWidth };
  let copy: HTMLElement;
  try {
    el.style.width = `${EXPORT_WIDTH}px`;
    el.style.minWidth = `${EXPORT_WIDTH}px`;
    el.style.maxWidth = "none";
    window.dispatchEvent(new Event("resize"));
    await raf();
    await raf();
    await new Promise((r) => setTimeout(r, 120));
    copy = el.cloneNode(true) as HTMLElement;
  } finally {
    el.style.width = prev.width;
    el.style.minWidth = prev.minWidth;
    el.style.maxWidth = prev.maxWidth;
    window.dispatchEvent(new Event("resize"));
  }

  // The copy shares the document with the original, whose SVG ids (chart clip
  // paths) it duplicates. A url(#id) reference resolves to the FIRST match —
  // the original, which is hidden while printing — so give the copy its own.
  uniquifyIds(copy, "-print");

  // 2. Build the print container off-screen and measure it.
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("aria-hidden", "true");

  const frame = document.createElement("div");
  frame.className = "print-frame";

  const sheet = document.createElement("div");
  sheet.className = "print-sheet";
  sheet.style.width = `${EXPORT_WIDTH}px`;

  if (heading) {
    const head = document.createElement("header");
    head.className = "print-head";
    const h = document.createElement("h1");
    h.textContent = heading.title;
    head.appendChild(h);
    if (heading.subtitle) {
      const p = document.createElement("p");
      p.textContent = heading.subtitle;
      head.appendChild(p);
    }
    sheet.appendChild(head);
  }
  sheet.appendChild(copy);
  frame.appendChild(sheet);
  root.appendChild(frame);
  document.body.appendChild(root);

  await document.fonts?.ready;
  await raf();

  const naturalHeight = sheet.offsetHeight;
  const scale = Math.min(
    PRINTABLE.width / EXPORT_WIDTH,
    PRINTABLE.height / Math.max(naturalHeight, 1),
    1,
  );
  sheet.style.transform = `scale(${scale})`;
  frame.style.width = `${EXPORT_WIDTH * scale}px`;
  frame.style.height = `${naturalHeight * scale}px`;

  // 3. Print. The dialog's "Save as PDF" names the file from document.title.
  const prevTitle = document.title;
  document.title = fileTitle;
  document.body.classList.add(BODY_CLASS);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.title = prevTitle;
    cleanup();
    window.removeEventListener("afterprint", finish);
  };
  window.addEventListener("afterprint", finish);

  window.print();
  // Most browsers block in print() until the dialog closes; afterprint covers
  // the rest. The timer is a backstop for browsers that fire neither.
  setTimeout(finish, 60_000);
}

function cleanup() {
  document.getElementById(ROOT_ID)?.remove();
  document.body.classList.remove(BODY_CLASS);
}

function uniquifyIds(root: Element, suffix: string) {
  const renamed = new Map<string, string>();
  root.querySelectorAll("[id]").forEach((node) => {
    const next = `${node.id}${suffix}`;
    renamed.set(node.id, next);
    node.id = next;
  });
  if (!renamed.size) return;

  const swapUrl = (v: string) =>
    v.replace(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/g, (m, id: string) =>
      renamed.has(id) ? `url(#${renamed.get(id)})` : m,
    );

  root.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      let v = attr.value;
      if (v.includes("url(")) v = swapUrl(v);
      if ((attr.name === "href" || attr.name === "xlink:href") && v.startsWith("#")) {
        const id = v.slice(1);
        if (renamed.has(id)) v = `#${renamed.get(id)}`;
      }
      if (/^aria-(labelledby|describedby|controls)$/.test(attr.name)) {
        v = v
          .split(/\s+/)
          .map((id) => renamed.get(id) ?? id)
          .join(" ");
      }
      if (v !== attr.value) node.setAttribute(attr.name, v);
    }
  });
}
