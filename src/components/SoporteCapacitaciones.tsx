import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Download, FileText, Trash2, X, Edit2, MapPin, Calendar, Users, FileSignature, BarChart2, FolderOpen, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, CapacitacionData } from '../lib/db';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SignaturePad from './SignaturePad';

interface Asistente {
  nombre: string;
  codigo: string;
  edad: string;
  genero: string;
  celular: string;
  finca: string;
  correo: string;
  firma: string | null;
}

interface Bloque1 { tema: string; objetivo: string; fecha: string; competencia: string; guardado: boolean; }
interface Bloque2 { lugar: string; duracion: string; facilitadores: string[]; responsable: string; dirigido: string; guardado: boolean; }
interface Bloque3 { asistentes: Asistente[]; }
interface Bloque4 { actividad: string; descripcion: string; materiales: string; guardado: boolean; }

interface Props {
  onBack: () => void;
}

const TABS = [
  { id: 1, icon: <FileText className="w-4 h-4" />, label: 'Información' },
  { id: 2, icon: <Calendar className="w-4 h-4" />, label: 'Preparación' },
  { id: 3, icon: <Users className="w-4 h-4" />, label: 'Asistentes' },
  { id: 4, icon: <FileSignature className="w-4 h-4" />, label: 'Procedimientos' },
  { id: 5, icon: <BarChart2 className="w-4 h-4" />, label: 'Análisis' },
  { id: 6, icon: <FolderOpen className="w-4 h-4" />, label: 'Historial' }
];

const INITIAL_B1: Bloque1 = { tema: '', objetivo: '', fecha: '', competencia: '', guardado: false };
const INITIAL_B2: Bloque2 = { lugar: '', duracion: '', facilitadores: [], responsable: '', dirigido: '', guardado: false };
const INITIAL_B3: Bloque3 = { asistentes: [] };
const INITIAL_B4: Bloque4 = { actividad: '', descripcion: '', materiales: '', guardado: false };

export default function SoporteCapacitaciones({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState(1);
  const [b1, setB1] = useState<Bloque1>(INITIAL_B1);
  const [b2, setB2] = useState<Bloque2>(INITIAL_B2);
  const [b3, setB3] = useState<Bloque3>(INITIAL_B3);
  const [b4, setB4] = useState<Bloque4>(INITIAL_B4);
  const [registroId, setRegistroId] = useState<string | null>(null);

  // Draft loading
  const [isLoaded, setIsLoaded] = useState(false);

  // Form states Bloque 2 list
  const [facilitadorInp, setFacilitadorInp] = useState('');

  // Form states Bloque 3
  const [asisForm, setAsisForm] = useState<Asistente>({
    nombre: '', codigo: '', edad: '', genero: '', celular: '', finca: '', correo: '', firma: null
  });
  const [editandoAsistente, setEditandoAsistente] = useState<number | null>(null);
  const [firmaModalOpen, setFirmaModalOpen] = useState(false);

  // Historial
  const [historial, setHistorial] = useState<CapacitacionData[]>([]);

  // Toast
  const [toastMsg, setToastMsg] = useState<{msg: string, type: string} | null>(null);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const capitalizarPrimera = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const capitalizarCadaPalabra = (s: string) => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : '';

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await db.capacitacionDraft.get(1);
        if (draft && draft.data) {
          if (draft.data.b1) setB1(draft.data.b1);
          if (draft.data.b2) setB2(draft.data.b2);
          if (draft.data.b3) setB3(draft.data.b3);
          if (draft.data.b4) setB4(draft.data.b4);
          if (draft.data.registroId) setRegistroId(draft.data.registroId);
        }
        const hist = await db.capacitaciones.toArray();
        setHistorial(hist.sort((a,b) => new Date(b.fechaGuardado).getTime() - new Date(a.fechaGuardado).getTime()));
      } catch (e) {
        console.error("Error loading", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadDraft();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const saveToDraft = setTimeout(async () => {
      await db.capacitacionDraft.put({
        id: 1,
        data: { b1, b2, b3, b4, registroId },
        updatedAt: new Date().toISOString()
      });
    }, 500);
    return () => clearTimeout(saveToDraft);
  }, [b1, b2, b3, b4, registroId, isLoaded]);

  const guardarEnHistorial = async (override?: { b1?: Bloque1, b2?: Bloque2, b3?: Bloque3, b4?: Bloque4 }) => {
    const reg: CapacitacionData = {
      id: registroId || Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      fechaGuardado: new Date().toISOString(),
      bloque1: override?.b1 || b1,
      bloque2: override?.b2 || b2,
      bloque3: override?.b3 || b3,
      bloque4: override?.b4 || b4
    };
    await db.capacitaciones.put(reg);
    setRegistroId(reg.id!);
    const hist = await db.capacitaciones.toArray();
    setHistorial(hist.sort((a,b) => new Date(b.fechaGuardado).getTime() - new Date(a.fechaGuardado).getTime()));
  };

  // Format Handlers
  const handleDuracionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) {
      val = val.slice(0, val.length - 2) + ':' + val.slice(val.length - 2);
    }
    setB2({ ...b2, duracion: val });
  };

  const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 10) val = val.slice(0, 10);
    if (val.length > 6) {
      val = val.slice(0, 3) + ' ' + val.slice(3, 6) + ' ' + val.slice(6);
    } else if (val.length > 3) {
      val = val.slice(0, 3) + ' ' + val.slice(3);
    }
    setAsisForm({ ...asisForm, celular: val });
  };

  const editarAsistente = (i: number, a: Asistente) => {
    setEditandoAsistente(i);
    setAsisForm(a);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bloque 1 Handlers
  const saveB1 = () => {
    if (!b1.tema || !b1.objetivo || !b1.fecha || !b1.competencia) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    const newB1 = { ...b1, guardado: true };
    setB1(newB1);
    guardarEnHistorial({ b1: newB1 });
    showToast('Registro guardado');
  };

  // Bloque 2 Handlers
  const addFacilitador = () => {
    if (facilitadorInp.trim()) {
      setB2(p => ({ ...p, facilitadores: [...p.facilitadores, capitalizarCadaPalabra(facilitadorInp.trim())] }));
      setFacilitadorInp('');
    }
  };
  const removeFacilitador = (idx: number) => {
    setB2(p => ({ ...p, facilitadores: p.facilitadores.filter((_, i) => i !== idx) }));
  };
  const saveB2 = () => {
    if (!b2.lugar || !b2.duracion || !b2.responsable || !b2.dirigido || b2.facilitadores.length === 0) {
      showToast('Complete todos los campos y agregue al menos un facilitador', 'error');
      return;
    }
    const newB2 = { ...b2, guardado: true };
    setB2(newB2);
    guardarEnHistorial({ b2: newB2 });
    showToast('Registro guardado');
  };

  // Bloque 3 Handlers
  const saveAsistente = () => {
    if (!asisForm.nombre || !asisForm.codigo || !asisForm.edad || !asisForm.genero) {
      showToast('Complete los campos obligatorios (*)', 'error');
      return;
    }
    const newAsistente = { ...asisForm, nombre: capitalizarCadaPalabra(asisForm.nombre), finca: capitalizarCadaPalabra(asisForm.finca) };
    
    let newB3;
    if (editandoAsistente !== null) {
      const nw = [...b3.asistentes];
      nw[editandoAsistente] = newAsistente;
      newB3 = { asistentes: nw };
      setB3(newB3);
      setEditandoAsistente(null);
      showToast('Asistente actualizado');
    } else {
      newB3 = { asistentes: [...b3.asistentes, newAsistente] };
      setB3(newB3);
      showToast('Asistente agregado');
    }
    setAsisForm({ nombre: '', codigo: '', edad: '', genero: '', celular: '', finca: '', correo: '', firma: null });
    guardarEnHistorial({ b3: newB3 });
  };
  
  const removeAsistente = (idx: number) => {
    if (confirm('¿Eliminar asistente?')) {
      const newB3 = { asistentes: b3.asistentes.filter((_, i) => i !== idx) };
      setB3(newB3);
      guardarEnHistorial({ b3: newB3 });
    }
  };

  // Bloque 4 Handlers
  const saveB4 = () => {
    if (!b4.actividad || !b4.descripcion || !b4.materiales) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    const newB4 = { ...b4, guardado: true };
    setB4(newB4);
    guardarEnHistorial({ b4: newB4 });
    showToast('Procedimientos guardados');
  };

  const nuevoFormulario = () => {
    if (confirm('¿Crear nuevo registro? Se mantendrá en el historial pero empezará de cero.')) {
      setB1(INITIAL_B1); setB2(INITIAL_B2); setB3(INITIAL_B3); setB4(INITIAL_B4);
      setRegistroId(null);
      setAsisForm({ nombre: '', codigo: '', edad: '', genero: '', celular: '', finca: '', correo: '', firma: null });
      setEditandoAsistente(null);
      setActiveTab(1);
    }
  };

  const cargarDesdeHistorial = (id: string, h: CapacitacionData) => {
    setB1(h.bloque1); setB2(h.bloque2); setB3(h.bloque3); setB4(h.bloque4);
    setRegistroId(id);
    setActiveTab(1);
    showToast('Registro cargado');
  };

  const eliminarDelHistorial = async (id: string) => {
    if (confirm('¿Seguro de eliminar este registro del historial?')) {
      await db.capacitaciones.delete(id);
      const hist = await db.capacitaciones.toArray();
      setHistorial(hist.sort((a,b) => new Date(b.fechaGuardado).getTime() - new Date(a.fechaGuardado).getTime()));
      if (registroId === id) nuevoFormulario();
    }
  };

  // Análisis Stats
  const tot = b3.asistentes.length;
  const hMasc = b3.asistentes.filter(a => a.genero === 'M').length;
  const hFem = b3.asistentes.filter(a => a.genero === 'F').length;

  const formatDate = (ds: string) => {
    if (!ds) return '—';
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const parts = ds.split('-');
    if (parts.length!==3) return ds;
    const f = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    return `${dias[f.getDay()]}, ${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const generarGraficoPieImagen = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      
      // Fondo blanco para JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const asistentes = b3.asistentes;
      const h = asistentes.filter(a => a.genero === 'M').length;
      const mu = asistentes.filter(a => a.genero === 'F').length;
      const total = h + mu;

      if (total === 0) {
        ctx.fillStyle = '#95A5A6';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos', 300, 200);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
        return;
      }
      const cx = 170, cy = 200, r = 140;
      let sa = -Math.PI / 2;
      if (h > 0) {
        const ang = (h / total) * 2 * Math.PI;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, sa + ang); ctx.closePath();
        ctx.fillStyle = '#3498DB'; ctx.fill();
        const mid = sa + ang / 2;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${((h / total) * 100).toFixed(1)}%`, cx + Math.cos(mid) * r * 0.6, cy + Math.sin(mid) * r * 0.6);
        sa += ang;
      }
      if (mu > 0) {
        const ang = (mu / total) * 2 * Math.PI;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, sa + ang); ctx.closePath();
        ctx.fillStyle = '#E91E63'; ctx.fill();
        const mid = sa + ang / 2;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${((mu / total) * 100).toFixed(1)}%`, cx + Math.cos(mid) * r * 0.6, cy + Math.sin(mid) * r * 0.6);
      }
      ctx.fillStyle = '#2C3E50'; ctx.font = '22px Arial'; ctx.textAlign = 'left';
      if(h>0) { ctx.fillStyle = '#3498DB'; ctx.fillRect(360, 40, 28, 28); ctx.fillStyle = '#2C3E50'; ctx.fillText(`Hombres: ${h}`, 400, 64); }
      if(mu>0) { ctx.fillStyle = '#E91E63'; ctx.fillRect(360, 80, 28, 28); ctx.fillStyle = '#2C3E50'; ctx.fillText(`Mujeres: ${mu}`, 400, 104); }
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    });
  };

  const exportarExcel = async () => {
    try {
      showToast('⏳ Generando archivo Excel...', 'info');
      const workbook = new ExcelJS.Workbook();
      
      const ws1 = workbook.addWorksheet('Consolidado', { views: [{ showGridLines: false }] });
      const HEADER_BG = '003366';
      const SECTION_BG = 'AED6F1';
      const TEXT_WHITE = 'FFFFFF';
      const TEXT_BLACK = '2C3E50';
      const BORDER_COLOR = 'D5D8DC';

      const headerStyle = { 
        font: { name: 'Arial', size: 11, bold: true, color: { argb: TEXT_WHITE } }, 
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }, 
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } as any, 
        border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any
      };
      
      const sectionTitleStyle = { 
        font: { name: 'Arial', size: 11, bold: true, color: { argb: TEXT_WHITE } }, 
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }, 
        alignment: { horizontal: 'left', vertical: 'middle' } as any,
        border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any
      };
      
      const labelStyle = { 
        font: { name: 'Arial', size: 11, bold: true, color: { argb: TEXT_BLACK } }, 
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } },
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true } as any,
        border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any
      };
      
      const valueStyle = { 
        font: { name: 'Arial', size: 11, color: { argb: TEXT_BLACK } }, 
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true } as any, 
        border: { top: { style: 'thin', color: { argb: BORDER_COLOR } }, bottom: { style: 'thin', color: { argb: BORDER_COLOR } }, left: { style: 'thin', color: { argb: BORDER_COLOR } }, right: { style: 'thin', color: { argb: BORDER_COLOR } } } as any
      };

      ws1.getRow(1).height = 30;
      ws1.mergeCells('A1:B1');
      const titleCell = ws1.getCell('A1');
      titleCell.value = 'SOPORTE DE CAPACITACIONES 0466.VSC.FOR.059';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003366' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      ws1.columns = [
        { width: 25 }, { width: 80 }, { width: 15 }, { width: 15 }
      ];

      let currentRow = 3;

      function addSection1(title: string) {
        ws1.mergeCells(`A${currentRow}:B${currentRow}`);
        ws1.getRow(currentRow).height = 22;
        const secCell = ws1.getCell(`A${currentRow}`);
        secCell.value = title;
        secCell.fill = sectionTitleStyle.fill as any;
        secCell.font = sectionTitleStyle.font;
        secCell.alignment = sectionTitleStyle.alignment;
        secCell.border = sectionTitleStyle.border;
        currentRow++;
      }

      function addField1(label: string, value: string) {
        const row = ws1.getRow(currentRow);
        row.height = 20; // Default height, will grow with wrap if needed
        
        const c1 = ws1.getCell(`A${currentRow}`);
        c1.value = label;
        c1.font = labelStyle.font;
        c1.fill = labelStyle.fill as any;
        c1.alignment = labelStyle.alignment;
        c1.border = labelStyle.border;
        
        const c2 = ws1.getCell(`B${currentRow}`);
        c2.value = value || '—';
        c2.font = valueStyle.font;
        c2.alignment = valueStyle.alignment;
        c2.border = valueStyle.border;
        
        currentRow++;
      }

      addSection1('1. INFORMACIÓN DE LA CAPACITACIÓN');
      addField1('Tema', b1.tema);
      addField1('Objetivo', b1.objetivo);
      addField1('Fecha', formatDate(b1.fecha));
      addField1('Competencia', b1.competencia);
      currentRow++;

      addSection1('2. PREPARACIÓN DE LA ACTIVIDAD');
      addField1('Lugar', b2.lugar);
      addField1('Duración', b2.duracion ? `${b2.duracion} horas` : '');
      addField1('Facilitadores', (b2.facilitadores || []).join(', '));
      addField1('Responsable', b2.responsable);
      addField1('Dirigido a', b2.dirigido);
      currentRow++;

      addSection1('3. PROCEDIMIENTOS');
      addField1('Actividad', b4.actividad);
      addField1('Descripción', b4.descripcion);
      addField1('Materiales / Recursos', b4.materiales);
      currentRow++;

      addSection1('4. ANÁLISIS DE ASISTENTES');
      
      const analisisHeaders = ['CATEGORÍA', 'TOTAL', '< 30 AÑOS', '> 30 AÑOS'];
      analisisHeaders.forEach((h, i) => {
        const cell = ws1.getCell(currentRow, i + 1);
        cell.value = h;
        cell.fill = headerStyle.fill as any;
        cell.font = headerStyle.font;
        cell.border = headerStyle.border;
        cell.alignment = headerStyle.alignment;
      });
      currentRow++;

      const me30 = b3.asistentes.filter(a => a.edad === 'menor30').length;
      const ma30 = b3.asistentes.filter(a => a.edad === 'mayor30').length;
      const hM = b3.asistentes.filter(a => a.genero === 'M' && a.edad === 'menor30').length;
      const hMa = b3.asistentes.filter(a => a.genero === 'M' && a.edad === 'mayor30').length;
      const mMe = b3.asistentes.filter(a => a.genero === 'F' && a.edad === 'menor30').length;
      const mMa = b3.asistentes.filter(a => a.genero === 'F' && a.edad === 'mayor30').length;
      
      const analisisRows = [
        { cat: 'Total Asistentes', t: tot, me: me30, ma: ma30 },
        { cat: 'Total Hombres', t: hMasc, me: hM, ma: hMa },
        { cat: 'Total Mujeres', t: hFem, me: mMe, ma: mMa }
      ];
      
      analisisRows.forEach(r => {
        const c1 = ws1.getCell(currentRow, 1);
        c1.value = r.cat;
        c1.font = labelStyle.font;
        c1.fill = labelStyle.fill as any;
        c1.border = labelStyle.border;

        const cells = [
          ws1.getCell(currentRow, 2),
          ws1.getCell(currentRow, 3),
          ws1.getCell(currentRow, 4)
        ];
        
        cells[0].value = r.t;
        cells[1].value = r.me;
        cells[2].value = r.ma;

        cells.forEach(c => {
          c.font = valueStyle.font;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          c.border = valueStyle.border;
        });
        currentRow++;
      });

      const pieImg = await generarGraficoPieImagen();
      if (pieImg) {
        try {
          const base64Data = pieImg.split(',')[1];
          const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
          ws1.addImage(imageId, {
            tl: { col: 0.5, row: currentRow + 1 } as any,
            br: { col: 1.5, row: currentRow + 6 } as any,
            editAs: 'oneCell'
          });
        } catch(e) {}
      }

      // No setting ws1.columns here as it's already set

      const ws2 = workbook.addWorksheet('Asistentes', { views: [{ showGridLines: false }] });

      ws2.mergeCells('A1:I1');
      const t2 = ws2.getCell('A1');
      t2.value = 'LISTADO COMPLETO DE ASISTENTES';
      t2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
      t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003366' } };
      t2.alignment = { horizontal: 'center', vertical: 'middle' };
      ws2.getRow(1).height = 25;

      const asistHeaders = ['No.', 'Nombres Y Apellidos', 'Código Proveedor', 'Edad', 'Género', 'Celular', 'Finca / Empresa', 'Correo Electrónico', 'Firma'];
      asistHeaders.forEach((h, i) => {
        ws2.getCell(2, i + 1).value = h;
        ws2.getCell(2, i + 1).fill = headerStyle.fill as any;
        ws2.getCell(2, i + 1).font = headerStyle.font;
        ws2.getCell(2, i + 1).border = headerStyle.border;
      });

      for (let i = 0; i < b3.asistentes.length; i++) {
        const a = b3.asistentes[i];
        const rowNum = i + 3;
        ws2.getRow(rowNum).height = 45; // Increased for better signature visibility
        
        const vals = [i + 1, a.nombre, a.codigo, a.edad === 'menor30' ? '< 30' : '> 30', a.genero === 'M' ? 'Masculino' : 'Femenino', a.celular, a.finca, a.correo];
        vals.forEach((v, idx) => {
          ws2.getCell(rowNum, idx + 1).value = v;
          ws2.getCell(rowNum, idx + 1).font = { name: 'Arial', size: 9 };
          ws2.getCell(rowNum, idx + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          ws2.getCell(rowNum, idx + 1).border = { top: { style: 'thin', color: { argb: 'D5D8DC' } }, bottom: { style: 'thin', color: { argb: 'D5D8DC' } }, left: { style: 'thin', color: { argb: 'D5D8DC' } }, right: { style: 'thin', color: { argb: 'D5D8DC' } } } as any;
        });

        // Border for signature cell
        ws2.getCell(rowNum, 9).border = { top: { style: 'thin', color: { argb: 'D5D8DC' } }, bottom: { style: 'thin', color: { argb: 'D5D8DC' } }, left: { style: 'thin', color: { argb: 'D5D8DC' } }, right: { style: 'thin', color: { argb: 'D5D8DC' } } } as any;

        if (a.firma) {
          try {
            const base64Data = a.firma.split(',')[1];
            const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
            ws2.addImage(imageId, {
              tl: { col: 8.1, row: rowNum - 0.9 } as any,
              br: { col: 8.9, row: rowNum - 0.1 } as any,
              editAs: 'oneCell'
            });
          } catch(e) {}
        }
      }

      ws2.columns = [
        { width: 5 }, { width: 30 }, { width: 12 }, { width: 6 }, { width: 10 }, { width: 12 }, { width: 22 }, { width: 22 }, { width: 15 }
      ];

      const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Soporte_Cap_0466_${fechaStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('📊 Archivo Excel descargado correctamente');
    } catch(e: any) {
      console.error('Error exportando Excel:', e);
      showToast('⚠️ Error al exportar: ' + e.message, 'error');
    }
  };

  const exportarPDF = async () => {
    try {
      showToast('⏳ Generando archivo PDF...', 'info');
      // Set compress: true for smaller file size
      const doc = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'mm', 
        format: 'letter',
        compress: true 
      });
      
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;

      // --- PAGE 1: CONSOLIDADO ---
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SOPORTE DE CAPACITACIONES 0466.VSC.FOR.059', pageW / 2, 7, { align: 'center' });

      let yPos = 18;

      // --- SECTION 1 ---
      autoTable(doc, {
        startY: yPos,
        head: [['1. INFORMACIÓN DE LA CAPACITACIÓN', '']],
        body: [
          ['Tema', b1.tema],
          ['Objetivo', b1.objetivo],
          ['Fecha', formatDate(b1.fecha)],
          ['Competencia', b1.competencia]
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
          ['Lugar', b2.lugar],
          ['Duración', b2.duracion ? `${b2.duracion} horas` : '—'],
          ['Facilitadores', (b2.facilitadores || []).join(', ')],
          ['Responsable', b2.responsable],
          ['Dirigido a', b2.dirigido]
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
          ['Actividad', b4.actividad],
          ['Descripción', b4.descripcion],
          ['Materiales', b4.materiales]
        ],
        theme: 'grid',
        styles: { overflow: 'linebreak', fontSize: 10, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
        margin: { left: margin, right: margin }
      });
      yPos = (doc as any).lastAutoTable.finalY + 5;

      // --- SECTION 4 ---
      const me30 = b3.asistentes.filter(a => a.edad === 'menor30').length;
      const ma30 = b3.asistentes.filter(a => a.edad === 'mayor30').length;
      const hM = b3.asistentes.filter(a => a.genero === 'M' && a.edad === 'menor30').length;
      const hMa = b3.asistentes.filter(a => a.genero === 'M' && a.edad === 'mayor30').length;
      const mMe = b3.asistentes.filter(a => a.genero === 'F' && a.edad === 'menor30').length;
      const mMa = b3.asistentes.filter(a => a.genero === 'F' && a.edad === 'mayor30').length;

      autoTable(doc, {
        startY: yPos,
        head: [['4. ANÁLISIS DE ASISTENTES', '', '', ''], ['CATEGORIA', 'TOTAL', '< 30 AÑOS', '> 30 AÑOS']],
        body: [
          ['Total Asistentes', tot, me30, ma30],
          ['Total Hombres', hMasc, hM, hMa],
          ['Total Mujeres', hFem, mMe, mMa]
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, halign: 'center', font: 'helvetica' },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 } },
        didParseCell: (data) => {
          if (data.section === 'head' && data.row.index === 0) {
            data.cell.styles.halign = 'left';
            if (data.column.index > 0) data.cell.text = []; // Empty text for merged cells
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
             // Merging header manually if needed, but autoTable does it if we specify it or just use one cell.
             // Actually simplifies: use separate head rows.
          }
        }
      });
      const finalY4 = (doc as any).lastAutoTable.finalY || yPos + 20;
      const pieHeight = 70;
      const pieWidth = 100;
      let chartY = finalY4 + 20; 

      // Check if we need a new page for the chart
      if (chartY + pieHeight > pageH - 20) {
        doc.addPage();
        chartY = 20;
      }

      const pieImg = await generarGraficoPieImagen();
      if (pieImg) {
        try {
          const centerX = (pageW - pieWidth) / 2;
          doc.addImage(pieImg, 'JPEG', centerX, chartY, pieWidth, pieHeight, undefined, 'FAST');
        } catch(e) {}
      }

      // --- PAGE 2: ASISTENTES ---
      doc.addPage();
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTADO COMPLETO DE ASISTENTES', pageW / 2, 7, { align: 'center' });

      yPos = 15;
      const asistHeaders = ['No.', 'Nombres Y Apellidos', 'Código Proveedor', 'Edad', 'Género', 'Celular', 'Finca / Empresa', 'Correo Electrónico', 'Firma'];
      const bodyData: any[] = [];
      b3.asistentes.forEach((a, i) => {
        bodyData.push([
          i + 1, a.nombre, a.codigo, a.edad === 'menor30' ? '< 30' : '> 30', a.genero === 'M' ? 'Masculino' : 'Femenino', a.celular, a.finca, a.correo, ''
        ]);
      });

      autoTable(doc, {
        startY: yPos,
        head: [asistHeaders],
        body: bodyData,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, halign: 'center', font: 'helvetica', minCellHeight: 12 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        columnStyles: { 
          0: { cellWidth: 8 },
          1: { halign: 'left', cellWidth: 55 },
          2: { cellWidth: 22 },
          3: { cellWidth: 15 },
          4: { cellWidth: 22 },
          5: { cellWidth: 25 },
          6: { halign: 'left', cellWidth: 35 },
          7: { halign: 'left', cellWidth: 40 },
          8: { cellWidth: 30 }
        },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (data.column.index === 8 && data.cell.section === 'body') {
            const firma = b3.asistentes[data.row.index].firma;
            if (firma) {
              const imgW = 18;
              const imgH = 8;
              const x = data.cell.x + (data.cell.width - imgW) / 2;
              const y = data.cell.y + (data.cell.height - imgH) / 2;
              try {
                doc.addImage(firma, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
              } catch (e) {}
            }
          }
        }
      });

      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Generado el: ${new Date().toLocaleString()} - Sistema de Gestión de Asesores`, margin, pageH - 5);
      doc.text('Página 2 de 2', pageW - margin, pageH - 5, { align: 'right' });

      const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      doc.save(`Soporte_Cap_0466_${fechaStr}.pdf`);
      showToast('📄 Archivo PDF descargado correctamente');
    } catch(e: any) {
      console.error('Error exportando PDF:', e);
      showToast('⚠️ Error al exportar: ' + e.message, 'error');
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f4f6f8] text-gray-800 font-sans">
      {/* HEADER FIJO */}
      <div className="bg-[#63513d] text-white p-4 sticky top-0 z-50 flex items-center shadow-md">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-white/10 rounded-full transition-colors relative z-10">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-sm md:text-base font-bold uppercase tracking-wider text-center flex-1">
          Soporte de Capacitaciones 0466.VSC.FOR.059
        </h1>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="bg-[#f0edea] border-b border-[#D5C8B8] sticky top-[60px] z-40 overflow-x-auto overflow-y-hidden hide-scrollbar shadow-sm">
        <div className="flex w-max min-w-full">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-3 flex flex-col items-center justify-center gap-1 transition-all border-b-4 font-bold uppercase text-[10px] md:text-xs min-w-[70px] ${
                activeTab === tab.id
                  ? 'bg-[#8c7a6b] text-white border-yellow-400 shadow-inner transform -translate-y-0.5'
                  : 'bg-white/50 text-gray-600 border-transparent hover:bg-white/90'
              }`}
            >
              <div className="w-5 h-5">{tab.icon}</div>
              <span className="flex items-center gap-1">
                {tab.label}
                {tab.id === 3 && b3.asistentes.length > 0 && (
                  <span className="bg-yellow-500 text-white rounded-full px-1.5 py-0.5 text-[9px]">{b3.asistentes.length}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 p-4 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 1 && (
            <motion.div key="t1" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-2xl mx-auto space-y-5">
              <h2 className="text-lg font-bold text-[#5D3A1A] border-b-2 border-[#5D3A1A] pb-2 flex items-center gap-2">
                <FileText className="w-5 h-5"/> Información de la Capacitación
              </h2>
              {b1.guardado ? (
                <div className="space-y-4 text-sm bg-gray-50 p-4 rounded-lg border border-blue-100">
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Tema</span><div className="mt-1">{b1.tema}</div></div>
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Objetivo</span><div className="mt-1">{b1.objetivo}</div></div>
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Fecha</span><div className="mt-1">{formatDate(b1.fecha)}</div></div>
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Competencia a Desarrollar</span><div className="mt-1">{b1.competencia}</div></div>
                  <button onClick={()=>setB1({...b1, guardado:false})} className="w-full bg-[#5DADE2] text-white py-3 rounded-lg font-bold mt-2 shadow-sm">Modificar</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tema <span className="text-red-500">*</span></label>
                    <input type="text" value={b1.tema} onChange={e=>setB1({...b1, tema: capitalizarCadaPalabra(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#2E86C1] text-sm" placeholder="Ingrese el tema" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Objetivo <span className="text-red-500">*</span></label>
                    <textarea value={b1.objetivo} onChange={e=>setB1({...b1, objetivo: capitalizarPrimera(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#2E86C1] text-sm" rows={3} placeholder="Describa el objetivo" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Fecha <span className="text-red-500">*</span></label>
                    <input type="date" value={b1.fecha} onChange={e=>setB1({...b1, fecha: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#2E86C1] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Competencia a Desarrollar <span className="text-red-500">*</span></label>
                    <textarea value={b1.competencia} onChange={e=>setB1({...b1, competencia: capitalizarPrimera(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#2E86C1] text-sm" rows={2} placeholder="Describa la competencia" />
                  </div>
                  <button onClick={saveB1} className={`w-full text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${registroId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F5A623] hover:bg-[#E8941A]'}`}>
                    💾 {registroId ? 'Modo Edición' : 'Guardar Información'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 2 && (
             <motion.div key="t2" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-2xl mx-auto space-y-5">
              <h2 className="text-lg font-bold text-[#5D3A1A] border-b-2 border-[#5D3A1A] pb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5"/> Preparación de la Actividad
              </h2>
              {b2.guardado ? (
                <div className="space-y-4 text-sm bg-gray-50 p-4 rounded-lg border border-blue-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Lugar</span><div className="mt-1">{b2.lugar}</div></div>
                    <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Duración</span><div className="mt-1">{b2.duracion}</div></div>
                  </div>
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Facilitadores</span><div className="mt-1 font-medium text-blue-800">{b2.facilitadores.join(', ')}</div></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Responsable</span><div className="mt-1">{b2.responsable}</div></div>
                    <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Dirigido a</span><div className="mt-1">{b2.dirigido}</div></div>
                  </div>
                  <button onClick={()=>setB2({...b2, guardado:false})} className="w-full bg-[#5DADE2] text-white py-3 rounded-lg font-bold mt-2 shadow-sm">Modificar</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Lugar <span className="text-red-500">*</span></label>
                      <input type="text" value={b2.lugar} onChange={e=>setB2({...b2, lugar: capitalizarCadaPalabra(e.target.value)})} className="w-full border p-3 rounded-lg text-sm" placeholder="Ej. Finca La María" />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Horas <span className="text-red-500">*</span></label>
                      <input type="text" value={b2.duracion} onChange={handleDuracionChange} className="w-full border p-3 rounded-lg text-sm" placeholder="0:00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Facilitadores <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                       <input type="text" value={facilitadorInp} onChange={e=>setFacilitadorInp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addFacilitador()}}} className="flex-1 border p-3 rounded-lg text-sm" placeholder="Nombre facilitador" />
                       <button onClick={addFacilitador} className="bg-[#2E86C1] text-white px-4 rounded-lg font-bold">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {b2.facilitadores.map((f, i) => (
                        <div key={i} className="bg-[#AED6F1] text-[#2E86C1] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
                          {f} <button onClick={()=>removeFacilitador(i)} className="text-red-600 hover:text-red-800">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Responsable <span className="text-red-500">*</span></label>
                      <input type="text" value={b2.responsable} onChange={e=>setB2({...b2, responsable: capitalizarCadaPalabra(e.target.value)})} className="w-full border p-3 rounded-lg text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Dirigido a <span className="text-red-500">*</span></label>
                      <input type="text" value={b2.dirigido} onChange={e=>setB2({...b2, dirigido: capitalizarPrimera(e.target.value)})} className="w-full border p-3 rounded-lg text-sm" />
                    </div>
                  </div>
                  <button onClick={saveB2} className={`w-full text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${registroId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F5A623] hover:bg-[#E8941A]'}`}>
                    💾 {registroId ? 'Modo Edición' : 'Guardar Preparación'}
                  </button>
                </div>
              )}
             </motion.div>
          )}

          {activeTab === 3 && (
             <motion.div key="t3" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                   <h2 className="text-lg font-bold text-[#5D3A1A] border-b-2 border-[#5D3A1A] pb-2 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5"/> {editandoAsistente !== null ? 'Editar Asistente' : 'Nuevo Asistente'}
                  </h2>
                  <div className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nombre y Apellido <span className="text-red-500">*</span></label>
                          <input type="text" value={asisForm.nombre} onChange={e=>setAsisForm({...asisForm, nombre: e.target.value})} className="w-full border p-3 rounded-lg text-sm" placeholder="Nombre completo"/>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Código Proveedor <span className="text-red-500">*</span></label>
                          <input type="text" value={asisForm.codigo} onChange={e=>setAsisForm({...asisForm, codigo: e.target.value.replace(/\D/g,'')})} className="w-full border p-3 rounded-lg text-sm" placeholder="Solo números"/>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Edad <span className="text-red-500">*</span></label>
                           <select value={asisForm.edad} onChange={e=>setAsisForm({...asisForm, edad: e.target.value})} className="w-full border p-3 rounded-lg text-sm bg-white">
                              <option value="">Seleccionar...</option>
                              <option value="menor30">Menor de 30 años</option>
                              <option value="mayor30">Mayor de 30 años</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Género <span className="text-red-500">*</span></label>
                           <select value={asisForm.genero} onChange={e=>setAsisForm({...asisForm, genero: e.target.value})} className="w-full border p-3 rounded-lg text-sm bg-white">
                              <option value="">Seleccionar...</option>
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                           </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Celular</label>
                          <input type="tel" value={asisForm.celular} onChange={handleCelularChange} className="w-full border p-3 rounded-lg text-sm" placeholder="000 000 0000" maxLength={15}/>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Finca / Empresa</label>
                          <input type="text" value={asisForm.finca} onChange={e=>setAsisForm({...asisForm, finca: e.target.value})} className="w-full border p-3 rounded-lg text-sm"/>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Correo Electrónico</label>
                        <input type="email" value={asisForm.correo} onChange={e=>setAsisForm({...asisForm, correo: e.target.value})} className="w-full border p-3 rounded-lg text-sm"/>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Firma Digital</label>
                        {!asisForm.firma ? (
                          <button onClick={()=>setFirmaModalOpen(true)} className="bg-[#2E86C1] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">✍️ Capturar Firma</button>
                        ) : (
                          <div className="flex items-center gap-4 border p-2 rounded-lg bg-gray-50 flex-wrap">
                            <img src={asisForm.firma} alt="Firma" className="h-12 bg-white object-contain border" />
                            <span className="text-green-600 font-bold text-xs flex-1">✅ Firma capturada</span>
                            <button onClick={()=>setAsisForm({...asisForm, firma: null})} className="text-red-500 hover:text-red-700 text-sm font-bold bg-white px-3 py-1 border rounded shadow-sm">Borrar</button>
                          </div>
                        )}
                     </div>

                     <div className="flex gap-3 pt-2">
                        {editandoAsistente !== null && (
                          <button onClick={()=>{setEditandoAsistente(null); setAsisForm({nombre:'',codigo:'',edad:'',genero:'',celular:'',finca:'',correo:'',firma:null})}} className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-lg font-bold bg-white">Cancelar</button>
                        )}
                        <button onClick={saveAsistente} className={`flex-[2] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${editandoAsistente !== null ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F5A623] hover:bg-[#E8941A]'}`}>
                          💾 {editandoAsistente !== null ? 'Guardar Cambios' : 'Agregar Asistente'}
                        </button>
                     </div>
                  </div>
                </div>

                {b3.asistentes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 overflow-hidden">
                    <h3 className="font-bold text-[#5D3A1A] mb-4">Lista de Asistentes ({b3.asistentes.length})</h3>
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-xs text-left min-w-[700px]">
                        <thead className="bg-[#5DADE2] text-white uppercase font-bold">
                          <tr>
                            <th className="p-3 whitespace-nowrap">N°</th>
                            <th className="p-3 whitespace-nowrap">Nombres y Apellidos</th>
                            <th className="p-3 whitespace-nowrap">Cód. Prov.</th>
                            <th className="p-3 whitespace-nowrap">Edad</th>
                            <th className="p-3 whitespace-nowrap">Género</th>
                            <th className="p-3 whitespace-nowrap">Celular</th>
                            <th className="p-3 whitespace-nowrap">Compañía</th>
                            <th className="p-3 text-center whitespace-nowrap">Firma</th>
                            <th className="p-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {b3.asistentes.map((a, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-3 font-bold">{i+1}</td>
                              <td className="p-3">{a.nombre}</td>
                              <td className="p-3">{a.codigo}</td>
                              <td className="p-3">{a.edad === 'menor30' ? '< 30' : '> 30'}</td>
                              <td className="p-3">{a.genero === 'M' ? '♂ M' : '♀ F'}</td>
                              <td className="p-3">{a.celular || '-'}</td>
                              <td className="p-3">{a.finca || '-'}</td>
                              <td className="p-3 text-center">{a.firma ? <img src={a.firma} className="h-6 mx-auto object-contain bg-white border inline-block"/> : '-'}</td>
                              <td className="p-3 text-center space-x-2">
                                <button onClick={()=>editarAsistente(i, a)} className="bg-[#2E86C1] text-white p-1.5 rounded"><Edit2 className="w-3 h-3"/></button>
                                <button onClick={()=>removeAsistente(i)} className="bg-[#E74C3C] text-white p-1.5 rounded"><Trash2 className="w-3 h-3"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
             </motion.div>
          )}

          {activeTab === 4 && (
             <motion.div key="t4" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-2xl mx-auto space-y-5">
              <h2 className="text-lg font-bold text-[#5D3A1A] border-b-2 border-[#5D3A1A] pb-2 flex items-center gap-2">
                <FileSignature className="w-5 h-5"/> Procedimientos
              </h2>
              {b4.guardado ? (
                <div className="space-y-4 text-sm bg-gray-50 p-4 rounded-lg border border-blue-100">
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Actividad</span><div className="mt-1">{b4.actividad}</div></div>
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Descripción</span><div className="mt-1 whitespace-pre-line">{b4.descripcion}</div></div>
                  <div><span className="font-bold text-[#5D3A1A] text-xs uppercase">Materiales / Recursos</span><div className="mt-1 whitespace-pre-line">{b4.materiales}</div></div>
                  <button onClick={()=>setB4({...b4, guardado:false})} className="w-full bg-[#5DADE2] text-white py-3 rounded-lg font-bold mt-2 shadow-sm">Modificar</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Actividad <span className="text-red-500">*</span></label>
                    <input type="text" value={b4.actividad} onChange={e=>setB4({...b4, actividad: capitalizarPrimera(e.target.value)})} className="w-full border p-3 rounded-lg text-sm" placeholder="Nombre completo de actividad" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Descripción <span className="text-red-500">*</span></label>
                    <textarea value={b4.descripcion} onChange={e=>setB4({...b4, descripcion: capitalizarPrimera(e.target.value)})} className="w-full border p-3 rounded-lg text-sm" rows={4} placeholder="Detalle paso a paso" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Materiales <span className="text-red-500">*</span></label>
                    <textarea value={b4.materiales} onChange={e=>setB4({...b4, materiales: capitalizarPrimera(e.target.value)})} className="w-full border p-3 rounded-lg text-sm" rows={3} placeholder="Lista de recursos..." />
                  </div>
                  <button onClick={saveB4} className={`w-full text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${registroId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F5A623] hover:bg-[#E8941A]'}`}>
                    💾 {registroId ? 'Modo Edición' : 'Guardar Procedimiento'}
                  </button>
                </div>
              )}
             </motion.div>
          )}

          {activeTab === 5 && (
             <motion.div key="t5" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-2xl mx-auto space-y-5">
              <h2 className="text-lg font-bold text-[#5D3A1A] border-b-2 border-[#5D3A1A] pb-2 flex items-center gap-2">
                <BarChart2 className="w-5 h-5"/> Análisis
              </h2>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4">
                <div className="grid grid-cols-4 font-bold text-xs uppercase bg-[#5DADE2] text-white p-3 text-center rounded-t-lg">
                  <div className="text-left">Categoría</div><div>Total</div><div>{'<'} 30 años</div><div>{'>'} 30 años</div>
                </div>
                <div className="grid grid-cols-4 text-center p-3 font-bold border-b bg-white text-sm">
                   <div className="text-left text-[#2C3E50]">Asistentes</div>
                   <div className="text-xl text-[#2E86C1]">{tot}</div><div className="text-xl text-[#2E86C1]">{b3.asistentes.filter(a=>a.edad==='menor30').length}</div><div className="text-xl text-[#2E86C1]">{b3.asistentes.filter(a=>a.edad==='mayor30').length}</div>
                </div>
                <div className="grid grid-cols-4 text-center p-3 border-b bg-white/60">
                   <div className="text-left font-bold text-gray-700">Hombres</div>
                   <div className="font-bold">{hMasc}</div><div>{b3.asistentes.filter(a=>a.genero==='M'&&a.edad==='menor30').length}</div><div>{b3.asistentes.filter(a=>a.genero==='M'&&a.edad==='mayor30').length}</div>
                </div>
                <div className="grid grid-cols-4 text-center p-3 bg-white rounded-b-lg">
                   <div className="text-left font-bold text-gray-700">Mujeres</div>
                   <div className="font-bold">{hFem}</div><div>{b3.asistentes.filter(a=>a.genero==='F'&&a.edad==='menor30').length}</div><div>{b3.asistentes.filter(a=>a.genero==='F'&&a.edad==='mayor30').length}</div>
                </div>
              </div>

              {tot > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center mb-4">
                  <h3 className="font-bold text-gray-700 mb-2 text-center">Distribución por Género</h3>
                  
                  <div className="relative w-[200px] h-[200px]">
                    <svg viewBox="-1 -1 2 2" style={{ transform: "rotate(-90deg)" }} className="w-full h-full overflow-hidden">
                      {(() => {
                        const hPct = hMasc / tot;
                        const mPct = hFem / tot;

                        // Create the SVG paths
                        const getCoordinatesForPercent = (percent: number) => {
                          const x = Math.cos(2 * Math.PI * percent);
                          const y = Math.sin(2 * Math.PI * percent);
                          return [x, y];
                        };

                        let cumulativePercent = 0;

                        const slices = [
                          { name: 'Hombres', value: hMasc, color: '#AED6F1' },
                          { name: 'Mujeres', value: hFem, color: '#FFB6C1' },
                        ].filter(d => d.value > 0);

                        return slices.map((slice, i) => {
                          // if it's 100%, just draw a circle
                          if (slice.value === tot) {
                            return <circle key={i} r="1" cx="0" cy="0" fill={slice.color} />;
                          }

                          const percent = slice.value / tot;
                          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                          cumulativePercent += percent;
                          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);

                          const largeArcFlag = percent > 0.5 ? 1 : 0;

                          const pathData = [
                            `M ${startX} ${startY}`, // Move
                            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                            `L 0 0`, // Line
                          ].join(' ');

                          // Path labels
                          const midPercent = cumulativePercent - (percent / 2);
                          const [labelX, labelY] = getCoordinatesForPercent(midPercent);

                          return (
                            <g key={i}>
                               <path d={pathData} fill={slice.color} stroke="white" strokeWidth="0.02" />
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  
                  <div className="flex justify-center gap-6 mt-4">
                    {hMasc > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm bg-[#AED6F1]"></div>
                        <span className="text-sm font-bold text-gray-700">Hombres ({(hMasc/tot*100).toFixed(0)}%)</span>
                      </div>
                    )}
                    {hFem > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm bg-[#FFB6C1]"></div>
                        <span className="text-sm font-bold text-gray-700">Mujeres ({(hFem/tot*100).toFixed(0)}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons for Export that we can bind later if needed, left as placeholders for P3 */}
              <div className="flex gap-4">
                 <button onClick={exportarExcel} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors active:scale-95 flex items-center justify-center gap-2">
                   📊 Exportar Excel
                 </button>
                 <button onClick={exportarPDF} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors active:scale-95 flex items-center justify-center gap-2">
                   📄 Exportar PDF
                 </button>
              </div>
             </motion.div>
          )}

          {activeTab === 6 && (
             <motion.div key="t6" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-3xl mx-auto space-y-5">
              <div className="flex justify-between items-center border-b-2 border-[#5D3A1A] pb-2">
                <h2 className="text-lg font-bold text-[#5D3A1A] flex items-center gap-2">
                  <FolderOpen className="w-5 h-5"/> Historial  ({historial.length})
                </h2>
                <button onClick={nuevoFormulario} className="bg-[#27AE60] text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2">
                  <Plus className="w-4 h-4"/> Nuevo Formulario
                </button>
              </div>

              <div className="space-y-4">
                {historial.map((h, i) => (
                  <div key={h.id} className="border-2 border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition bg-gray-50/50">
                    <div className="flex justify-between flex-wrap gap-4 items-start">
                      <div>
                        <h3 className="font-bold text-[#5D3A1A] text-lg">{h.bloque1?.tema || 'Sin Tema'}</h3>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" /> {h.bloque1?.fecha ? formatDate(h.bloque1.fecha) : '---'}
                          <span className="mx-2">•</span>
                          <Users className="w-4 h-4" /> {h.bloque3?.asistentes?.length || 0} asistentes
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>cargarDesdeHistorial(h.id!, h)} className="bg-[#F5A623] hover:bg-[#E8941A] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">Cargar y Editar</button>
                        <button onClick={()=>eliminarDelHistorial(h.id!)} className="bg-[#E74C3C] text-white p-2 rounded-lg shadow-sm"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  </div>
                ))}
                {historial.length === 0 && (
                  <div className="text-center py-10 text-gray-400">No hay registros en el historial.</div>
                )}
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {toastMsg && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-bold shadow-lg z-50 ${toastMsg.type === 'error' ? 'bg-red-600' : toastMsg.type === 'info' ? 'bg-[#3498DB]' : 'bg-[#27AE60]'}`}>
          {toastMsg.msg}
        </div>
      )}

      {firmaModalOpen && (
        <SignaturePad
          title="Firma del Asistente"
          initialData={asisForm.firma || undefined}
          onSave={(dataUrl) => {
            setAsisForm({ ...asisForm, firma: dataUrl });
            setFirmaModalOpen(false);
            showToast('Firma agregada');
          }}
          onClose={() => setFirmaModalOpen(false)}
        />
      )}
    </div>
  );
}
