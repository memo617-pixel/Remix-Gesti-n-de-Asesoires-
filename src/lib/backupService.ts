import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from './db';
import * as XLSX from 'xlsx-js-style';
import html2pdf from 'html2pdf.js';
import { VisitaData } from '../components/ChecklistData';

// Shared function to apply styles to Excel (from VisitaInforme)
function applyVisitaExcelStyles(ws: any, ws_data: any[][]) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  let colWidths: any[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      const val = ws[cellRef].v ? String(ws[cellRef].v) : "";
      if (val.length > maxLen) maxLen = val.length;
    }
    colWidths.push({ wch: Math.min(Math.max(maxLen + 4, 15), 60) });
  }
  ws['!cols'] = colWidths;
  ws['!view'] = [{ showGridLines: false }];
  const headerStyle = { font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "003366" }, patternType: "solid" }, alignment: { vertical: "center", horizontal: "center", wrapText: true }, border: { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } } };
  const bodyStyle = { font: { name: "Arial", sz: 12 }, fill: { fgColor: { rgb: "FFFFFF" }, patternType: "solid" }, alignment: { vertical: "center", horizontal: "left", wrapText: true }, border: { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } } };
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = (R === 0) ? headerStyle : bodyStyle;
    }
  }
}

export async function generateBackupZip(onProgress: (msg: string) => void) {
  const zip = new JSZip();

  // Create folders
  const folderVisitas = zip.folder("Informe_de_Visita")!;
  const folderAuditorias = zip.folder("Auditoria_de_Tanques")!;
  const folderCapacitaciones = zip.folder("Soporte_de_Capacitaciones")!;

  try {
    onProgress("Consultando base de datos...");
    const visitas = await db.visitas.toArray();
    const auditorias = await db.auditorias.toArray();
    const capacitaciones = await db.capacitacionDraft.toArray();

    // 1. Export Visitas
    if (visitas.length > 0) {
      onProgress("Generando archivos de Informe de Visita...");
      // A) General Excel
      const ws_data: any[][] = [
        ["Fecha", "Código Proveedor", "Proveedor", "Ruta/Tanque", "Teléfono", "Género", "Edad", "Temas Tratados", "Otros Temas", "Objetivo", "Actividades", "Recomendaciones", "Comentarios", "Coordenadas (Lat, Long)", "Altitud (m.s.n.m)"]
      ];
      visitas.forEach((v: any) => {
        ws_data.push([
          v.fecha, v.codigo, v.proveedor, v.ruta, v.telefono, v.genero, v.edad, 
          (v.temas || []).join(" | "), v.otros, v.objetivo, v.actividades, v.recomendaciones, 
          v.comentarios, (v.lat && v.lng ? `${v.lat}, ${v.lng}` : 'N/A'), v.alt || 'N/A'
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      applyVisitaExcelStyles(ws, ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Todas las Visitas");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      folderVisitas.file("Historial_Visitas_General.xlsx", excelBuffer);

      // B) Individual Excel (Optional: The logic above handles individual too, let's keep only general to save space or do individuals too)
      for (let i = 0; i < visitas.length; i++) {
        const v: any = visitas[i];
        onProgress(`Generando PDF de Visita ${i + 1} de ${visitas.length}...`);
        const safeName = (v.proveedor || "Finca").replace(/[^a-z0-9]/gi, '_');
        const filename = `${v.fecha}_${safeName}`;

        // PDF Generation
        const printDiv = document.createElement('div');
        printDiv.innerHTML = `
          <div style="padding: 40px; font-family: 'Helvetica', Arial, sans-serif; color: #222; background: white; width: 800px; box-sizing: border-box;">
              <table style="width: 100%; border-bottom: 3px solid #003087; padding-bottom: 15px; margin-bottom: 25px;">
                  <tr>
                      <td style="vertical-align: top;">
                          <h2 style="color: #003087; margin: 0; font-size: 22px; text-transform: uppercase; font-weight: bold;">INFORME DE VISITA A FINCA</h2>
                          <span style="color: #666; font-size: 14px;">Milk Sourcing Colombia</span>
                      </td>
                  </tr>
              </table>
              <table style="width: 100%; margin-bottom: 25px; font-size: 13px; border-collapse: collapse;">
                  <tr><td style="padding: 8px; border: 1px solid #eee; width: 50%;"><b>Proveedor:</b> <span style="text-transform:uppercase;">${v.proveedor}</span></td><td style="padding: 8px; border: 1px solid #eee; width: 50%;"><b>Fecha:</b> ${v.fecha}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #eee;"><b>Teléfono:</b> ${v.telefono || '-'}</td><td style="padding: 8px; border: 1px solid #eee;"><b>Código Proveedor:</b> ${v.codigo || '-'}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #eee;"><b>Ruta/Tanque:</b> ${v.ruta || '-'}</td><td style="padding: 8px; border: 1px solid #eee;"></td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #eee;" colspan="2"><b>Coordenadas GPS:</b> ${v.lat ? v.lat + ', ' + v.lng : 'No registradas'} <br><b style="margin-top:4px; display:inline-block;">Altitud:</b> ${v.alt !== null ? v.alt + ' m.s.n.m' : 'No registrada'}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #eee; background: #f8fafc;" colspan="2"><b>Temas Tratados:</b> ${(v.temas||[]).join(' | ')} ${v.otros ? '| Otros: ' + v.otros : ''}</td></tr>
              </table>
              ${v.objetivo ? '<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">OBJETIVO</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.objetivo + '</p></div>' : ''}
              ${v.actividades ? '<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ACTIVIDADES REALIZADAS</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.actividades + '</p></div>' : ''}
              ${v.recomendaciones ? '<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">RECOMENDACIONES</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.recomendaciones + '</p></div>' : ''}
              ${v.comentarios ? '<div style="margin-bottom: 25px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">COMENTARIOS</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.comentarios + '</p></div>' : ''}
          </div>
        `;

        const opt: any = {
          margin: [5, 0],
          filename: `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        try {
          const pdfBlob = await html2pdf().set(opt).from(printDiv).output('blob');
          folderVisitas.file(`${filename}.pdf`, pdfBlob);
        } catch (e) {
          console.error("Error generating PDF for visita", e);
        }
      }
    }

    // 2. Export Auditorias
    if (auditorias.length > 0) {
      onProgress("Generando archivos de Auditoría a Tanques...");
      for (let i = 0; i < auditorias.length; i++) {
        const record = auditorias[i];
        const v: VisitaData = record.visita;
        const cod = record.cod;
        const safeName = (v.nom || "Tanque").replace(/[^a-z0-9]/gi, '_');
        const filename = `${v.fecha}_${safeName}`;

        // Generar Excel usando exportData para JSZip (Tenemos que reconstruir como en ChecklistExport.ts)
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
        XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        folderAuditorias.file(`${filename}.xlsx`, excelBuffer);

        // PDF Generation
        onProgress(`Generando PDF de Auditoría ${i + 1} de ${auditorias.length}...`);
        const printDiv = document.createElement('div');
        printDiv.innerHTML = `
          <div style="padding:40px;font-family:Arial,sans-serif;font-size:12px;">
            <h1 style="color:#003366;">Checklist de Calidad – Tanques</h1>
            <p><strong>Fecha:</strong> ${v.fecha} &nbsp;&nbsp; <strong>Proveedor:</strong> ${cod} - ${v.nom}</p>
            <p><strong>Responsable:</strong> ${v.responsable} &nbsp;&nbsp; <strong>Tanque:</strong> ${v.cod_tanque} - ${v.nom_tanque}</p>
            <h2 style="color:#003366;margin-top:20px;">Resultados</h2>
            <p><strong>Cumplimiento:</strong> ${v.pct.toFixed(1)}%</p>
            <p><strong>SI:</strong> ${v.si} | <strong>NO:</strong> ${v.no} | <strong>N/A:</strong> ${v.na}</p>
            <table style="width:100%;text-align:left;border-collapse:collapse;margin-top:10px;font-size:10px;">
              <thead>
                <tr style="background:#003366;color:white;"><th>Pregunta</th><th>Resp</th><th>Obs.</th></tr>
              </thead>
              <tbody>
                ${v.detalles.map(d => `<tr>
                  <td style="border:1px solid #ccc;padding:4px;">${d.pregunta}</td>
                  <td style="border:1px solid #ccc;padding:4px;color:${d.respuesta==='SI'?'green':d.respuesta==='NO'?'red':'black'};"><strong>${d.respuesta||'-'}</strong></td>
                  <td style="border:1px solid #ccc;padding:4px;">${d.observacion||''}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        `;
        
        const opt: any = {
          margin: [5, 0],
          filename: `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        try {
          const pdfBlob = await html2pdf().set(opt).from(printDiv).output('blob');
          folderAuditorias.file(`${filename}.pdf`, pdfBlob);
        } catch (e) {
          console.error("Error generating PDF for auditoria", e);
        }
      }
    }

    // 3. Export Capacitaciones History Data
    const capacitacionesHist = await db.capacitaciones.toArray();
    if (capacitacionesHist.length > 0) {
      onProgress("Generando archivos de Soporte de Capacitaciones...");
      
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const ExcelJS = (await import('exceljs')).default;
      
      for (let i = 0; i < capacitacionesHist.length; i++) {
        const c = capacitacionesHist[i];
        const safeName = (c.bloque1.tema || "Capacitacion").replace(/[^a-z0-9]/gi, '_');
        const filename = `${c.bloque1.fecha || 'SinFecha'}_${safeName.substring(0, 30)}`;
        
        onProgress(`Generando Exportaciones de Capacitación ${i + 1} de ${capacitacionesHist.length}...`);

        // --- EXCEL ---
        const workbook = new ExcelJS.Workbook();
        const ws1 = workbook.addWorksheet('Consolidado', { views: [{ showGridLines: false }] });
        const HEADER_BG = '003366', TEXT_WHITE = 'FFFFFF', TEXT_BLACK = '2C3E50', BORDER_COLOR = 'D5D8DC';
        const headerStyle = { font: { name: 'Arial', size: 11, bold: true, color: { argb: TEXT_WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } as any, border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any };
        const sectionTitleStyle = { font: { name: 'Arial', size: 11, bold: true, color: { argb: TEXT_WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }, alignment: { horizontal: 'left', vertical: 'middle' } as any, border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any };
        const labelStyle = { font: { name: 'Arial', size: 11, bold: true, color: { argb: TEXT_BLACK } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } as any, border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any };
        const valueStyle = { font: { name: 'Arial', size: 11, color: { argb: TEXT_BLACK } }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } as any, border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any };

        ws1.getRow(1).height = 30; ws1.mergeCells('A1:B1');
        const titleCell = ws1.getCell('A1'); titleCell.value = 'SOPORTE DE CAPACITACIONES 0466.VSC.FOR.059';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } }; titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003366' } }; titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.columns = [{ width: 25 }, { width: 80 }, { width: 15 }, { width: 15 }];
        let currentRow = 3;

        function addSection1(title: string) { ws1.mergeCells(`A${currentRow}:B${currentRow}`); ws1.getRow(currentRow).height = 22; const secCell = ws1.getCell(`A${currentRow}`); secCell.value = title; secCell.fill = sectionTitleStyle.fill as any; secCell.font = sectionTitleStyle.font; secCell.alignment = sectionTitleStyle.alignment; secCell.border = sectionTitleStyle.border; currentRow++; }
        function addField1(label: string, value: string) { const row = ws1.getRow(currentRow); row.height = 20; const c1 = ws1.getCell(`A${currentRow}`); c1.value = label; c1.font = labelStyle.font; c1.fill = labelStyle.fill as any; c1.alignment = labelStyle.alignment; c1.border = labelStyle.border; const c2 = ws1.getCell(`B${currentRow}`); c2.value = value || '—'; c2.font = valueStyle.font; c2.alignment = valueStyle.alignment; c2.border = valueStyle.border; currentRow++; }

        addSection1('1. INFORMACIÓN DE LA CAPACITACIÓN'); addField1('Tema', c.bloque1.tema); addField1('Objetivo', c.bloque1.objetivo); addField1('Fecha', c.bloque1.fecha); addField1('Competencia', c.bloque1.competencia); currentRow++;
        addSection1('2. PREPARACIÓN DE LA ACTIVIDAD'); addField1('Lugar', c.bloque2.lugar); addField1('Duración', c.bloque2.duracion ? `${c.bloque2.duracion} horas` : ''); addField1('Facilitadores', (c.bloque2.facilitadores || []).join(', ')); addField1('Responsable', c.bloque2.responsable); addField1('Dirigido a', c.bloque2.dirigido); currentRow++;
        addSection1('3. PROCEDIMIENTOS'); addField1('Actividad', c.bloque4.actividad); addField1('Descripción', c.bloque4.descripcion); addField1('Materiales / Recursos', c.bloque4.materiales); currentRow++;
        addSection1('4. ANÁLISIS DE ASISTENTES');
        
        ['CATEGORÍA', 'TOTAL', '< 30 AÑOS', '> 30 AÑOS'].forEach((h, idx) => { const cell = ws1.getCell(currentRow, idx + 1); cell.value = h; cell.fill = headerStyle.fill as any; cell.font = headerStyle.font; cell.border = headerStyle.border; cell.alignment = headerStyle.alignment; }); currentRow++;
        
        const tot = c.bloque3.asistentes.length;
        const hMasc = c.bloque3.asistentes.filter(a => a.genero === 'M').length; const hFem = c.bloque3.asistentes.filter(a => a.genero === 'F').length;
        const me30 = c.bloque3.asistentes.filter(a => a.edad === 'menor30').length; const ma30 = c.bloque3.asistentes.filter(a => a.edad === 'mayor30').length;
        const hM = c.bloque3.asistentes.filter(a => a.genero === 'M' && a.edad === 'menor30').length; const hMa = c.bloque3.asistentes.filter(a => a.genero === 'M' && a.edad === 'mayor30').length;
        const mMe = c.bloque3.asistentes.filter(a => a.genero === 'F' && a.edad === 'menor30').length; const mMa = c.bloque3.asistentes.filter(a => a.genero === 'F' && a.edad === 'mayor30').length;

        [{ cat: 'Total Asistentes', t: tot, me: me30, ma: ma30 }, { cat: 'Total Hombres', t: hMasc, me: hM, ma: hMa }, { cat: 'Total Mujeres', t: hFem, me: mMe, ma: mMa }].forEach(r => { const c1 = ws1.getCell(currentRow, 1); c1.value = r.cat; c1.font = labelStyle.font; c1.fill = labelStyle.fill as any; c1.border = labelStyle.border; [ws1.getCell(currentRow, 2), ws1.getCell(currentRow, 3), ws1.getCell(currentRow, 4)].forEach((c, idx) => { c.value = [r.t, r.me, r.ma][idx]; c.font = valueStyle.font; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = valueStyle.border; }); currentRow++; });
        const ws2 = workbook.addWorksheet('Asistentes', { views: [{ showGridLines: false }] });
        ws2.mergeCells('A1:I1'); const t2 = ws2.getCell('A1'); t2.value = 'LISTADO COMPLETO DE ASISTENTES'; t2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } }; t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003366' } }; t2.alignment = { horizontal: 'center', vertical: 'middle' }; ws2.getRow(1).height = 25;
        ['No.', 'Nombres Y Apellidos', 'Código Proveedor', 'Edad', 'Género', 'Celular', 'Finca / Empresa', 'Correo Electrónico', 'Firma'].forEach((h, idx) => { ws2.getCell(2, idx + 1).value = h; ws2.getCell(2, idx + 1).fill = headerStyle.fill as any; ws2.getCell(2, idx + 1).font = headerStyle.font; ws2.getCell(2, idx + 1).border = headerStyle.border; });
        for (let j = 0; j < c.bloque3.asistentes.length; j++) {
          const a = c.bloque3.asistentes[j]; const rowNum = j + 3; ws2.getRow(rowNum).height = 45;
          [j + 1, a.nombre, a.codigo, a.edad === 'menor30' ? '< 30' : '> 30', a.genero === 'M' ? 'Masculino' : 'Femenino', a.celular, a.finca, a.correo].forEach((v, idx) => { ws2.getCell(rowNum, idx + 1).value = v; ws2.getCell(rowNum, idx + 1).font = { name: 'Arial', size: 9 }; ws2.getCell(rowNum, idx + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; ws2.getCell(rowNum, idx + 1).border = { top: { style: 'thin', color: { argb: 'D5D8DC' } }, bottom: { style: 'thin', color: { argb: 'D5D8DC' } }, left: { style: 'thin', color: { argb: 'D5D8DC' } }, right: { style: 'thin', color: { argb: 'D5D8DC' } } } as any; });
          ws2.getCell(rowNum, 9).border = { top: { style: 'thin', color: { argb: 'D5D8DC' } }, bottom: { style: 'thin', color: { argb: 'D5D8DC' } }, left: { style: 'thin', color: { argb: 'D5D8DC' } }, right: { style: 'thin', color: { argb: 'D5D8DC' } } } as any;
          if (a.firma) { try { const base64Data = a.firma.split(',')[1]; const imageId = workbook.addImage({ base64: base64Data, extension: 'png' }); ws2.addImage(imageId, { tl: { col: 8.1, row: rowNum - 0.9 } as any, br: { col: 8.9, row: rowNum - 0.1 } as any, editAs: 'oneCell' }); } catch(e) {} }
        }
        ws2.columns = [{ width: 5 }, { width: 30 }, { width: 12 }, { width: 6 }, { width: 10 }, { width: 12 }, { width: 22 }, { width: 22 }, { width: 15 }];

        const excelBuffer2 = await workbook.xlsx.writeBuffer();
        folderCapacitaciones.file(`${filename}.xlsx`, excelBuffer2);

        // --- PDF ---
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter', compress: true });
        const pageW = doc.internal.pageSize.getWidth(); const margin = 12; let yPos = 18;
        doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageW, 12, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('SOPORTE DE CAPACITACIONES 0466.VSC.FOR.059', pageW / 2, 7, { align: 'center' });
        
        // --- SECTION 1 ---
        autoTable(doc, {
          startY: yPos,
          head: [['1. INFORMACIÓN DE LA CAPACITACIÓN', '']],
          body: [
            ['Tema', c.bloque1.tema],
            ['Objetivo', c.bloque1.objetivo],
            ['Fecha', c.bloque1.fecha],
            ['Competencia', c.bloque1.competencia]
          ],
          theme: 'grid',
          styles: { overflow: 'linebreak', fontSize: 10, cellPadding: 2, font: 'helvetica' },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;

        // --- SECTION 2 ---
        autoTable(doc, {
          startY: yPos,
          head: [['2. PREPARACIÓN DE LA ACTIVIDAD', '']],
          body: [
            ['Lugar', c.bloque2.lugar],
            ['Duración', c.bloque2.duracion ? `${c.bloque2.duracion} horas` : '—'],
            ['Facilitadores', (c.bloque2.facilitadores || []).join(', ')],
            ['Responsable', c.bloque2.responsable],
            ['Dirigido a', c.bloque2.dirigido]
          ],
          theme: 'grid',
          styles: { overflow: 'linebreak', fontSize: 10, cellPadding: 2, font: 'helvetica' },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;

        // --- SECTION 3 ---
        autoTable(doc, {
          startY: yPos,
          head: [['3. PROCEDIMIENTOS', '']],
          body: [
            ['Actividad', c.bloque4.actividad],
            ['Descripción', c.bloque4.descripcion],
            ['Materiales', c.bloque4.materiales]
          ],
          theme: 'grid',
          styles: { overflow: 'linebreak', fontSize: 10, cellPadding: 2, font: 'helvetica' },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;

        // --- SECTION 4 ---
        autoTable(doc, { 
          startY: yPos, 
          head: [['4. ANÁLISIS DE ASISTENTES', '', '', ''], ['CATEGORIA', 'TOTAL', '< 30 AÑOS', '> 30 AÑOS']], 
          body: [['Total Asistentes', tot, me30, ma30], ['Total Hombres', hMasc, hM, hMa], ['Total Mujeres', hFem, mMe, mMa]], 
          theme: 'grid', 
          styles: { fontSize: 9, cellPadding: 2, halign: 'center', font: 'helvetica' }, 
          headStyles: { fillColor: [0, 51, 102], textColor: 255 }, 
          margin: { left: margin, right: margin }, 
          columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.row.index === 0) {
              data.cell.styles.halign = 'left';
              if (data.column.index > 0) data.cell.text = [];
            }
          }
        });
        const finalY4 = (doc as any).lastAutoTable.finalY || yPos + 20;
        
        // Add Pie Chart to Backup PDF
        const asistentes = c.bloque3.asistentes;
        const hCount = asistentes.filter(a => a.genero === 'M').length;
        const muCount = asistentes.filter(a => a.genero === 'F').length;
        const totalAsis = hCount + muCount;

        if (totalAsis > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = 600; canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 600, 400);
            const cx = 170, cy = 200, r = 140;
            let sa = -Math.PI / 2;
            if (hCount > 0) {
              const ang = (hCount / totalAsis) * 2 * Math.PI;
              ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, sa + ang); ctx.closePath();
              ctx.fillStyle = '#3498DB'; ctx.fill();
              const mid = sa + ang / 2;
              ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(`${((hCount / totalAsis) * 100).toFixed(1)}%`, cx + Math.cos(mid) * r * 0.6, cy + Math.sin(mid) * r * 0.6);
              sa += ang;
            }
            if (muCount > 0) {
              const ang = (muCount / totalAsis) * 2 * Math.PI;
              ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, sa + ang); ctx.closePath();
              ctx.fillStyle = '#E91E63'; ctx.fill();
              const mid = sa + ang / 2;
              ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(`${((muCount / totalAsis) * 100).toFixed(1)}%`, cx + Math.cos(mid) * r * 0.6, cy + Math.sin(mid) * r * 0.6);
            }
            ctx.fillStyle = '#2C3E50'; ctx.font = '22px Arial'; ctx.textAlign = 'left';
            if(hCount>0) { ctx.fillStyle = '#3498DB'; ctx.fillRect(360, 40, 28, 28); ctx.fillStyle = '#2C3E50'; ctx.fillText(`Hombres: ${hCount}`, 400, 64); }
            if(muCount>0) { ctx.fillStyle = '#E91E63'; ctx.fillRect(360, 80, 28, 28); ctx.fillStyle = '#2C3E50'; ctx.fillText(`Mujeres: ${muCount}`, 400, 104); }
            
            const chartData = canvas.toDataURL('image/jpeg', 0.9);
            const pieW = 100, pieH = 70;
            const centerX = (pageW - pieW) / 2;
            let chartY = finalY4 + 20;
            const pageHe = doc.internal.pageSize.getHeight();
            if (chartY + pieH > pageHe - 20) { doc.addPage(); chartY = 20; }
            try { doc.addImage(chartData, 'JPEG', centerX, chartY, pieW, pieH, undefined, 'FAST'); } catch(e) {}
          }
        }
        
        doc.addPage(); yPos = 15;
        doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageW, 12, 'F'); doc.setTextColor(255, 255, 255); doc.text('LISTADO COMPLETO DE ASISTENTES', pageW / 2, 7, { align: 'center' });
        const bodyData: any[] = [];
        c.bloque3.asistentes.forEach((a, j) => { bodyData.push([j + 1, a.nombre, a.codigo, a.edad === 'menor30' ? '< 30' : '> 30', a.genero === 'M' ? 'Masculino' : 'Femenino', a.celular, a.finca, a.correo, '']); });
        autoTable(doc, { 
          startY: yPos, 
          head: [['No.', 'Nombres Y Apellidos', 'Código Proveedor', 'Edad', 'Género', 'Celular', 'Finca / Empresa', 'Correo Electrónico', 'Firma']], 
          body: bodyData, 
          theme: 'grid', 
          styles: { fontSize: 7.5, cellPadding: 2, halign: 'center', font: 'helvetica', minCellHeight: 12 }, 
          headStyles: { fillColor: [0, 51, 102], textColor: 255 }, 
          columnStyles: { 0: { cellWidth: 8 }, 1: { halign: 'left', cellWidth: 55 }, 2: { cellWidth: 22 }, 3: { cellWidth: 15 }, 4: { cellWidth: 22 }, 5: { cellWidth: 25 }, 6: { halign: 'left', cellWidth: 35 }, 7: { halign: 'left', cellWidth: 40 }, 8: { cellWidth: 30 } }, 
          margin: { left: margin, right: margin },
          didDrawCell: (data) => {
            if (data.column.index === 8 && data.cell.section === 'body') {
              const signature = c.bloque3.asistentes[data.row.index].firma;
              if (signature) {
                try {
                  doc.addImage(signature, 'JPEG', data.cell.x + 3.5, data.cell.y + 2, 18, 8, undefined, 'FAST');
                } catch (e) {}
              }
            }
          }
        });
        
        const pdfArrayBuffer = doc.output('arraybuffer');
        folderCapacitaciones.file(`${filename}.pdf`, pdfArrayBuffer);
      }
    }

    onProgress("Comprimiendo el archivo .zip...");
    const content = await zip.generateAsync({ type: 'blob' });
    const today = new Date().toISOString().split('T')[0];
    saveAs(content, `Respaldo_Gestion_Asesores_${today}.zip`);
    onProgress(""); // clear progress
    return true;
  } catch (error) {
    console.error("Error generating backup:", error);
    onProgress("");
    throw error;
  }
}
