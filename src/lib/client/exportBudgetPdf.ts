import { catRoomLeft, envStats, getCats, monthTotals, monthTx } from "@/lib/budgetMath";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { fmtNum, fmtPct, money, monthLabel } from "@/lib/utils";

type Envelope = {
  id: string;
  cat: string;
  name: string;
  planned: number;
  ownerId?: string | null;
};
type Income = { source: string; amount: number; memberId?: string };
type PdfMember = WorkspaceSnapshot["members"][number];

/** Stats d’un membre sur les dépenses perso : enveloppes liées d’abord, sinon ses retraits. */
function memberPersoLine(
  ws: WorkspaceSnapshot,
  month: string,
  member: PdfMember,
  persoEnvs: Envelope[],
  persoCatId: string,
  catAlloc: number,
  memberCount: number,
) {
  const matched = persoEnvs.filter(
    (e) =>
      e.ownerId === member.localId ||
      e.name.trim().toLowerCase() === member.name.trim().toLowerCase(),
  );
  if (matched.length) {
    return matched.reduce(
      (acc, e) => {
        const st = envStats(ws, month, e);
        return {
          name: member.name,
          part: acc.part + st.planned,
          spent: acc.spent + st.spent,
          rest: acc.rest + st.rest,
        };
      },
      { name: member.name, part: 0, spent: 0, rest: 0 },
    );
  }
  const part = Math.round(catAlloc / Math.max(1, memberCount));
  const spent = monthTx(ws, month)
    .filter((tx) => tx.cat === persoCatId && tx.ownerId === member.localId)
    .reduce((a, tx) => a + (Number(tx.amount) || 0), 0);
  return { name: member.name, part, spent, rest: part - spent };
}

function pdfEsc(x: unknown) {
  return String(x ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pdfMoney(n: number) {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return "—";
  return `${fmtNum(v)} Ar`;
}

function dateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function memberName(ws: WorkspaceSnapshot, localId?: string) {
  return ws.members.find((m) => m.localId === localId)?.name || "Membre";
}

function pdfStackedBars(
  items: { name: string; spent: number; rest: number; planned: number }[],
  title: string,
) {
  const data = items.filter((x) => (x.planned || 0) > 0 || (x.spent || 0) > 0);
  if (!data.length) return "";
  const W = 720;
  const H = 280;
  const padL = 56;
  const padR = 16;
  const padT = 36;
  const padB = 78;
  const maxV = Math.max(...data.map((x) => Math.max(0, x.spent) + Math.max(0, x.rest)), 1);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const gap = 8;
  const bw = Math.min(48, (plotW - gap * (data.length + 1)) / data.length);
  const totalBarsW = data.length * bw + (data.length - 1) * gap;
  const startX = padL + (plotW - totalBarsW) / 2;
  const yOf = (v: number) => padT + plotH - (Math.max(0, v) / maxV) * plotH;
  const ticks = 5;
  let grid = "";
  for (let i = 0; i <= ticks; i++) {
    const val = Math.round((maxV * i) / ticks);
    const y = yOf(val);
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E5E7E1" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 3}" text-anchor="end" font-size="9" fill="#5F6561">${fmtNum(val)}</text>`;
  }
  let bars = "";
  data.forEach((d, i) => {
    const x = startX + i * (bw + gap);
    const spent = Math.max(0, d.spent);
    const rest = Math.max(0, d.rest);
    const hSpent = (spent / maxV) * plotH;
    const hRest = (rest / maxV) * plotH;
    const ySpent = padT + plotH - hSpent;
    const yRest = ySpent - hRest;
    if (hSpent > 0) {
      bars += `<rect x="${x}" y="${ySpent}" width="${bw}" height="${hSpent}" fill="#E07A3D" rx="2"/>`;
      if (hSpent > 16)
        bars += `<text x="${x + bw / 2}" y="${ySpent + hSpent / 2 + 3}" text-anchor="middle" font-size="8" fill="#fff" font-weight="600">${fmtNum(spent)}</text>`;
    }
    if (hRest > 0) {
      bars += `<rect x="${x}" y="${yRest}" width="${bw}" height="${hRest}" fill="#1F5C4A" rx="2"/>`;
      if (hRest > 16)
        bars += `<text x="${x + bw / 2}" y="${yRest + hRest / 2 + 3}" text-anchor="middle" font-size="8" fill="#fff" font-weight="600">${fmtNum(rest)}</text>`;
    }
    const label = (d.name || "").length > 12 ? `${(d.name || "").slice(0, 11)}…` : d.name || "";
    bars += `<text x="${x + bw / 2}" y="${H - 52}" text-anchor="end" font-size="9" fill="#3A3F3C" transform="rotate(-40 ${x + bw / 2} ${H - 52})">${pdfEsc(label)}</text>`;
  });
  return `<div class="chart-wrap">
    <div class="chart-title">${pdfEsc(title)}</div>
    <div class="legend"><span><i class="spent"></i>Dépensé</span><span><i class="rest"></i>Reste</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">
      <text x="14" y="18" font-size="10" fill="#5F6561">Montant (Ar)</text>
      ${grid}${bars}
    </svg>
  </div>`;
}

function pdfPieChart(slices: { label: string; value: number }[], title: string) {
  const data = slices.filter((x) => x.value > 0);
  if (!data.length) return "";
  const total = data.reduce((a, x) => a + x.value, 0) || 1;
  const cx = 120;
  const cy = 120;
  const r = 90;
  let angle = -Math.PI / 2;
  const colors = ["#1F5C4A", "#8A5566", "#3A6481", "#9A7A2C", "#5F6561"];
  let paths = "";
  data.forEach((s, i) => {
    const a = (s.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += a;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    const col = colors[i % colors.length];
    if (data.length === 1) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>`;
    } else {
      paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${col}"/>`;
    }
  });
  const legend = data
    .map(
      (s, i) =>
        `<div><i style="background:${colors[i % colors.length]}"></i>${pdfEsc(s.label)} — ${fmtPct((s.value / total) * 100, 0)} (${pdfEsc(money(s.value))})</div>`,
    )
    .join("");
  return `<div class="chart-wrap pie-wrap">
    <div class="chart-title">${pdfEsc(title)}</div>
    <div class="pie-row">
      <svg viewBox="0 0 240 240" width="200" height="200" xmlns="http://www.w3.org/2000/svg">${paths}</svg>
      <div class="pie-legend">${legend}</div>
    </div>
  </div>`;
}

const PDF_WIDTH_PX = 718;

const PDF_STYLES = `
  .pdf-doc { width: ${PDF_WIDTH_PX}px; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #1B1E1C; font-size: 11.5px; line-height: 1.45; background: #fff; }
  .pdf-doc * { box-sizing: border-box; }
  .pdf-doc strong { color: inherit; }
  .pdf-doc h1 { text-align: center; color: #1F5C4A; font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
  .pdf-doc .subtitle { text-align: center; color: #5F6561; margin: 0 0 22px; font-size: 12px; }
  .pdf-doc h2 { color: #1F5C4A; font-size: 15px; font-weight: 700; margin: 26px 0 10px; }
  .pdf-doc p { margin: 0; }
  .pdf-doc .lead { color: #3A3F3C; margin: 0 0 10px; }
  .pdf-doc table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .pdf-doc th { background: #1F5C4A; color: #fff; font-weight: 600; font-size: 11px; padding: 8px 10px; text-align: left; }
  .pdf-doc th.r, .pdf-doc td.r { text-align: right; white-space: nowrap; }
  .pdf-doc td { padding: 7px 10px; border-bottom: 1px solid #D8DBD4; }
  .pdf-doc tr { break-inside: avoid; }
  .pdf-doc tr.total td { font-weight: 700; background: #E8F0EC; border-bottom: 0; border-top: 1px solid #1F5C4A; }
  .pdf-doc .summary { margin: 10px 0 6px; }
  .pdf-doc .summary p { margin: 3px 0; }
  .pdf-doc .summary .final { font-weight: 700; color: #1F5C4A; font-size: 13px; margin-top: 6px; }
  .pdf-doc .chart-wrap { margin: 16px 0 8px; break-inside: avoid; }
  .pdf-doc .chart-title { text-align: center; font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #1B1E1C; }
  .pdf-doc .legend { display: flex; justify-content: flex-end; gap: 14px; font-size: 10px; color: #5F6561; margin-bottom: 4px; }
  .pdf-doc .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .pdf-doc .legend i.spent { background: #E07A3D; }
  .pdf-doc .legend i.rest { background: #1F5C4A; }
  .pdf-doc .pie-wrap .pie-row { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; justify-content: center; }
  .pdf-doc .pie-legend { font-size: 11px; line-height: 1.8; }
  .pdf-doc .pie-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
  .pdf-doc .two-col { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; align-items: start; }
  .pdf-doc .foot { margin-top: 28px; color: #8A908C; font-size: 10px; text-align: center; border-top: 1px solid #E1E3DD; padding-top: 10px; }
`;

type PdfOptions = {
  margin: [number, number, number, number];
  filename: string;
  image: { type: "jpeg"; quality: number };
  html2canvas: object;
  jsPDF: { unit: string; format: string; orientation: "portrait" };
  pagebreak: { mode: string[]; avoid: string[] };
};

function pdfOptions(filename: string): PdfOptions {
  return {
    margin: [10, 10, 12, 10],
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".chart-wrap", "h2"] },
  };
}

async function downloadHtmlAsPdf(bodyHtml: string, filename: string) {
  const { default: html2pdf } = await import("html2pdf.js");
  const el = document.createElement("div");
  el.className = "pdf-doc";
  el.innerHTML = `<style>${PDF_STYLES}</style>${bodyHtml}`;
  await html2pdf().set(pdfOptions(filename)).from(el).save();
}

/** Génère le rapport du mois et télécharge directement un fichier PDF. */
export async function exportBudgetPdf(ws: WorkspaceSnapshot, month: string): Promise<boolean> {
  const b = ws.budgets[month];
  if (!b) return false;
  const t = monthTotals(ws, month);
  const cats = getCats(ws);
  const couple = ws.mode === "couple";
  const hh = ws.name || "Budget du foyer";
  const updated = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const incomes = b.incomes as Income[];
  const envelopes = b.envelopes as Envelope[];

  const incomeRows = incomes
    .map((i) => {
      const who = couple ? ` — ${memberName(ws, i.memberId)}` : "";
      return `<tr><td>${pdfEsc(i.source + who)}</td><td class="r">${pdfEsc(money(i.amount))}</td></tr>`;
    })
    .join("");

  const pctRows = cats
    .map((c) => {
      const pct = Number(b.pct[c.id]) || 0;
      const room = catRoomLeft(b, c.id);
      return `<tr><td>${pdfEsc(c.name)}</td><td class="r">${pdfEsc(fmtPct(pct))}</td><td class="r">${pdfEsc(money(t.alloc[c.id]))}</td><td class="r">${pdfEsc(money(room))}</td></tr>`;
    })
    .join("");
  const roomTotal = cats.reduce((a, c) => a + catRoomLeft(b, c.id), 0);

  const catBlocks = cats
    .map((c, idx) => {
      const envs = envelopes.filter((e) => e.cat === c.id);
      if (!envs.length) return "";
      const ceiling = t.alloc[c.id] || 0;
      const room = catRoomLeft(b, c.id);
      const lines = envs.map((e) => {
        const st = envStats(ws, month, e);
        return {
          name: e.name,
          planned: st.planned,
          spent: st.spent,
          rest: Math.max(0, st.rest),
          row: `<tr><td>${pdfEsc(e.name)}</td><td class="r">${pdfEsc(pdfMoney(st.planned))}</td><td class="r">${pdfEsc(pdfMoney(st.spent))}</td><td class="r">${st.rest < 0 ? `−${pdfEsc(money(-st.rest))}` : pdfEsc(pdfMoney(st.rest))}</td></tr>`,
        };
      });
      const totP = lines.reduce((a, x) => a + x.planned, 0);
      const totS = lines.reduce((a, x) => a + x.spent, 0);
      const totR = totP - totS;
      const chart = pdfStackedBars(
        lines.map((x) => ({ name: x.name, spent: x.spent, rest: x.rest, planned: x.planned })),
        `${c.name} — Dépensé et reste`,
      );
      const n = idx + 3;
      const unassignedRow =
        room > 0
          ? `<tr><td>Non réparti (pas encore assigné)</td><td class="r">${pdfEsc(money(room))}</td><td class="r">—</td><td class="r">${pdfEsc(money(room))}</td></tr>`
          : "";
      return `<h2>${n}. ${pdfEsc(c.name)} — Dépenses et reste</h2>
      <p class="lead">Budget catégorie ${pdfEsc(money(ceiling))} · Déjà prévu ${pdfEsc(money(ceiling - room))} · Reste à répartir <strong>${pdfEsc(money(room))}</strong></p>
      <table>
        <thead><tr><th>Poste</th><th class="r">Budget initial</th><th class="r">Dépensé</th><th class="r">Reste</th></tr></thead>
        <tbody>
          ${lines.map((x) => x.row).join("")}
          ${unassignedRow}
          <tr class="total"><td>Total enveloppe ${pdfEsc(c.name)}</td><td class="r">${pdfEsc(money(totP))}</td><td class="r">${pdfEsc(money(totS))}</td><td class="r">${pdfEsc(money(totR))}</td></tr>
          <tr class="total"><td>Total catégorie (avec non réparti)</td><td class="r">${pdfEsc(money(ceiling))}</td><td class="r">${pdfEsc(money(totS))}</td><td class="r">${pdfEsc(money(totR + room))}</td></tr>
        </tbody>
      </table>
      ${chart}`;
    })
    .join("");

  const recentTx = monthTx(ws, month)
    .sort((a, b2) => (b2.date + b2.id).localeCompare(a.date + a.id))
    .slice(0, 25);
  const txByCat: Record<string, number> = {};
  monthTx(ws, month).forEach((tx) => {
    txByCat[tx.cat] = (txByCat[tx.cat] || 0) + (Number(tx.amount) || 0);
  });
  const resumeRows = cats
    .filter((c) => (txByCat[c.id] || 0) > 0)
    .map((c) => `<tr><td>${pdfEsc(c.name)}</td><td class="r">${pdfEsc(money(txByCat[c.id]))}</td></tr>`)
    .join("");
  const resumeTotal = Object.values(txByCat).reduce((a, v) => a + v, 0);

  let persoBlock = "";
  const persoCat =
    cats.find((c) => c.id === "perso") || cats.filter((c) => c.kind === "expense").slice(-1)[0];
  if (couple && persoCat) {
    const persoEnvs = envelopes.filter((e) => e.cat === persoCat.id);
    const members = ws.members;
    const memberLines = members.map((m) =>
      memberPersoLine(
        ws,
        month,
        m,
        persoEnvs,
        persoCat.id,
        t.alloc[persoCat.id] || 0,
        members.length,
      ),
    );
    const pTot = memberLines.reduce((a, x) => a + x.part, 0);
    const sTot = memberLines.reduce((a, x) => a + x.spent, 0);
    const rTot = memberLines.reduce((a, x) => a + x.rest, 0);
    persoBlock = `<h2>${pdfEsc(persoCat.name)} — Répartition</h2>
      <p class="lead">Le budget ${pdfEsc(persoCat.name.toLowerCase())} de ${pdfEsc(money(t.alloc[persoCat.id]))} est suivi par membre.</p>
      <table>
        <thead><tr><th>Personne</th><th class="r">Part initiale</th><th class="r">Retrait</th><th class="r">Reste</th></tr></thead>
        <tbody>
          ${memberLines.map((m) => `<tr><td>${pdfEsc(m.name)}</td><td class="r">${pdfEsc(money(m.part))}</td><td class="r">${pdfEsc(money(m.spent))}</td><td class="r">${pdfEsc(money(m.rest))}</td></tr>`).join("")}
          <tr class="total"><td>Total</td><td class="r">${pdfEsc(money(pTot))}</td><td class="r">${pdfEsc(money(sTot))}</td><td class="r">${pdfEsc(money(rTot))}</td></tr>
        </tbody>
      </table>
      ${pdfStackedBars(
        memberLines.map((m) => ({
          name: m.name,
          spent: m.spent,
          rest: Math.max(0, m.rest),
          planned: m.part,
        })),
        `${persoCat.name} — Répartition ${members.map((m) => m.name).join(" / ")}`,
      )}`;
  }

  const pie = pdfPieChart(
    cats.map((c) => ({ label: c.short, value: t.alloc[c.id] || 0 })),
    "Répartition du budget",
  );

  const detailTx = recentTx.length
    ? `<h2>Détail des derniers retraits</h2>
      <table>
        <thead><tr><th>Date</th><th>Enveloppe</th><th>Description</th><th class="r">Montant</th></tr></thead>
        <tbody>
          ${recentTx
            .map((tx) => {
              const env = envelopes.find((e) => e.id === tx.envId)?.name || "—";
              return `<tr><td>${pdfEsc(dateLabel(tx.date))}</td><td>${pdfEsc(env)}</td><td>${pdfEsc(tx.desc || "—")}</td><td class="r">${pdfEsc(money(tx.amount))}</td></tr>`;
            })
            .join("")}
        </tbody>
      </table>`
    : "";

  const bodyHtml = `
  <h1>Budget Familial / Projet</h1>
  <p class="subtitle">${pdfEsc(hh)} — ${pdfEsc(monthLabel(month))} · Suivi des dépenses et reste disponible — mise à jour ${pdfEsc(updated)}</p>

  <h2>1. Budget — Revenus</h2>
  <table>
    <thead><tr><th>Poste</th><th class="r">Montant</th></tr></thead>
    <tbody>
      ${incomeRows || `<tr><td colspan="2">Aucun revenu saisi</td></tr>`}
      <tr class="total"><td>Total</td><td class="r">${pdfEsc(money(t.income))}</td></tr>
    </tbody>
  </table>
  <div class="summary">
    <p>Total des revenus du mois : <strong>${pdfEsc(money(t.income))}</strong></p>
    <p>Déjà dépensé / versé : <strong>${pdfEsc(money(t.spent + t.saved + t.invested))}</strong></p>
    <p class="final">Budget restant disponible : ${pdfEsc(money(t.available))}</p>
  </div>

  <h2>2. Répartition par catégorie</h2>
  <div class="two-col">
  <table>
    <thead><tr><th>Catégorie</th><th class="r">%</th><th class="r">Montant</th><th class="r">Non réparti</th></tr></thead>
    <tbody>
      ${pctRows}
      <tr class="total"><td>Total</td><td class="r">100&nbsp;%</td><td class="r">${pdfEsc(money(t.income))}</td><td class="r">${pdfEsc(money(roomTotal))}</td></tr>
    </tbody>
  </table>
  ${pie}
  </div>

  ${catBlocks}

  <h2>Résumé des retraits du mois</h2>
  <table>
    <thead><tr><th>Origine</th><th class="r">Montant retiré</th></tr></thead>
    <tbody>
      ${resumeRows || `<tr><td colspan="2">Aucun retrait ce mois-ci</td></tr>`}
      <tr class="total"><td>Total retiré</td><td class="r">${pdfEsc(money(resumeTotal))}</td></tr>
    </tbody>
  </table>

  ${persoBlock}
  ${detailTx}

  <p class="foot">Document généré par Ariary — ${pdfEsc(hh)} · ${pdfEsc(monthLabel(month))}</p>`;

  await downloadHtmlAsPdf(bodyHtml, `budget-${month}.pdf`);
  return true;
}
