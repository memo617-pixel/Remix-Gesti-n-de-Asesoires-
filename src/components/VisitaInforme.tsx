import React, { useState } from 'react';
import { ArrowLeft, MapPin, Crosshair, Target, ListChecks, Lightbulb, MessageSquare, PenTool, Plus, History, Save, Trash2, FileSpreadsheet, FileText, X, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx-js-style';
import html2pdf from 'html2pdf.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, VisitaGeneralData } from '../lib/db';
import SignaturePad from './SignaturePad';
import { compressImage } from '../lib/imageUtils';
import { Visita, TEMAS_DISPONIBLES } from '../types/visita';

interface VisitaInformeProps {
  onBack: () => void;
}

export default function VisitaInforme({ onBack }: VisitaInformeProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Dexie live queries (replaces localStorage visitas state)
  const visitas = (useLiveQuery(() => db.visitas.reverse().toArray(), []) as Visita[]) || [];
  
  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [codigo, setCodigo] = useState('');
  const [ruta, setRuta] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [genero, setGenero] = useState('');
  const [edad, setEdad] = useState('');
  const [selectedTemas, setSelectedTemas] = useState<Set<string>>(new Set());
  const [otros, setOtros] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [actividades, setActividades] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [lat, setLat] = useState<string | null>(null);
  const [lng, setLng] = useState<string | null>(null);
  const [alt, setAlt] = useState<number | null>(null);
  const [firmaProveedor, setFirmaProveedor] = useState('');
  const [firmaAsesor, setFirmaAsesor] = useState('');
  const [nombreAsesor, setNombreAsesor] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  // UI State
  const [isLocating, setIsLocating] = useState(false);
  const [sigModalType, setSigModalType] = useState<'prov' | 'asesor' | null>(null);
  const [detailVisit, setDetailVisit] = useState<Visita | null>(null);

  const toggleTema = (id: string) => {
    const newSet = new Set(selectedTemas);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTemas(newSet);
  };

  const getLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("❌ Tu dispositivo no soporta GPS");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setAlt(position.coords.altitude ? Math.round(position.coords.altitude) : null);
        setIsLocating(false);
      },
      (error) => {
        alert("⚠️ No se pudo obtener la ubicación. Por favor, asegúrate de tener el GPS encendido en tu celular.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!proveedor.trim()) {
      alert("⚠️ Por favor ingresa el nombre del Proveedor.");
      return;
    }

    const visita: Visita = {
      id: editingId || Date.now(),
      fecha,
      codigo,
      ruta,
      proveedor: proveedor.toUpperCase(),
      telefono,
      genero,
      edad,
      temas: Array.from(selectedTemas).map(id => TEMAS_DISPONIBLES.find(t => t.id === id)?.label || ''),
      otros,
      objetivo,
      actividades,
      recomendaciones,
      comentarios,
      lat,
      lng,
      alt,
      firmaProveedor,
      firmaAsesor,
      nombreAsesor: nombreAsesor.toUpperCase(),
      fotos
    };

    try {
      const dataToSave = { ...visita } as VisitaGeneralData;
      if (editingId) {
        await db.visitas.put(dataToSave);
        alert("✅ Cambios guardados y actualizados.");
      } else {
        await db.visitas.add(dataToSave);
        alert("✅ Informe guardado con éxito.");
      }
      startNew();
      setActiveTab('history');
    } catch (error) {
      console.error("Error al guardar en IndexDB:", error);
      alert("❌ Hubo un error al guardar los datos localmente.");
    }
  };

  const startNew = () => {
    setEditingId(null);
    setFecha(new Date().toISOString().split('T')[0]);
    setCodigo('');
    setRuta('');
    setProveedor('');
    setTelefono('');
    setGenero('');
    setEdad('');
    setSelectedTemas(new Set());
    setOtros('');
    setObjetivo('');
    setActividades('');
    setRecomendaciones('');
    setComentarios('');
    setLat(null);
    setLng(null);
    setAlt(null);
    setFirmaProveedor('');
    setFirmaAsesor('');
    setNombreAsesor('');
    setFotos([]);
    setActiveTab('form');
  };

  const editVisit = (v: Visita) => {
    setEditingId(v.id);
    setFecha(v.fecha);
    setCodigo(v.codigo);
    setRuta(v.ruta);
    setProveedor(v.proveedor);
    setTelefono(v.telefono || '');
    setGenero(v.genero || '');
    setEdad(v.edad || '');
    
    const newTemas = new Set<string>();
    v.temas.forEach(lbl => {
      const t = TEMAS_DISPONIBLES.find(x => x.label === lbl);
      if (t) newTemas.add(t.id);
    });
    setSelectedTemas(newTemas);
    
    setOtros(v.otros);
    setObjetivo(v.objetivo);
    setActividades(v.actividades);
    setRecomendaciones(v.recomendaciones);
    setComentarios(v.comentarios);
    setLat(v.lat);
    setLng(v.lng);
    setAlt(v.alt);
    setFirmaProveedor(v.firmaProveedor);
    setFirmaAsesor(v.firmaAsesor);
    setNombreAsesor(v.nombreAsesor || '');
    setFotos(v.fotos || []);
    
    setDetailVisit(null);
    setActiveTab('form');
  };

  const deleteVisit = async (id: number) => {
    if (confirm('¿Seguro que deseas eliminar esta visita?')) {
      try {
        const numericId = Number(id);
        await db.visitas.delete(numericId);
        alert('✅ Visita eliminada.');
      } catch (error) {
        console.error("Error al eliminar", error);
        alert('❌ Error al eliminar.');
      }
    }
  };

  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const pos = target.selectionStart;
      const val = target.value;
      const newVal = val.substring(0, pos) + '\n• ' + val.substring(pos);
      
      if (target.id === 'objetivo') setObjetivo(newVal);
      else if (target.id === 'actividades') setActividades(newVal);
      else if (target.id === 'recomendaciones') setRecomendaciones(newVal);
      else if (target.id === 'comentarios') setComentarios(newVal);
      
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = pos + 3;
      }, 0);
    }
  };

  const handleTextAreaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (e.target.value.trim() === '') {
      if (e.target.id === 'objetivo') setObjetivo('• ');
      else if (e.target.id === 'actividades') setActividades('• ');
      else if (e.target.id === 'recomendaciones') setRecomendaciones('• ');
      else if (e.target.id === 'comentarios') setComentarios('• ');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    if (fotos.length + files.length > 6) {
      alert("⚠️ Solo puedes adjuntar un máximo de 6 fotos.");
      return;
    }

    const fileList = Array.from(files) as File[];
    const newFotos = [...fotos];
    
    for (const file of fileList) {
        if (newFotos.length < 6) {
            try {
                const base64 = await compressImage(file, 800, 0.7);
                newFotos.push(base64);
            } catch (err) {
                console.error("Error al procesar la imagen", err);
                alert("Hubo un error al procesar una imagen.");
            }
        }
    }
    setFotos(newFotos);
    
    // Reset file input so the same file could be selected again if needed
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const applyExcelStyles = (ws: any, dataRows: any[][]) => {
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Auto-fit columns
    const colWidths: any[] = [];
    if (dataRows.length > 0) {
      const numCols = dataRows[0].length;
      for (let i = 0; i < numCols; i++) {
        let maxLen = String(dataRows[0][i] || "").length;
        for (let j = 1; j < dataRows.length; j++) {
          const val = String(dataRows[j][i] || "");
          if (val.length > maxLen) maxLen = val.length;
        }
        colWidths.push({ wch: Math.min(Math.max(maxLen + 4, 15), 60) });
      }
      ws['!cols'] = colWidths;
    }
    
    ws['!view'] = [{ showGridLines: false }];

    const headerStyle = {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "002B5C" }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const bodyStyle = {
      font: { name: "Arial", sz: 12 },
      fill: { fgColor: { rgb: "FFFFFF" }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "left", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = (R === 0) ? headerStyle : bodyStyle;
      }
    }
  };

  const exportAllExcel = () => {
    if (visitas.length === 0) return alert("No hay visitas para exportar.");
    
    // Header row
    const ws_data: any[][] = [
      ["Fecha", "Código", "Ruta", "Proveedor", "Teléfono", "Género", "Edad", "Temas Tratados", "Otros Temas", "Objetivo", "Actividades", "Recomendaciones", "Comentarios", "Latitud", "Longitud", "Altitud (m.s.n.m)"]
    ];

    // Data rows
    visitas.forEach(v => {
      ws_data.push([
        v.fecha, v.codigo, v.ruta, v.proveedor, v.telefono, v.genero, v.edad, 
        v.temas.join(" | "), v.otros, v.objetivo, v.actividades, v.recomendaciones, 
        v.comentarios, v.lat || 'N/A', v.lng || 'N/A', v.alt || 'N/A'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    applyExcelStyles(ws, ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Todas las Visitas");
    XLSX.writeFile(wb, "Historial_Visitas_General.xlsx");
  };

  const exportSingleExcel = (v: Visita) => {
    // Header row
    const ws_data: any[][] = [
      ["Fecha", "Código", "Ruta", "Proveedor", "Teléfono", "Género", "Edad", "Temas Tratados", "Otros Temas", "Objetivo", "Actividades", "Recomendaciones", "Comentarios", "Latitud", "Longitud", "Altitud (m.s.n.m)"]
    ];

    // Data row
    ws_data.push([
      v.fecha, v.codigo, v.ruta, v.proveedor, v.telefono, v.genero, v.edad, 
      v.temas.join(" | "), v.otros, v.objetivo, v.actividades, v.recomendaciones, 
      v.comentarios, v.lat || 'N/A', v.lng || 'N/A', v.alt || 'N/A'
    ]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    applyExcelStyles(ws, ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visita");
    XLSX.writeFile(wb, `Visita_${(v.proveedor || "Finca").replace(/ /g, '_')}.xlsx`);
  };

  const exportSinglePDF = async (v: Visita) => {
    let iconoBase64 = "/nestle-logo.png";
    try {
      // Intentamos obtener la imagen desde la caché del Service Worker y convertirla a Base64
      const response = await fetch("/nestle-logo.png");
      if (response.ok) {
        const blob = await response.blob();
        iconoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn("Usando ruta relativa como respaldo para el logo:", e);
    }

    const printDiv = document.createElement('div');
    // Para PDF es mejor no inyectar en el dom principal si no es necesario o usar opacidad 0
    printDiv.innerHTML = `
        <div style="padding: 40px; font-family: 'Helvetica', Arial, sans-serif; color: #222; background: white; width: 800px; box-sizing: border-box;">
            <table style="width: 100%; border-bottom: 3px solid #003087; padding-bottom: 15px; margin-bottom: 25px;">
                <tr>
                    <td style="vertical-align: top;">
                        <h2 style="color: #003087; margin: 0; font-size: 22px; text-transform: uppercase; font-weight: bold;">INFORME DE VISITA A FINCA</h2>
                        <span style="color: #666; font-size: 14px;">Milk Sourcing Colombia</span>
                    </td>
                    <td style="vertical-align: top; text-align: right;">
                        <img src="${iconoBase64}" style="height: 80px; width: auto; max-width: 200px; object-fit: contain;">
                    </td>
                </tr>
            </table>
            <table style="width: 100%; margin-bottom: 25px; font-size: 13px; border-collapse: collapse;">
                <tr><td style="padding: 8px; border: 1px solid #eee; width: 50%;"><b>Proveedor:</b> <span style="text-transform:uppercase;">${v.proveedor}</span></td><td style="padding: 8px; border: 1px solid #eee; width: 50%;"><b>Fecha:</b> ${v.fecha}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><b>Teléfono:</b> ${v.telefono || '-'}</td><td style="padding: 8px; border: 1px solid #eee;"><b>Código Finca:</b> ${v.codigo || '-'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><b>Ruta:</b> ${v.ruta || '-'}</td><td style="padding: 8px; border: 1px solid #eee;"></td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;" colspan="2"><b>Coordenadas GPS:</b> ${v.lat ? v.lat + ', ' + v.lng : 'No registradas'} <br><b style="margin-top:4px; display:inline-block;">Altitud:</b> ${v.alt !== null ? v.alt + ' m.s.n.m' : 'No registrada'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee; background: #f8fafc;" colspan="2"><b>Temas Tratados:</b> ${v.temas.join(' | ')} ${v.otros ? '| Otros: ' + v.otros : ''}</td></tr>
            </table>
            ${v.objetivo ? '<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">OBJETIVO</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.objetivo + '</p></div>' : ''}
            ${v.actividades ? '<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ACTIVIDADES REALIZADAS</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.actividades + '</p></div>' : ''}
            ${v.recomendaciones ? '<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">RECOMENDACIONES</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.recomendaciones + '</p></div>' : ''}
            ${v.comentarios ? '<div style="margin-bottom: 25px;"><h4 style="margin: 0 0 5px 0; color: #003087; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">COMENTARIOS</h4><p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-line;">' + v.comentarios + '</p></div>' : ''}
            <table style="width: 100%; margin-top: 50px; text-align: center; font-size: 14px; page-break-inside: avoid;">
                <tr>
                    <td style="width: 50%; padding: 10px; vertical-align: bottom;">
                        ${v.firmaProveedor && v.firmaProveedor.length > 1500 ? '<img src="' + v.firmaProveedor + '" style="height: 80px; max-width: 100%; object-fit: contain; margin: 0 auto; display: block;">' : '<div style="height:80px;"></div>'}
                        <hr style="width: 70%; border: 1px solid #000; margin: 5px auto;">
                        <div><b>Firma Proveedor / Responsable</b></div>
                        <div style="font-size: 11px; color: #666; margin-top: 2px;">Persona quien atendió</div>
                    </td>
                    <td style="width: 50%; padding: 10px; vertical-align: bottom;">
                        ${v.firmaAsesor && v.firmaAsesor.length > 1500 ? '<img src="' + v.firmaAsesor + '" style="height: 80px; max-width: 100%; object-fit: contain; margin: 0 auto; display: block;">' : '<div style="height:80px;"></div>'}
                        <hr style="width: 70%; border: 1px solid #000; margin: 5px auto;">
                        <div><b>Firma Asesor Milk Sourcing</b></div>
                        <div style="margin-top: 5px; font-weight: bold;">${v.nombreAsesor ? v.nombreAsesor.toUpperCase() : ''}</div>
                    </td>
                </tr>
            </table>
            <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                Documento generado digitalmente - App Milk Sourcing - ${new Date().toLocaleDateString('es-CO')} <br>
                <b style="color: #666;">VERSION JUAN 1.0</b>
            </div>
        </div>
        ${v.fotos && v.fotos.length > 0 ? `
        <div class="html2pdf__page-break"></div>
        <div style="padding: 40px; font-family: 'Helvetica', Arial, sans-serif; color: #222; background: white; page-break-before: always; width: 800px; box-sizing: border-box;">
            <h2 style="color: #003087; text-align: center; font-size: 20px; text-transform: uppercase; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">REGISTRO FOTOGRÁFICO</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; justify-content: flex-start;">
                ${v.fotos.map((foto, idx) => `
                    <div style="border: 1px solid #ddd; padding: 5px; border-radius: 8px; text-align: center; width: 220px; margin-bottom: 15px; background: #fafafa;">
                        <img src="${foto}" style="width: 100%; height: auto; max-height: 350px; object-fit: contain; border-radius: 4px; display: block; margin: 0 auto;">
                        <div style="margin-top: 8px; font-size: 11px; color: #666; font-weight: bold; border-top: 1px solid #eee; padding-top: 5px;">Foto ${idx + 1}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;
    
    const opciones = { 
      margin: 0, 
      filename: `Reporte_${(v.proveedor||"Finca").replace(/ /g, '_')}.pdf`, 
      image: { type: 'jpeg' as const, quality: 0.98 }, 
      html2canvas: { scale: 2, useCORS: true, logging: false }, 
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const } 
    };

    try {
      await html2pdf().set(opciones).from(printDiv).save();
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      alert("❌ Error al generar el PDF. Reintenta por favor.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      <header className="bg-[#003087] text-white p-4 flex items-center shadow-md shrink-0">
        <button onClick={onBack} className="mr-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg tracking-wider">INFORME DE VISITAS</h1>
          <div className="text-[10px] opacity-90 -mt-0.5">Milk Sourcing</div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f8f1e3] relative">
        {activeTab === 'form' ? (
          <div className="p-4 space-y-6">
            {/* Formulario */}
            <div className="bg-white rounded-2xl shadow p-5 space-y-4 border-2 border-gray-200 border-b-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-2 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Código</label>
                  <input type="text" inputMode="numeric" value={codigo} onChange={e => setCodigo(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Ej. 12345" className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ruta</label>
                  <input type="text" value={ruta} onChange={e => setRuta(e.target.value)} placeholder="Ruta" className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Proveedor / Ganadero</label>
                <input type="text" value={proveedor} onChange={e => setProveedor(e.target.value.toUpperCase())} placeholder="Nombre del proveedor" className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all uppercase tracking-wider bg-transparent font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono</label>
                <input type="text" inputMode="numeric" value={telefono} onChange={e => setTelefono(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Ej. 3001234567" className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Género</label>
                  <select value={genero} onChange={e => setGenero(e.target.value)} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-2 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium">
                    <option value="">Seleccione...</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Edad</label>
                  <select value={edad} onChange={e => setEdad(e.target.value)} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-2 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium">
                    <option value="">Seleccione...</option>
                    <option value="Mayor de 30 años">Mayor de 30 años</option>
                    <option value="Menor de 30 años">Menor de 30 años</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Temas */}
            <div>
              <div className="bg-[#4a2c0b] text-white px-4 py-3 rounded-t-2xl font-bold text-sm shadow-inner border-b-4 border-[#3a2208]">Tema de la Visita</div>
              <div className="bg-white p-4 grid grid-cols-2 gap-3 border-x-2 border-gray-200">
                {TEMAS_DISPONIBLES.map((t, index) => (
                  <button
                    key={`${t.id}-${index}`}
                    onClick={() => toggleTema(t.id)}
                    className={`flex items-center gap-2 border-2 px-3 py-3 rounded-2xl text-[12px] font-bold transition-all active:translate-y-1 active:border-b-2 ${selectedTemas.has(t.id) ? 'bg-[#63513d] text-white border-[#4a2c0b] border-b-4 shadow-[0_4px_0_0_#4a2c0b]' : 'bg-white text-gray-700 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] hover:bg-gray-50'}`}
                  >
                    <span className="text-xl drop-shadow-md">{t.icon}</span>
                    <span className="text-left leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="bg-white px-4 pb-4 rounded-b-2xl border-x-2 border-b-4 border-gray-200 shadow-[0_4px_0_0_#e5e7eb]">
                <label className="block text-xs font-bold text-gray-500 mb-1 mt-2">Otros</label>
                <input type="text" value={otros} onChange={e => setOtros(e.target.value)} placeholder="Especifique si aplica" className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium" />
              </div>
            </div>

            {/* GPS */}
            <div className="bg-white rounded-2xl shadow p-5 border-2 border-gray-200 border-b-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
                  <MapPin className="w-4 h-4 text-emerald-600 drop-shadow-sm" />
                  <span>COORDENADAS GPS</span>
                </div>
                <button onClick={getLocation} disabled={isLocating} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-bold border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0">
                  <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} /> {isLocating ? 'Obteniendo...' : 'Obtener'}
                </button>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2 border-2 border-gray-100 shadow-inner">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500 font-bold">Latitud:</span>
                  <span className="font-mono text-gray-800">{lat || '--'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500 font-bold">Longitud:</span>
                  <span className="font-mono text-gray-800">{lng || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Altitud:</span>
                  <span className="font-mono text-gray-800 font-bold text-blue-600">{alt !== null ? alt + ' m.s.n.m' : '--'}</span>
                </div>
              </div>
            </div>

            {/* Textareas */}
            <div className="bg-white rounded-2xl shadow p-5 border-2 border-gray-200 border-b-4">
              <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-blue-600 drop-shadow-sm" /><span className="font-extrabold text-sm tracking-tight">OBJETIVO</span></div>
              <textarea id="objetivo" value={objetivo} onChange={e => setObjetivo(e.target.value)} onKeyDown={handleTextAreaKeyDown} onFocus={handleTextAreaFocus} rows={3} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all bg-transparent font-medium" placeholder="Escribe el objetivo..." />
            </div>
            <div className="bg-white rounded-2xl shadow p-5 border-2 border-gray-200 border-b-4">
              <div className="flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4 text-amber-600 drop-shadow-sm" /><span className="font-extrabold text-sm tracking-tight">ACTIVIDADES REALIZADAS</span></div>
              <textarea id="actividades" value={actividades} onChange={e => setActividades(e.target.value)} onKeyDown={handleTextAreaKeyDown} onFocus={handleTextAreaFocus} rows={4} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-2xl p-4 text-sm focus:outline-none focus:border-amber-600 focus:shadow-[0_4px_0_0_#d97706] transition-all bg-transparent font-medium" placeholder="Describe las actividades..." />
            </div>
            <div className="bg-white rounded-2xl shadow p-5 border-2 border-gray-200 border-b-4">
              <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-yellow-500 drop-shadow-sm" /><span className="font-extrabold text-sm tracking-tight">RECOMENDACIONES</span></div>
              <textarea id="recomendaciones" value={recomendaciones} onChange={e => setRecomendaciones(e.target.value)} onKeyDown={handleTextAreaKeyDown} onFocus={handleTextAreaFocus} rows={3} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-2xl p-4 text-sm focus:outline-none focus:border-yellow-500 focus:shadow-[0_4px_0_0_#eab308] transition-all bg-transparent font-medium" placeholder="Recomendaciones..." />
            </div>
            <div className="bg-white rounded-2xl shadow p-5 border-2 border-gray-200 border-b-4">
              <div className="flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-purple-600 drop-shadow-sm" /><span className="font-extrabold text-sm tracking-tight">COMENTARIOS</span></div>
              <textarea id="comentarios" value={comentarios} onChange={e => setComentarios(e.target.value)} onKeyDown={handleTextAreaKeyDown} onFocus={handleTextAreaFocus} rows={3} className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-600 focus:shadow-[0_4px_0_0_#9333ea] transition-all bg-transparent font-medium" placeholder="Comentarios adicionales..." />
            </div>

            {/* Firmas */}
            <div className="bg-white rounded-2xl shadow p-5 space-y-4 border-2 border-gray-200 border-b-4">
              <div className="text-sm font-extrabold text-gray-700 mb-2 border-b-2 border-gray-100 pb-2 flex items-center gap-2 tracking-tight"><PenTool className="w-4 h-4 text-blue-600 drop-shadow-sm" /> FIRMAS DIGITALES</div>
              <button onClick={() => setSigModalType('prov')} className="w-full border-2 border-dashed border-blue-400 border-b-4 bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all active:translate-y-1 active:border-b-2 shadow-sm">
                <PenTool className="w-6 h-6 drop-shadow-sm" />
                <span>Firma del Proveedor</span>
                {firmaProveedor.length > 1500 && <span className="text-emerald-600 text-xs mt-1 font-bold bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">✅ Guardada Exitosamente</span>}
              </button>
              <button onClick={() => setSigModalType('asesor')} className="w-full border-2 border-dashed border-blue-400 border-b-4 bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all active:translate-y-1 active:border-b-2 shadow-sm">
                <PenTool className="w-6 h-6 drop-shadow-sm" />
                <span>Firma del Asesor</span>
                {firmaAsesor.length > 1500 && <span className="text-emerald-600 text-xs mt-1 font-bold bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">✅ Guardada Exitosamente</span>}
              </button>
              <div>
                <label className="text-sm font-extrabold text-gray-700 mb-2 border-b-2 border-gray-100 pb-2 flex items-center gap-2 tracking-tight">NOMBRE DEL ASESOR</label>
                <input type="text" value={nombreAsesor} onChange={e => setNombreAsesor(e.target.value.toUpperCase())} placeholder="Nombre del asesor" className="w-full border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#e5e7eb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_4px_0_0_#2563eb] transition-all uppercase tracking-wider bg-transparent font-medium" />
              </div>

              {/* Registro Fotográfico */}
              <div className="pt-2 border-t-2 border-gray-100 mt-4">
                <label className="text-sm font-extrabold text-gray-700 mb-3 border-b-2 border-gray-100 pb-2 flex items-center justify-between tracking-tight">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-600 drop-shadow-sm" /> 
                    REGISTRO FOTOGRÁFICO
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{fotos.length}/6</span>
                </label>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {fotos.map((imgBase64, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                      <img src={imgBase64} alt={`foto-${i}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {fotos.length < 6 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 hover:bg-emerald-100 flex flex-col items-center justify-center text-emerald-600 cursor-pointer transition-colors">
                      <Camera className="w-6 h-6 mb-1 opacity-80" />
                      <span className="text-[10px] font-bold">Adjuntar</span>
                      <input type="file" accept="image/jpeg, image/png, image/jpg, image/webp" multiple onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Historial</h2>
                <button onClick={exportAllExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-bold shadow-[0_4px_0_0_#065f46] border-b-4 border-emerald-800 hover:bg-emerald-500 transition-all active:border-b-0 active:translate-y-1">
                  <FileSpreadsheet className="w-4 h-4 drop-shadow-sm" /> EXPORTAR TODO
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                {visitas.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No tienes visitas guardadas</p>
                  </div>
                ) : (
                  visitas.map((v, index) => (
                    <div key={`${v.id}-${index}`} onClick={() => setDetailVisit(v)} className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-md transition flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800">{v.proveedor}</div>
                          <div className="text-xs text-gray-500 font-medium">{v.fecha} | Cód: {v.codigo || 'S/N'}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteVisit(v.id); }} className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {v.temas.length > 0 && (
                        <div className="text-[11px] text-white bg-[#63513d] px-2 py-1 rounded-md self-start">
                          {v.temas.slice(0, 2).join(', ')}{v.temas.length > 2 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <div className="bg-white border-t-2 border-gray-200 h-16 flex items-center px-4 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-30">
        <button onClick={startNew} className={"flex-1 flex flex-col items-center justify-center transition-all active:scale-95 " + (activeTab === 'form' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600')}>
          <Plus className="w-6 h-6 drop-shadow-sm" />
          <span className="text-[10px] font-extrabold mt-1 tracking-wider">NUEVA</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={"flex-1 flex flex-col items-center justify-center transition-all active:scale-95 " + (activeTab === 'history' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600')}>
          <History className="w-6 h-6 drop-shadow-sm" />
          <span className="text-[10px] font-extrabold mt-1 tracking-wider">HISTORIAL</span>
        </button>
        <button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-12 rounded-3xl font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1">
          <Save className="w-5 h-5 drop-shadow-sm" />
          <span className="tracking-wider">GUARDAR</span>
        </button>
      </div>

      {/* Modals */}
      {sigModalType && (
        <SignaturePad 
          title={sigModalType === 'prov' ? 'Firma del Proveedor' : 'Firma del Asesor'}
          initialData={sigModalType === 'prov' ? firmaProveedor : firmaAsesor}
          onSave={(data) => {
            if (sigModalType === 'prov') setFirmaProveedor(data);
            else setFirmaAsesor(data);
            setSigModalType(null);
          }}
          onClose={() => setSigModalType(null)}
        />
      )}

      {detailVisit && (
        <div key={`detail-modal-${detailVisit.id}`} className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col relative">
            <div className="p-4 border-b flex items-center justify-between bg-emerald-50 shrink-0">
              <div className="font-bold text-emerald-800 flex items-center gap-2"><FileText className="w-5 h-5" /> Detalle de Visita</div>
              <button onClick={() => setDetailVisit(null)} className="w-8 h-8 flex items-center justify-center text-2xl leading-none text-emerald-800 bg-emerald-200 hover:bg-emerald-300 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-auto flex-1 space-y-5 text-sm">
              <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-4">
                <div><span className="text-xs text-gray-400 uppercase font-bold">Fecha</span><br/><span className="font-medium text-gray-800">{detailVisit.fecha}</span></div>
                <div><span className="text-xs text-gray-400 uppercase font-bold">Proveedor</span><br/><span className="font-medium text-gray-800">{detailVisit.proveedor}</span></div>
                <div><span className="text-xs text-gray-400 uppercase font-bold">Cód/Ruta</span><br/><span className="font-medium text-gray-800">{detailVisit.codigo || '-'} / {detailVisit.ruta || '-'}</span></div>
                <div><span className="text-xs text-gray-400 uppercase font-bold">GPS / Alt</span><br/><span className="font-medium text-gray-800">{detailVisit.lat ? '📍 Sí' : 'No'} / {detailVisit.alt !== null ? detailVisit.alt+'m' : '-'}</span></div>
              </div>
              {detailVisit.temas.length > 0 && (
                <div>
                  <div className="text-xs uppercase font-bold text-gray-400 mb-2">Temas Tratados</div>
                  <div className="flex flex-wrap gap-2">
                    {detailVisit.temas.map((t, i) => <span key={`detail-tema-${i}`} className="bg-[#63513d] text-white px-3 py-1.5 rounded-xl text-xs font-medium">{t}</span>)}
                  </div>
                </div>
              )}
              {detailVisit.objetivo && <div><div className="text-xs uppercase font-bold text-gray-400 mb-1">Objetivo</div><div className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl text-gray-700 whitespace-pre-line">{detailVisit.objetivo}</div></div>}
              {detailVisit.actividades && <div><div className="text-xs uppercase font-bold text-gray-400 mb-1">Actividades Realizadas</div><div className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl text-gray-700 whitespace-pre-line">{detailVisit.actividades}</div></div>}
              {detailVisit.recomendaciones && <div><div className="text-xs uppercase font-bold text-gray-400 mb-1">Recomendaciones</div><div className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl text-gray-700 whitespace-pre-line">{detailVisit.recomendaciones}</div></div>}
              {detailVisit.comentarios && <div><div className="text-xs uppercase font-bold text-gray-400 mb-1">Comentarios</div><div className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl text-gray-700 whitespace-pre-line">{detailVisit.comentarios}</div></div>}
              {(detailVisit.firmaProveedor?.length > 1500 || detailVisit.firmaAsesor?.length > 1500) && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {detailVisit.firmaProveedor?.length > 1500 && <div><div className="text-[10px] text-center text-gray-400 uppercase font-bold mb-2">Firma Proveedor</div><img src={detailVisit.firmaProveedor} className="w-full border border-gray-200 rounded-xl bg-white p-1 shadow-sm" /></div>}
                  {detailVisit.firmaAsesor?.length > 1500 && <div><div className="text-[10px] text-center text-gray-400 uppercase font-bold mb-2">Firma Asesor</div><img src={detailVisit.firmaAsesor} className="w-full border border-gray-200 rounded-xl bg-white p-1 shadow-sm" /></div>}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2 shrink-0">
              <button onClick={() => editVisit(detailVisit)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-2xl text-[11px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all shadow-[0_4px_0_0_#b45309] border-b-4 border-amber-700 active:border-b-0 active:translate-y-1">
                <PenTool className="w-5 h-5 drop-shadow-sm" /> EDITAR
              </button>
              <button onClick={() => exportSingleExcel(detailVisit)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-2xl text-[11px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all shadow-[0_4px_0_0_#166534] border-b-4 border-green-800 active:border-b-0 active:translate-y-1">
                <FileSpreadsheet className="w-5 h-5 drop-shadow-sm" /> EXCEL
              </button>
              <button onClick={() => exportSinglePDF(detailVisit)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-2xl text-[11px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all shadow-[0_4px_0_0_#991b1b] border-b-4 border-red-800 active:border-b-0 active:translate-y-1">
                <FileText className="w-5 h-5 drop-shadow-sm" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
