import Dexie, { type EntityTable } from 'dexie';

// Define the shape of VisitaData based on what is stored
export interface AuditoriaData {
  id?: number;
  cod: string;
  nom: string;
  visita: any; // The full VisitaData object containing the 57 responses
  fecha: string;
  asesor: string;
}

export interface VisitaGeneralData {
  id?: number;
  fecha: string;
  codigo: string;
  ruta: string;
  proveedor: string;
  [key: string]: any; // Permite el resto de campos (telefono, ubicacion, temas, observaciones, etc.)
}

export interface CapacitacionDraftData {
  id: number;
  data: any;
  updatedAt: string;
}

export interface CapacitacionData {
  id?: string;
  fechaGuardado: string;
  bloque1: any;
  bloque2: any;
  bloque3: any;
  bloque4: any;
}

const db = new Dexie('AsesoresLacteosDB') as Dexie & {
  auditorias: EntityTable<AuditoriaData, 'id'>;
  visitas: EntityTable<VisitaGeneralData, 'id'>;
  capacitacionDraft: EntityTable<CapacitacionDraftData, 'id'>;
  capacitaciones: EntityTable<CapacitacionData, 'id'>;
};

// Schema definition: 'id' as autoincrement primary key, then other indexed properties
db.version(4).stores({
  auditorias: '++id, cod, nom, fecha, asesor',
  visitas: '++id, proveedor, fecha, codigo',
  capacitacionDraft: 'id',
  capacitaciones: 'id, fechaGuardado'
});

export { db };
