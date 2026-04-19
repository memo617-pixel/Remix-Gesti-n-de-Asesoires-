export interface Visita {
  id: number;
  fecha: string;
  codigo: string;
  ruta: string;
  proveedor: string;
  telefono: string;
  genero: string;
  edad: string;
  temas: string[];
  otros: string;
  objetivo: string;
  actividades: string;
  recomendaciones: string;
  comentarios: string;
  lat: string | null;
  lng: string | null;
  alt: number | null;
  firmaProveedor: string;
  firmaAsesor: string;
  nombreAsesor: string;
}

export const TEMAS_DISPONIBLES = [
  { id: "compra", label: "Compra De Leche", icon: "🥛" },
  { id: "asistencia", label: "Asistencia Técnica", icon: "🧰" },
  { id: "cambio", label: "Cambio Climático", icon: "🌍" },
  { id: "fomento", label: "Fomento", icon: "🌱" },
  { id: "cartera", label: "Cartera", icon: "💰" },
  { id: "agricultura", label: "Agricultura Regenerativa", icon: "♻️" },
  { id: "inspeccion", label: "Inspección Ruta", icon: "📋" },
  { id: "bpg", label: "BPG", icon: "✅" },
  { id: "bienestar", label: "Bienestar Animal", icon: "🐄" },
  { id: "auditoria", label: "Auditoría", icon: "🔍" },
  { id: "calidad", label: "Calidad", icon: "🏆" },
  { id: "derechos", label: "Derechos Humanos", icon: "🤝" }
];
