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
  id: number;
  fecha: string;
  codigo: string;
  ruta: string;
  proveedor: string;
  [key: string]: any; // Permite el resto de campos (telefono, ubicacion, temas, observaciones, etc.)
}

const db = new Dexie('AsesoresLacteosDB') as Dexie & {
  auditorias: EntityTable<AuditoriaData, 'id'>;
  visitas: EntityTable<VisitaGeneralData, 'id'>;
};

// Schema definition: 'id' as autoincrement primary key, then other indexed properties
db.version(1).stores({
  auditorias: '++id, cod, nom, fecha, asesor',
  visitas: '++id, proveedor, fecha, codigo'
});

export { db };
