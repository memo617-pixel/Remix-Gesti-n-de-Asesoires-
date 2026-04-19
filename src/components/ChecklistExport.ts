import { VisitaData } from './ChecklistData';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportExcel(cod: string, v: VisitaData) {
  const wb = XLSX.utils.book_new();
  const ws_data: any[][] = [];

  ws_data.push(["CHECKLIST DE CALIDAD – TANQUES DE ENFRIAMIENTO 2026"]);
  ws_data.push([""]);
  ws_data.push(["INFORMACIÓN GENERAL"]);
  ws_data.push(["Fecha", v.fecha, "", "Proveedor Cód.", cod]);
  ws_data.push(["Nombre Proveedor", v.nom, "", "Tanque Cód.", v.cod_tanque]);
  ws_data.push(["Responsable", v.responsable, "", "Nombre Tanque", v.nom_tanque]);
  ws_data.push(["Teléfono", v.telefono, "", "Asesor de Finca", v.asesor]);
  ws_data.push([""]);
  ws_data.push(["RESULTADO DE CUMPLIMIENTO"]);
  ws_data.push(["Cumplimiento", v.pct.toFixed(1) + "%", "", "Criterio", "SI / (SI + NO)"]);
  ws_data.push(["Respuestas SI", v.si, "", "Respuestas NO", v.no]);
  ws_data.push(["Respuestas N/A", v.na, "", "Total evaluadas (SI+NO)", v.si + v.no]);
  ws_data.push([""]);
  ws_data.push(["DETALLE DE AUDITORÍA"]);
  ws_data.push(["N°", "PREGUNTA", "RESPUESTA", "VALOR NUMÉRICO", "OBSERVACIONES"]);
  v.detalles.forEach((d, i) => {
    ws_data.push([i + 1, d.pregunta, d.respuesta || "N/A", d.extra || "—", d.observacion || ""]);
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const NAVY = "1F3A5F";
  const NAVY_LIGHT = "2C5282";
  const SI_GREEN_BG = "D1FAE5";
  const SI_GREEN_FG = "065F46";
  const NO_RED_BG = "FEE2E2";
  const NO_RED_FG = "991B1B";
  const NA_YELLOW_BG = "FEF3C7";
  const NA_YELLOW_FG = "B45309";
  const INFO_BG = "F0F4F8";
  const RESULT_BG = "E8EEF5";
  const WHITE = "FFFFFF";
  const BLUE_INTENSE = "1E3A8A";
  
  ws['!cols'] = [{ wch: 8 }, { wch: 64 }, { wch: 14 }, { wch: 20 }, { wch: 42 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, { s: { r: 8, c: 0 }, e: { r: 8, c: 4 } }, { s: { r: 13, c: 0 }, e: { r: 13, c: 4 } }];

  function applyStyle(rowIdx: number, colIdx: number, opts: any) {
    const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    if (!ws[ref]) return;
    const cell = ws[ref];
    const { isTitle, isSection, isHeader, isData, isResult, isRespCol, resp, isAltRow } = opts;
    let fillColor = WHITE, fontColor = "1e293b", bold = false, fontSize = 10, hAlign = "left", vAlign = "center";
    if (isTitle) { fillColor = NAVY; fontColor = WHITE; bold = true; fontSize = 15; hAlign = "center"; vAlign = "center"; }
    else if (isSection) { fillColor = NAVY_LIGHT; fontColor = WHITE; bold = true; fontSize = 11; hAlign = "left"; vAlign = "center"; }
    else if (isHeader) { fillColor = NAVY; fontColor = WHITE; bold = true; fontSize = 10; hAlign = "center"; vAlign = "center"; }
    else if (isData) { fillColor = INFO_BG; fontColor = "1e293b"; bold = false; fontSize = 10; hAlign = (colIdx === 0 || colIdx === 2 || colIdx === 3) ? "center" : "left"; vAlign = "center"; }
    else if (isResult) { fillColor = RESULT_BG; fontColor = "1e293b"; bold = (colIdx === 0); fontSize = 10; hAlign = (colIdx === 1 || colIdx === 3) ? "center" : "left"; vAlign = "center"; }
    else if (isRespCol) {
      if (resp === "SI" || resp === "Si" || resp === "si") { fillColor = SI_GREEN_BG; fontColor = SI_GREEN_FG; bold = true; fontSize = 10; hAlign = "center"; vAlign = "center"; }
      else if (resp === "NO" || resp === "No" || resp === "no") { fillColor = NO_RED_BG; fontColor = NO_RED_FG; bold = true; fontSize = 10; hAlign = "center"; vAlign = "center"; }
      else if (resp === "N/A" || resp === "NA" || resp === "na" || resp === "n/a") { fillColor = NA_YELLOW_BG; fontColor = NA_YELLOW_FG; bold = true; fontSize = 10; hAlign = "center"; vAlign = "center"; }
      else { fillColor = WHITE; fontColor = "1e293b"; bold = false; fontSize = 10; hAlign = "center"; vAlign = "center"; }
    } else if (isAltRow) { fillColor = WHITE; fontColor = "1e293b"; bold = false; fontSize = 10; hAlign = (colIdx === 0 || colIdx === 2 || colIdx === 3) ? "center" : "left"; vAlign = "center"; }
    else { fillColor = WHITE; fontColor = "1e293b"; bold = false; fontSize = 10; hAlign = (colIdx === 0 || colIdx === 2 || colIdx === 3) ? "center" : "left"; vAlign = "center"; }
    cell.s = { font: { bold: bold, sz: fontSize, color: { rgb: fontColor } }, fill: { fgColor: { rgb: fillColor }, patternType: "solid" }, alignment: { horizontal: hAlign, vertical: vAlign, wrapText: true }, border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } } };
  }

  ws_data.forEach((row, ri) => {
    row.forEach((val, ci) => {
      if (ri === 0 && ci === 0) { applyStyle(ri, ci, { isTitle: true }); return; }
      if (ri === 2 || ri === 8 || ri === 13) { applyStyle(ri, ci, { isSection: true }); return; }
      if (ri === 14) { applyStyle(ri, ci, { isHeader: true }); return; }
      if (ri >= 3 && ri <= 6) { if (val !== "" && val !== undefined && val !== null && val !== " ") { applyStyle(ri, ci, { isData: true }); } return; }
      if (ri >= 9 && ri <= 11) { if (val !== "" && val !== undefined && val !== null && val !== " ") { applyStyle(ri, ci, { isResult: true }); } return; }
      if (ri >= 15) {
        const respVal = row[2];
        const isRespColumn = (ci === 2);
        const altR = ((ri - 15) % 2 === 1);
        applyStyle(ri, ci, { isRespCol: isRespColumn, resp: respVal, isAltRow: altR });
      }
    });
  });

  ws['!rows'] = ws_data.map((_, ri) => {
    if (ri === 0) return { hpt: 38 };
    if (ri === 2 || ri === 8 || ri === 13) return { hpt: 22 };
    if (ri === 14) return { hpt: 20 };
    return { hpt: 18 };
  });
  XLSX.utils.book_append_sheet(wb, ws, "Auditoría");

  const siPct = (v.si + v.no) > 0 ? parseFloat(((v.si / (v.si + v.no)) * 100).toFixed(1)) + "%" : "—";
  const noPct = (v.si + v.no) > 0 ? parseFloat(((v.no / (v.si + v.no)) * 100).toFixed(1)) + "%" : "—";
  const ws2_data = [["RESUMEN EJECUTIVO"], [""], ["Proveedor", `${cod} – ${v.nom}`], ["Fecha", v.fecha], ["Asesor", v.asesor], [""], ["INDICADOR", "CANTIDAD", "PORCENTAJE"], ["Respuestas SI", v.si, siPct], ["Respuestas NO", v.no, noPct], ["N/A (no aplica)", v.na, "—"], [""], ["Cumplimiento", `${v.pct.toFixed(1)}%`, ""]];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2_data);
  ws2['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  ws2_data.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
      if (!ws2[ref]) return;
      if (ri === 0) { ws2[ref].s = { font: { bold: true, sz: 13, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center" } }; }
      else if (ri === 6) { ws2[ref].s = { font: { bold: true, sz: 10, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY_LIGHT }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: WHITE } }, bottom: { style: "thin", color: { rgb: WHITE } }, left: { style: "thin", color: { rgb: WHITE } }, right: { style: "thin", color: { rgb: WHITE } } } }; }
      else if (ri >= 2 && ri <= 4 && ci === 1) { ws2[ref].s = { font: { bold: false, sz: 10, color: { rgb: "1e293b" } }, fill: { fgColor: { rgb: INFO_BG }, patternType: "solid" }, alignment: { horizontal: "left", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } } }; }
      else if (ri === 7) { ws2[ref].s = { font: { bold: ci === 0, sz: 10, color: { rgb: SI_GREEN_FG } }, fill: { fgColor: { rgb: SI_GREEN_BG }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } } }; }
      else if (ri === 8) { ws2[ref].s = { font: { bold: ci === 0, sz: 10, color: { rgb: NO_RED_FG } }, fill: { fgColor: { rgb: NO_RED_BG }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } } }; }
      else if (ri === 9) { ws2[ref].s = { font: { bold: ci === 0, sz: 10, color: { rgb: NA_YELLOW_FG } }, fill: { fgColor: { rgb: NA_YELLOW_BG }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } } }; }
      else if (ri === 11) {
        const pc = v.pct >= 90 ? "065F46" : v.pct >= 70 ? "92400E" : BLUE_INTENSE;
        ws2[ref].s = { font: { bold: ci <= 1, sz: ci === 1 ? 14 : 10, color: { rgb: ci === 1 ? pc : NAVY } }, fill: { fgColor: { rgb: "E0F2FE" }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } } };
      }
    });
  });
  ws2['!rows'] = [{ hpt: 30 }, { hpt: 16 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 16 }, { hpt: 22 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 16 }, { hpt: 26 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Resumen");
  XLSX.writeFile(wb, `Checklist_${cod}_${v.fecha}.xlsx`);
}

export async function exportPDF(cod: string, v: VisitaData) {
  const siAll = v.siAll || v.si; const noAll = v.noAll || v.no; const naAll = v.naAll || v.na;
  const total3 = siAll + noAll + naAll;
  const siEval = v.si + v.no;

  function pieSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number, color: string) {
    if (endAngle - startAngle >= 360) endAngle = 359.999;
    const s = startAngle * Math.PI / 180; const e = endAngle * Math.PI / 180;
    const x1 = cx + r * Math.sin(s); const y1 = cy - r * Math.cos(s);
    const x2 = cx + r * Math.sin(e); const y2 = cy - r * Math.cos(e);
    const large = (endAngle - startAngle) > 180 ? 1 : 0;
    return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}" stroke="white" stroke-width="2.5" />`;
  }

  let pieHtml = "";
  if (total3 > 0) {
    const siDeg = (siAll / total3) * 360; const noDeg = (noAll / total3) * 360; const naDeg = (naAll / total3) * 360;
    pieHtml += pieSlice(110, 110, 90, 0, siDeg, "#16a34a");
    pieHtml += pieSlice(110, 110, 90, siDeg, siDeg + noDeg, "#dc2626");
    if (naAll > 0) pieHtml += pieSlice(110, 110, 90, siDeg + noDeg, 360, "#D97706");
    function labelPos(start: number, end: number, r2: number) { const mid = (start + end) / 2 * Math.PI / 180; return { x: 110 + r2 * Math.sin(mid), y: 110 - r2 * Math.cos(mid) }; }
    if (siAll > 0) { const p = labelPos(0, siDeg, 55); pieHtml += `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="bold" fill="white">${((siAll / total3) * 100).toFixed(0)}%</text>`; }
    if (noAll > 0) { const p = labelPos(siDeg, siDeg + noDeg, 55); pieHtml += `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="bold" fill="white">${((noAll / total3) * 100).toFixed(0)}%</text>`; }
    if (naAll > 0) { const p = labelPos(siDeg + noDeg, 360, 55); pieHtml += `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="bold" fill="white">${((naAll / total3) * 100).toFixed(0)}%</text>`; }
  } else {
    pieHtml += `<circle cx="110" cy="110" r="90" fill="#e2e8f0" /><text x="110" y="110" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#94a3b8">Sin datos</text>`;
  }

  let rows = ""; let cs = "";
  v.detalles.forEach((it, i) => {
    if (it.seccion !== cs) { rows += `<tr><td colspan="5" class="sec-header">${it.seccion}</td></tr>`; cs = it.seccion; }
    const rc = it.respuesta === "SI" ? "#15803d" : it.respuesta === "NO" ? "#b91c1c" : it.respuesta === "NA" ? "#B45309" : "#64748b";
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    rows += `<tr style="background:${bg}">
      <td class="tc">${i + 1}</td>
      <td style="font-weight:700">${it.pregunta}</td>
      <td class="tc" style="font-weight:700;color:${rc}">${it.respuesta || '—'}</td>
      <td class="tc">${it.extra || '—'}</td>
      <td class="obs">${it.observacion || ''}</td>
    </tr>`;
  });

  const pctColor = v.pct >= 90 ? "#15803d" : v.pct >= 70 ? "#d97706" : "#1E3A8A";
  const siPct = total3 > 0 ? ((siAll / total3) * 100).toFixed(1) : "0.0";
  const noPct = total3 > 0 ? ((noAll / total3) * 100).toFixed(1) : "0.0";
  const naPct = total3 > 0 ? ((naAll / total3) * 100).toFixed(1) : "0.0";

  const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;font-size:9.5px;color:#1e293b;margin:0;padding:0;line-height:1.4}
  h1{font-size:14px;color:#001A3A;text-align:center;margin:0 0 2px;text-transform:uppercase;letter-spacing:1px}
  .sub{text-align:center;font-size:8.5px;color:#64748b;margin-bottom:6px}
  .header-block{background:#002B5C;color:white;padding:7px 12px;border-radius:4px;margin-bottom:7px}
  .header-block h1{color:white;margin:0 0 1px;font-size:13px}
  .header-block .sub{color:rgba(255,255,255,0.6);margin:0;font-size:8px}
  table.info{width:100%;border-collapse:collapse;margin-bottom:7px;font-size:9.5px}
  table.info td{padding:3px 6px;border:1px solid #cbd5e1}
  table.info .lbl{font-weight:700;color:#000000;background:#e2e8f0;width:18%}
  table.info .val{color:#1e293b;width:32%}
  table.main{width:100%;border-collapse:collapse;font-size:8.5px}
  thead th{background:#002B5C;color:white;padding:4px 3px;text-align:center;font-size:8px;text-transform:uppercase;border:1px solid #002B5C;font-weight:700}
  .sec-header{background:#e2e8f0;font-weight:700;font-size:8.5px;text-align:center;text-transform:uppercase;padding:3px;border:1px solid #cbd5e1;letter-spacing:0.3px}
  td{border:1px solid #e2e8f0;padding:3px 4px;vertical-align:top}
  .tc{text-align:center}
  .obs{font-style:italic;color:#64748b}
  .resumen-header{background:#1F3A5F;color:white;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:5px 0;border-radius:3px 3px 0 0}
  .resumen-body{border:2px solid #1F3A5F;border-top:none;border-radius:0 0 4px 4px;padding:0}
  .dist-title{background:#1F3A5F;color:white;text-align:center;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:4px 0;border-radius:0}
  table.dist{width:100%;border-collapse:collapse;font-size:9px}
  table.dist th{background:#1F3A5F;color:white;padding:4px 6px;text-align:center;font-size:8px;text-transform:uppercase;border:1px solid #1F3A5F;font-weight:700}
  table.dist td{padding:4px 6px;text-align:center;border:1px solid #cbd5e1;font-weight:600}
  .dist .row-si{background:#d1fae5} .dist .row-si td{color:#065f46}
  .dist .row-no{background:#fee2e2} .dist .row-no td{color:#991b1b}
  .dist .row-na{background:#fef3c7} .dist .row-na td{color:#b45309}
  .dist .row-total{background:#e8eef5;font-weight:700}
  .dist .row-eval{background:#e8eef5}
  .compliance-card{margin:10px 10px 10px;border:3px solid ${pctColor};border-radius:10px;padding:12px 16px;text-align:center;background:${v.pct >= 90 ? '#f0fdf4' : v.pct >= 70 ? '#fffbeb' : '#EBF5FB'};}
  .compliance-pct{font-size:38px;font-weight:700;color:${pctColor};line-height:1}
  .compliance-label{font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;font-weight:600}
  .compliance-counts{display:flex;gap:12px;justify-content:center;margin-top:5px}
  .cc-item{display:flex;align-items:center;gap:3px;font-size:9px;font-weight:700}
  .cc-dot{width:9px;height:9px;border-radius:50%;display:inline-block}
  .bottom-grid{display:flex;gap:0}
  .bottom-left{flex:1;padding:6px}
  .bottom-right{flex:0 0 240px;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .chart-title{font-size:8px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;text-align:center}
  .legend{display:flex;gap:10px;justify-content:center;margin-top:4px}
  .leg-item{display:flex;align-items:center;gap:3px;font-size:8px;font-weight:700}
  .leg-dot{width:9px;height:9px;border-radius:50%;display:inline-block}
</style></head>
<body>
<div class="header-block"><h1>Checklist de Calidad – Tanques de Enfriamiento 2026</h1><div class="sub">Informe Oficial de Auditoría · Formulario 0466.VSC.FOR.023</div></div>
<table class="info">
  <tr><td class="lbl">Fecha</td><td class="val">${v.fecha}</td><td class="lbl">Proveedor</td><td class="val">${cod} – ${v.nom}</td></tr>
  <tr><td class="lbl">Responsable</td><td class="val">${v.responsable}</td><td class="lbl">Asesor de Finca</td><td class="val">${v.asesor}</td></tr>
  <tr><td class="lbl">Tanque</td><td class="val">${v.cod_tanque} – ${v.nom_tanque}</td><td class="lbl">Teléfono</td><td class="val">${v.telefono}</td></tr>
</table>
<table class="main">
  <thead><tr><th style="width:3%">N°</th><th style="width:44%;text-align:left">Pregunta</th><th style="width:7%">Resp.</th><th style="width:12%">Valor</th><th style="width:34%;text-align:left">Observaciones</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="resumen-header">Resumen de Resultados</div>
<div class="resumen-body">
  <div class="bottom-grid">
    <div class="bottom-left">
      <div class="dist-title">Distribución de Respuestas</div>
      <table class="dist">
        <thead><tr><th style="text-align:left;padding-left:8px">Indicador</th><th style="width:25%">Cantidad</th><th style="width:30%">% del Total</th></tr></thead>
        <tbody>
          <tr class="row-si"><td style="text-align:left;padding-left:8px;font-weight:700">Respuestas SI</td><td>${siAll}</td><td>${siPct}%</td></tr>
          <tr class="row-no"><td style="text-align:left;padding-left:8px;font-weight:700">Respuestas NO</td><td>${noAll}</td><td>${noPct}%</td></tr>
          <tr class="row-na"><td style="text-align:left;padding-left:8px;font-weight:700">N/A (no aplica)</td><td>${naAll}</td><td>${naPct}%</td></tr>
          <tr class="row-total"><td style="text-align:left;padding-left:8px">Total respuestas</td><td>${total3}</td><td>100%</td></tr>
          <tr class="row-eval"><td style="text-align:left;padding-left:8px">Evaluadas (SI+NO)</td><td>${siEval}</td><td>—</td></tr>
        </tbody>
      </table>
    </div>
    <div class="bottom-right">
      <div class="chart-title">Distribución Visual</div>
      <svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">${pieHtml}</svg>
      <div class="legend"><div class="leg-item"><span class="leg-dot" style="background:#16a34a"></span>SI</div><div class="leg-item"><span class="leg-dot" style="background:#dc2626"></span>NO</div><div class="leg-item"><span class="leg-dot" style="background:#D97706"></span>N/A</div></div>
    </div>
  </div>
  <div class="compliance-card">
    <div class="compliance-pct">${v.pct.toFixed(1)}%</div>
    <div class="compliance-label">Cumplimiento</div>
    <div class="compliance-counts"><div class="cc-item"><span class="cc-dot" style="background:#16a34a"></span>SI: ${siAll}</div><div class="cc-item"><span class="cc-dot" style="background:#dc2626"></span>NO: ${noAll}</div><div class="cc-item"><span class="cc-dot" style="background:#D97706"></span>N/A: ${naAll}</div></div>
  </div>
</div>
</body></html>`;

  try {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;";
    document.body.appendChild(iframe);

    iframe.onload = async function() {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(iframe.contentDocument!.body, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          windowWidth: 794
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const imgW = pageW - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;
        const imgData = canvas.toDataURL("image/png");

        let heightLeft = imgH;
        let position = margin;

        pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
        heightLeft -= (pageH - margin * 2);

        while (heightLeft > 0) {
          position = heightLeft - imgH + margin;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
          heightLeft -= (pageH - margin * 2);
        }

        pdf.save(`Checklist_${cod}_${v.fecha}.pdf`);
      } catch (err) {
        console.error("Error html2canvas:", err);
      } finally {
        document.body.removeChild(iframe);
      }
    };

    iframe.srcdoc = htmlContent;
  } catch (err) {
    console.error("Error PDF:", err);
  }
}
