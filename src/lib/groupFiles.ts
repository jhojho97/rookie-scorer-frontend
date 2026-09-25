import type { CandidateInput } from "@/types";

/**
 * Turn a pile of dropped files into candidates, each with a CV and optional JMP.
 *
 * Two shapes arrive in practice:
 *  - a folder per candidate (a directory drop gives relative paths), and
 *  - loose files named after the person: "Smith_CV.pdf", "Smith_JMP.pdf",
 *    "Dan_Road Paper (Dissertation).pdf".
 *
 * The previous version matched keywords with \b, the regex word boundary. The
 * underscore counts as part of a word, so in "Smith_CV" there is no boundary
 * before "CV": the word was never stripped and the CV was never recognised.
 * "Smith_CV.pdf" and "Smith_JMP.pdf" became two candidates named "Smith Cv"
 * and "Smith Jmp", each holding one file as its CV. Everything here splits a
 * filename into words on separators FIRST, and only then looks at the words.
 */

const DOC_EXT = /\.(pdf|docx)$/i;
/** Word separators in a filename. The underscore is the one \b missed. */
const SEP = /[\s_\-.,;()[\]{}]+/;

const CV_WORDS = new Set(["cv", "resume", "résumé", "vita", "vitae", "curriculum"]);
const PAPER_WORDS = new Set([
  "jmp", "paper", "draft", "dissertation", "thesis", "job", "market", "manuscript", "working",
]);
/** Version and housekeeping words that say nothing about who the file is for. */
const NOISE = /^(v\d+|final|latest|updated|revised|new|copy|\d+)$/;

const uid = () => Math.random().toString(36).slice(2, 9);

function words(filename: string): string[] {
  return filename.replace(DOC_EXT, "").toLowerCase().split(SEP).filter(Boolean);
}

export function isCvFile(filename: string): boolean {
  return words(filename).some((w) => CV_WORDS.has(w));
}

function isPaperFile(filename: string): boolean {
  return words(filename).some((w) => PAPER_WORDS.has(w));
}

/** The words left once document-type and version words are removed —
 *  usually the person's name, sometimes plus a few words of a paper title. */
function nameWords(filename: string): string[] {
  return words(filename).filter((w) => !CV_WORDS.has(w) && !PAPER_WORDS.has(w) && !NOISE.test(w));
}

function prettyName(ws: string[]): string {
  return ws.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function relativePath(f: File): string {
  const r = f as File & { path?: string; webkitRelativePath?: string };
  return r.webkitRelativePath || r.path || "";
}

/** Pick CV and JMP from files already known to belong to one person. */
function pairWithin(fs: File[]): { cv: File | null; jmp: File | null; rest: File[] } {
  if (fs.length === 1) return { cv: fs[0], jmp: null, rest: [] };
  // A JMP is essentially always longer than a CV, so size breaks ties.
  const bySize = [...fs].sort((a, b) => a.size - b.size);
  const cv = fs.find((f) => isCvFile(f.name)) ?? bySize[0];
  const others = fs.filter((f) => f !== cv);
  const jmp =
    others.find((f) => isPaperFile(f.name)) ??
    [...others].sort((a, b) => b.size - a.size)[0] ??
    null;
  return { cv, jmp, rest: others.filter((f) => f !== jmp) };
}

export function groupFiles(files: File[]): CandidateInput[] {
  const docs = files.filter((f) => DOC_EXT.test(f.name));
  const out: CandidateInput[] = [];

  // 1. Directory drops: the folder IS the candidate. "batch/Smith Jane/cv.pdf".
  const byFolder = new Map<string, File[]>();
  const loose: File[] = [];
  for (const f of docs) {
    const parts = relativePath(f).split("/").filter(Boolean);
    if (parts.length >= 2) {
      const folder = parts[parts.length - 2];
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), f]);
    } else {
      loose.push(f);
    }
  }
  for (const [folder, fs] of byFolder) {
    const { cv, jmp, rest } = pairWithin(fs);
    out.push({ id: uid(), name: folder, cv, jmp });
    // Extra files in a folder are shown, not dropped, so nothing vanishes.
    for (const f of rest) out.push({ id: uid(), name: prettyName(nameWords(f.name)) || f.name, cv: f, jmp: null });
  }

  // 2. Loose files, anchored on the CVs. Every file whose name says CV starts
  //    a candidate; each other file joins the CV whose name it shares most.
  const cvs = loose.filter((f) => isCvFile(f.name));
  const others = loose.filter((f) => !isCvFile(f.name));

  if (cvs.length) {
    const groups = cvs.map((cv) => ({ cv, key: nameWords(cv.name), attached: [] as File[] }));
    const unmatched: File[] = [];

    for (const f of others) {
      const fw = nameWords(f.name);
      const scored = groups.map((g) => ({ g, s: matchScore(g.key, fw) }));
      const best = Math.max(0, ...scored.map((x) => x.s));
      const winners = scored.filter((x) => x.s === best);
      // Attach only on a clear, unique match. Two Kims and one "Kim_Paper"
      // stays unpaired and visible rather than being guessed into one of them.
      if (best > 0 && winners.length === 1) winners[0].g.attached.push(f);
      else unmatched.push(f);
    }

    for (const g of groups) {
      const { jmp, rest } = pairWithin([g.cv, ...g.attached]);
      const name = prettyName(g.key) || prettyName(nameWords(jmp?.name ?? "")) || "Candidate";
      out.push({ id: uid(), name, cv: g.cv, jmp });
      for (const f of rest) out.push({ id: uid(), name: prettyName(nameWords(f.name)) || f.name, cv: f, jmp: null });
    }
    loose.length = 0;
    loose.push(...unmatched);
  }

  // 3. Whatever is left has no CV-named file to anchor on: group files whose
  //    name words are identical, and let size pick the CV within each.
  const byKey = new Map<string, File[]>();
  for (const f of loose) {
    const k = nameWords(f.name).join(" ") || f.name.toLowerCase();
    byKey.set(k, [...(byKey.get(k) ?? []), f]);
  }
  for (const [k, fs] of byKey) {
    const { cv, jmp, rest } = pairWithin(fs);
    out.push({ id: uid(), name: prettyName(k.split(" ")) || "Candidate", cv, jmp });
    for (const f of rest) out.push({ id: uid(), name: prettyName(nameWords(f.name)) || f.name, cv: f, jmp: null });
  }

  return out;
}

/**
 * How strongly a file's name words point at a CV's name words.
 * Shared words dominate, so "Smith, Jane - CV" still meets "Jane Smith JMP"
 * despite the order; a shared leading run breaks ties, so "Jane_Doe_JMP"
 * prefers "Jane_Doe_CV" over "Jane_Smith_CV".
 */
function matchScore(cvWords: string[], fileWords: string[]): number {
  const set = new Set(cvWords);
  const shared = new Set(fileWords.filter((w) => set.has(w))).size;
  if (!shared) return 0;
  let prefix = 0;
  while (prefix < cvWords.length && prefix < fileWords.length && cvWords[prefix] === fileWords[prefix]) prefix++;
  return shared * 10 + prefix;
}
