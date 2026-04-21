import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, History, Download, FileText, Trash2, X, PenTool } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AuditoriaData } from '../lib/db';
import { SECCIONES, SOLO_OBS, IDX_CURVA, VisitaData, DetalleVisita } from './ChecklistData';
import { exportExcel, exportPDF } from './ChecklistExport';

interface ChecklistTanquesProps {
  onBack: () => void;
}

export default function ChecklistTanques({ onBack }: ChecklistTanquesProps) {
  // Navigation State
  const [viewHistory, setViewHistory] = useState(false);
  const [viewDetailId, setViewDetailId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Dexie live queries map to local state reactively
  const auditoriasDB = useLiveQuery(() => db.auditorias.reverse().toArray(), []) || [];

  // Base state for Datos del Registro
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [codProveedor, setCodProveedor] = useState('');
  const [nomProveedor, setNomProveedor] = useState('');
  const [codTanque, setCodTanque] = useState('');
  const [nomTanque, setNomTanque] = useState('');
  const [responsable, setResponsable] = useState('');
  const [telefono, setTelefono] = useState('');
  const [asesor, setAsesor] = useState('');

  // Questions State
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [extras, setExtras] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});

  // Derived state calculations
  let totalP = 0;
  Object.values(SECCIONES).forEach(s => { totalP += s.length });

  let si = 0, no = 0, na = 0, siAll = 0, noAll = 0, naAll = 0;
  
  Object.entries(respuestas).forEach(([idxStr, r]) => {
    const i = parseInt(idxStr);
    if (!r) return;
    if (r === 'SI') siAll++;
    if (r === 'NO') noAll++;
    if (r === 'NA') naAll++;
    if (!SOLO_OBS.has(i) && i !== IDX_CURVA) {
      if (r === 'SI') si++;
      if (r === 'NO') no++;
      if (r === 'NA') na++;
    }
  });

  const total = si + no;
  const score = total > 0 ? (si / total) * 100 : 0;
  const answered = Object.keys(respuestas).length;
  const progress = totalP > 0 ? (answered / totalP) * 100 : 0;

  // Formatting helpers
  const handleNumericInput = (val: string, setter: (val: string) => void) => setter(val.replace(/\D/g, ''));
  const titleCase = (str: string) => str.toLowerCase().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\b\w/g, c => c.toUpperCase());
  const handleUpperOnly = (val: string, setter: (val: string) => void) => setter(val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase());

  const limpiarFormulario = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setCodProveedor('');
    setNomProveedor('');
    setCodTanque('');
    setNomTanque('');
    setResponsable('');
    setTelefono('');
    setAsesor('');
    setRespuestas({});
    setExtras({});
    setObservaciones({});
  };

  const handleNuevo = () => {
    if (answered > 0 && !confirm("¿Descartar cambios y empezar uno nuevo?")) return;
    limpiarFormulario();
  };

  const handleGuardar = async () => {
    const cod = codProveedor.trim();
    if (!cod) return alert("⚠️ Ingresa el código del proveedor");
    if (answered === 0) return alert("⚠️ Responde al menos una pregunta");

    const detalles: DetalleVisita[] = [];
    let idx = 0;
    Object.entries(SECCIONES).forEach(([sec, preguntas]) => {
      preguntas.forEach((p) => {
        let ext = extras[idx] || "";
        if (ext) {
          if (/temperatura|°c/i.test(p)) ext += " °C";
          if (/litros/i.test(p)) ext += " Lts";
        }
        const resp = SOLO_OBS.has(idx) ? "" : (respuestas[idx] || "");
        detalles.push({
          seccion: sec,
          pregunta: p.replace(/\(.*\)/g, '').trim(),
          respuesta: resp,
          extra: ext,
          observacion: observaciones[idx] || "",
          esCurva: (idx === IDX_CURVA),
          esSoloObs: SOLO_OBS.has(idx)
        });
        idx++;
      });
    });

    const visita: VisitaData = {
      id: Date.now(),
      fecha,
      nom: titleCase(nomProveedor) || "Sin Nombre",
      cod_tanque: codTanque || "S/C",
      nom_tanque: titleCase(nomTanque) || "S/N",
      responsable: titleCase(responsable) || "-",
      telefono: telefono || "-",
      asesor: asesor || "-",
      pct: score, si, no, na, siAll, noAll, naAll, detalles
    };

    const auditoria: AuditoriaData = {
      cod: cod,
      nom: visita.nom,
      fecha: fecha,
      asesor: asesor || '-',
      visita: visita
    };

    try {
      // Buscar si ya existe una auditoría previa para este mismo código de proveedor
      const existingRecord = await db.auditorias.where('cod').equals(cod).first();

      if (editingId) {
        // En caso de que se haya cambiado el código durante la edición a uno que ya existía
        if (existingRecord && existingRecord.id && existingRecord.id !== editingId) {
          await db.auditorias.delete(existingRecord.id);
        }
        await db.auditorias.update(editingId, auditoria);
        alert("✅ Cambios guardados para proveedor " + cod);
        cancelarEdicion();
      } else if (existingRecord && existingRecord.id) {
        // Guardando nuevo, pero ya existía el código. Sobrescribir (solo última versión)
        await db.auditorias.update(existingRecord.id, auditoria);
        alert("✅ Versión actualizada — proveedor " + cod);
      } else {
        // Guardando nuevo completamente fresco
        await db.auditorias.add(auditoria);
        alert("✅ Guardado — proveedor " + cod);
      }
    } catch (error) {
      console.error("Error al guardar en IndexDB:", error);
      alert("❌ Hubo un error al guardar los datos localmente.");
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta visita permanentemente?")) return;
    try {
      const numericId = Number(id);
      await db.auditorias.delete(numericId);
      if (editingId === numericId) setEditingId(null);
      setViewDetailId(null);
      alert("✅ Visita eliminada.");
    } catch (error) {
       console.error("Error al eliminar", error);
       alert("❌ Hubo un error al eliminar el registro.");
    }
  };

  const iniciarEdicion = () => {
    if (!viewDetailId || !currentDbRecord) return;
    const v = currentDbRecord.visita;
    setEditingId(viewDetailId);
    setFecha(v.fecha || new Date().toISOString().split('T')[0]);
    setCodProveedor(currentDbRecord.cod);
    setNomProveedor(v.nom || '');
    setCodTanque(v.cod_tanque || '');
    setNomTanque(v.nom_tanque || '');
    setResponsable(v.responsable || '');
    setTelefono(v.telefono || '');
    setAsesor(v.asesor || '');
    
    const newResp: Record<number, string> = {};
    const newExt: Record<number, string> = {};
    const newObs: Record<number, string> = {};
    
    v.detalles.forEach((d, idx) => {
       if (d.respuesta) newResp[idx] = d.respuesta.toUpperCase();
       if (d.extra) newExt[idx] = d.extra.replace(/\s*(°C|Lts)/g, '').trim();
       if (d.observacion) newObs[idx] = d.observacion;
    });

    setRespuestas(newResp);
    setExtras(newExt);
    setObservaciones(newObs);
    setViewHistory(false);
    setViewDetailId(null);
    alert(`✏️ Editando proveedor ${currentDbRecord.cod}`);
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    limpiarFormulario();
    alert("Edición cancelada");
  };

  const currentDbRecord = viewDetailId ? auditoriasDB.find(a => a.id === viewDetailId) : null;
  const currentVisitData = currentDbRecord?.visita;

  if (viewHistory) {
    if (viewDetailId && currentVisitData && currentDbRecord) {
      const v = currentVisitData;
      const pct = v.pct || 0;
      return (
        <div key={`checklist-detail-${viewDetailId}`} className="flex flex-col min-h-[100dvh] bg-[#f8fafc] text-slate-800">
          <div className="bg-[#002B5C] px-5 py-4 flex items-center justify-between sticky top-0 z-50">
            <button onClick={() => setViewDetailId(null)} className="text-white flex items-center gap-2 text-sm font-bold">
              <ArrowLeft className="w-5 h-5"/> Volver
            </button>
            <span className="text-white font-bold text-sm">Detalle</span>
            <div className="w-5"/>
          </div>
          <div className="p-4 flex-1">
            <div className="bg-[#EBF5FB] rounded-[18px] p-4 mb-4 border border-[#D6EAF8]">
              <div className="flex justify-between py-1.5 border-b border-[#D6EAF8]"><span className="text-[#64748b] font-bold text-[12px]">Fecha</span><span className="font-medium text-sm">{v.fecha}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#D6EAF8]"><span className="text-[#64748b] font-bold text-[12px]">Proveedor</span><span className="font-medium text-sm">{currentDbRecord.cod} · {v.nom}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#D6EAF8]"><span className="text-[#64748b] font-bold text-[12px]">Tanque</span><span className="font-medium text-sm">{v.cod_tanque} · {v.nom_tanque}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#D6EAF8]"><span className="text-[#64748b] font-bold text-[12px]">Responsable</span><span className="font-medium text-sm">{v.responsable}</span></div>
              <div className="flex justify-between py-1.5"><span className="text-[#64748b] font-bold text-[12px]">Asesor</span><span className="font-medium text-sm">{v.asesor}</span></div>
            </div>
            
            <div className={`rounded-[18px] p-4 text-center mb-4 ${pct >= 90 ? 'bg-[#dcfce7]' : pct >= 70 ? 'bg-[#fef3c7]' : 'bg-[#CAF0F8]'}`}>
              <div className={`text-4xl font-bold mb-2 ${pct >= 90 ? 'text-[#16a34a]' : pct >= 70 ? 'text-[#d97706]' : 'text-[#1E3A8A]'}`}>
                {pct.toFixed(1)}%
              </div>
              <div className="flex justify-center gap-4 text-xs font-bold">
                <span className="text-[#16a34a]">SI: {v.siAll}</span>
                <span className="text-[#dc2626]">NO: {v.noAll}</span>
                <span className="text-[#d97706]">N/A: {v.naAll}</span>
              </div>
            </div>

            <button onClick={iniciarEdicion} className="w-full bg-[#00B4D8] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mb-2 active:scale-95 transition-transform"><PenTool className="w-4 h-4"/> Editar</button>
            <button onClick={() => exportExcel(currentDbRecord.cod, v)} className="w-full bg-[#16a34a] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mb-2 active:scale-95 transition-transform"><Download className="w-4 h-4"/> Exportar Excel</button>
            <button onClick={() => exportPDF(currentDbRecord.cod, v)} className="w-full bg-[#dc2626] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mb-4 active:scale-95 transition-transform"><FileText className="w-4 h-4"/> Exportar PDF</button>
            
            <button onClick={() => handleEliminar(viewDetailId!)} className="w-full bg-slate-100 text-slate-800 border border-slate-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/> Eliminar</button>
          </div>
        </div>
      );
    }

    return (
      <div key="checklist-history-list" className="flex flex-col min-h-[100dvh] bg-[#f8fafc] text-slate-800">
        <div className="bg-[#002B5C] px-5 py-4 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => setViewHistory(false)} className="text-white p-1 -ml-1">
            <X className="w-6 h-6"/>
          </button>
          <span className="text-white font-bold text-sm tracking-wide">Historial de Auditorías</span>
          <div className="w-6"/>
        </div>
        <div className="p-4 flex-1">
          {auditoriasDB.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-bold">No hay auditorías guardadas</p>
            </div>
          ) : (
            auditoriasDB.map((a, index) => {
              const v = a.visita as VisitaData;
              if (!v) return null;
              const pct = v.pct || 0;
              return (
                <div key={`hist-db-${a.id || index}`} onClick={() => setViewDetailId(a.id!)} className="bg-white border rounded-[16px] p-3.5 mb-2.5 active:scale-[0.98] transition-transform cursor-pointer">
                  <div className="text-[13px] font-bold text-[#002B5C] mb-1">{a.cod} — {a.nom}</div>
                  <div className="text-[11px] text-[#94a3b8] mb-2 font-medium">Fecha: {v.fecha} · Asesor: {v.asesor}</div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#f1f5f9]">
                    <span className="text-[10px] font-bold text-[#94a3b8] font-mono">Última versión</span>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${pct >= 90 ? 'bg-[#dcfce7] text-[#16a34a]' : pct >= 70 ? 'bg-[#fef3c7] text-[#d97706]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  let globalIdx = 0;

  return (
    <div key="checklist-form-main" className="flex flex-col h-[100dvh] bg-[#f8fafc] text-slate-800 relative overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#001A3A] px-5 py-4 flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl bg-white/5 text-white hover:bg-white/20 transition-colors">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 bg-[#00B4D8] rounded-xl flex items-center justify-center text-lg shadow-sm">🧊</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white leading-tight">Checklist Calidad</span>
              <span className="text-[10px] text-white/50 font-mono tracking-wider">0466.VSC.FOR.023 · 2026</span>
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-white/50">
            {score.toFixed(0)}%
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1 relative">
          <div className="h-full bg-gradient-to-r from-[#00B4D8] to-[#48CAE4] rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }} />
        </div>
      </div>
      
      {/* Edit Banner */}
      {editingId && (
        <div className="mx-4 mt-4 bg-[#fef3c7] border-2 border-[#d97706] rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <span className="text-xl">✏️</span>
          <div className="flex-1 text-xs font-bold text-[#d97706]">
            Modo edición — Registro <span className="text-[#002B5C]">#{editingId}</span>
          </div>
          <button onClick={cancelarEdicion} className="bg-white border-[#d97706]/30 border text-[#d97706] px-3 py-1.5 rounded-full text-[11px] font-bold hover:bg-[#d97706] hover:text-white transition-colors">
            Cancelar
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
        {/* Datos del Registro */}
        <div className="bg-[#EBF5FB] rounded-2xl p-5 shadow-sm border border-[#D6EAF8]">
          <h2 className="text-[11px] font-bold text-[#002B5C] uppercase tracking-wide mb-4 flex items-center gap-2">Datos del Registro</h2>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Cód. Proveedor</label>
              <input type="tel" placeholder="1234" value={codProveedor} onChange={(e) => handleNumericInput(e.target.value, setCodProveedor)} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Nombre Proveedor</label>
              <input type="text" placeholder="Nombre..." value={nomProveedor} onChange={(e) => setNomProveedor(titleCase(e.target.value))} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Cód. Tanque</label>
              <input type="tel" placeholder="5678" value={codTanque} onChange={(e) => handleNumericInput(e.target.value, setCodTanque)} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Nombre Tanque</label>
              <input type="text" placeholder="Nombre..." value={nomTanque} onChange={(e) => setNomTanque(titleCase(e.target.value))} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Responsable</label>
              <input type="text" placeholder="Nombre..." value={responsable} onChange={(e) => setResponsable(titleCase(e.target.value))} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Teléfono</label>
              <input type="tel" placeholder="Número..." value={telefono} onChange={(e) => handleNumericInput(e.target.value, setTelefono)} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-[#002B5C] uppercase tracking-wide mb-1.5">Asesor de Finca</label>
              <input type="text" placeholder="NOMBRE DEL ASESOR" value={asesor} onChange={(e) => handleUpperOnly(e.target.value, setAsesor)} className="w-full bg-[#F0F7FA] border-2 border-[#D6EAF8] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#00B4D8] font-sans uppercase placeholder:normal-case" />
            </div>
          </div>
        </div>
        
        {/* Preguntas */}
        <div className="mt-5 flex flex-col gap-3">
          {Object.entries(SECCIONES).map(([sec, preguntas], secIdx) => (
            <div key={`sec-${secIdx}`} className="flex flex-col gap-3">
              <div className="mt-2 text-[10px] font-bold text-white bg-[#002B5C] px-3.5 py-1.5 rounded-full inline-flex self-start uppercase tracking-wide">
                {sec}
              </div>
              
              {preguntas.map((p, pIdx) => {
                const i = globalIdx++;
                const isSoloObs = SOLO_OBS.has(i);
                const isCurva = i === IDX_CURVA;
                const isTemp = /temperatura|°c/i.test(p);
                const isLitro = /litros/i.test(p);
                const isHora = /\(hora\)/i.test(p);
                const label = p.replace(/\(numerico °C\)/i, '').replace(/\(litros\)/i, '').replace(/\(hora\)/i, '').trim();
                const numStr = String(i + 1).padStart(2, '0');
                const ans = respuestas[i] || null;

                return (
                  <div key={`q-${i}-${pIdx}`} className={`bg-white rounded-[12px] p-3.5 shadow-sm border-[1.5px] transition-all
                    ${isSoloObs ? 'border-l-4 border-l-[#00B4D8]' : ''}
                    ${ans === 'SI' ? 'bg-[#f0fdf4] border-[#16a34a]' : ''}
                    ${ans === 'NO' ? 'bg-[#fef2f2] border-[#dc2626]' : ''}
                    ${ans === 'NA' ? 'bg-[#FEF3C7] border-[#d97706]' : ''}
                    ${!ans && !isSoloObs ? 'border-slate-200' : ''}
                  `}>
                    <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold text-[#002B5C] font-mono mb-1">
                      #{numStr}. {isCurva && <span className="bg-[#fef3c7] text-[#d97706] px-2 py-[2px] rounded-full text-[9px]">INFO</span>}
                    </div>
                    <div className="text-[13px] font-bold text-slate-800 leading-snug mb-2.5">
                      {label}
                    </div>
                    
                    {(isTemp || isLitro || isHora) && (
                      <div className="flex items-center gap-2 mb-2.5 bg-[#CAF0F8] rounded-lg px-3 py-2 border border-[#00B4D8]/20">
                        {isHora ? (
                          <input type="time" value={extras[i] || ''} onChange={e => setExtras({...extras, [i]: e.target.value})} className="flex-1 bg-transparent border-none outline-none font-mono font-bold text-[#002B5C] text-sm" />
                        ) : (
                          <>
                            <input type="number" step="0.1" value={extras[i] || ''} onChange={e => setExtras({...extras, [i]: e.target.value})} placeholder="0.0" className="flex-1 bg-transparent border-none outline-none font-mono font-bold text-[#002B5C] text-sm" />
                            <span className="text-[11px] font-bold text-[#00B4D8]">{isTemp ? '°C' : 'Lts'}</span>
                          </>
                        )}
                      </div>
                    )}

                    {!isSoloObs && (
                      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                        <button onClick={() => setRespuestas({...respuestas, [i]: 'SI'})} className={`py-2 px-1.5 rounded-lg border-[1.5px] text-xs font-bold transition-all ${ans === 'SI' ? 'bg-[#dcfce7] text-[#16a34a] border-[#16a34a]' : 'bg-[#f1f5f9] text-slate-600 border-transparent'}`}>✓ SI</button>
                        <button onClick={() => setRespuestas({...respuestas, [i]: 'NO'})} className={`py-2 px-1.5 rounded-lg border-[1.5px] text-xs font-bold transition-all ${ans === 'NO' ? 'bg-[#fee2e2] text-[#dc2626] border-[#dc2626]' : 'bg-[#f1f5f9] text-slate-600 border-transparent'}`}>✕ NO</button>
                        <button onClick={() => setRespuestas({...respuestas, [i]: 'NA'})} className={`py-2 px-1.5 rounded-lg border-[1.5px] text-xs font-bold transition-all ${ans === 'NA' ? 'bg-[#fef3c7] text-[#d97706] border-[#d97706]' : 'bg-[#f1f5f9] text-slate-600 border-transparent'}`}>— N/A</button>
                      </div>
                    )}

                    <textarea placeholder="Observaciones (opcional)..." value={observaciones[i] || ''} onChange={e => setObservaciones({...observaciones, [i]: e.target.value})} rows={2} className="w-full bg-transparent border-[1.5px] border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 resize-none min-h-[44px] focus:outline-none focus:border-[#00B4D8] transition-colors" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Real Time Result */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mt-4 mb-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Resultado en tiempo real</div>
          <div className={`text-5xl font-bold text-center leading-none mb-1 transition-colors ${score >= 90 ? 'text-[#16a34a]' : score >= 70 ? 'text-[#d97706]' : 'text-[#1E3A8A]'}`}>
            {score.toFixed(1)}%
          </div>
          <div className="text-center text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-4">Cumplimiento</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <div className="text-2xl font-bold text-[#16a34a] leading-none mb-1">{siAll}</div>
              <div className="text-[10px] font-bold text-[#16a34a] uppercase tracking-wide">SI</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <div className="text-2xl font-bold text-[#dc2626] leading-none mb-1">{noAll}</div>
              <div className="text-[10px] font-bold text-[#dc2626] uppercase tracking-wide">NO</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <div className="text-2xl font-bold text-[#d97706] leading-none mb-1">{naAll}</div>
              <div className="text-[10px] font-bold text-[#d97706] uppercase tracking-wide">N/A</div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Nav Fixed as Sticky relative to container flow */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-3 grid grid-cols-3 gap-2 z-40 pb-[max(0.75rem,safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button onClick={handleNuevo} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-[11px] active:scale-95 transition-transform hover:bg-slate-200">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
        <button onClick={handleGuardar} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#16a34a] text-white font-bold text-[11px] shadow-sm active:scale-95 transition-transform hover:bg-[#15803d]">
          <Save className="w-4 h-4" /> Guardar
        </button>
        <button onClick={() => setViewHistory(true)} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#002B5C] text-white font-bold text-[11px] shadow-sm active:scale-95 transition-transform hover:bg-[#001A3A]">
          <History className="w-4 h-4" /> Historial
        </button>
      </div>
    </div>
  );
}
