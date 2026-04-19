export interface DetalleVisita {
  seccion: string;
  pregunta: string;
  respuesta: string;
  extra: string;
  observacion: string;
  esCurva: boolean;
  esSoloObs: boolean;
}

export interface VisitaData {
  id: number;
  fecha: string;
  nom: string;
  cod_tanque: string;
  nom_tanque: string;
  responsable: string;
  telefono: string;
  asesor: string;
  pct: number;
  si: number;
  no: number;
  na: number;
  siAll: number;
  noAll: number;
  naAll: number;
  detalles: DetalleVisita[];
}

export const SECCIONES = {
  "I. Condiciones Básicas": [
    "¿La estación cuenta con agua potable?",
    "¿Cuenta con Kit para cloro residual (Método DPD)?",
    "¿Lleva el registro del seguimiento diario del cloro residual?",
    "¿Es el volumen de agua potable disponible adecuado (Lt de agua/Lt de leche)?",
    "¿La estación cuenta con lavamanos, jabón de manos y toalla?",
    "¿La zona de enfriamiento se encuentra aislada?",
    "¿Todas las áreas se encuentran rotuladas?",
    "¿La estación se encuentra libre de focos de contaminación?",
    "¿Hay detergente alcalino en la estación y está rotulado?",
    "¿Hay detergente ácido en la estación y está rotulado?",
    "¿Hay detergente neutro y está rotulado?",
    "¿Hay desinfectante (clorados o amonios cuaternarios) en la estación y está rotulado?",
    "¿Está la estación en buenas condiciones de higiene?",
    "¿Hay cepillo para el lavado interno del tanque y está en buen estado?",
    "¿Hay cepillo cilíndrico para el lavado del ducto de salida y está en buen estado?",
    "¿Hay filtro para la leche en la estación y está en buen estado?",
    "¿Hay alcohol al 78% en la estación y está en un recipiente adecuado y aparece rotulado?",
    "¿Se realiza a cada cantina de leche la prueba de alcohol?",
    "¿Se sabe interpretar la prueba de alcohol?",
    "¿Hay evidencia de la utilización de agua caliente para el lavado de tanque y/o equipo de ordeño y/o cantinas?",
    "¿El procedimiento de recepción cumple con las BPF?",
    "¿Se revisa el estado e higiene de las cantinas y tapas?",
    "¿Toda la leche llega dentro del horario estipulado?",
    "¿Se enciende el tanque con un mínimo del 10% de su capacidad?",
    "¿Se puede evidenciar que tienen los equipos un esquema de mantenimiento preventivo?",
    "¿La planta eléctrica está operativa?",
    "¿La temperatura del tanque y el termómetro patrón coinciden (variación máx. 0,5)?",
    "¿Existe en la estación el procedimiento de lavado del tanque?",
    "¿Están los procedimientos de la estación escritos?",
    "¿Conoce el operario en detalle los procedimientos y los aplica?",
    "¿Sabe el operario de la estación a quién acudir en caso de emergencia con la leche?",
    "¿Hay existencia de EPP (guantes, gafas, botas, delantal, tapabocas) y se usan adecuadamente?",
    "¿Hay extintor vigente en la caseta de enfriamiento?",
    "¿Está la infraestructura de la caseta en buenas condiciones?",
    "¿Son custodiadas adecuadamente las contramuestras para realizar trazabilidad?",
    "¿Las pezoneras se encuentran en buen estado físico y de higiene?",
    "¿La unidad final se encuentra en buenas condiciones de funcionamiento e higiene?",
    "¿La tubería de conducción se encuentra en buenas condiciones de higiene?",
    "¿Las mangueras se encuentran en buenas condiciones físicas y de higiene?"
  ],
  "II. Recepción de Leche": [
    "¿Existe regla para cantinas legalizada?",
    "¿Tiene el tanque una regla medidora y es la que corresponde al tanque?",
    "¿Existe tabla medidora y es la que corresponde al tanque?",
    "¿Se lleva un registro ordenado y claro de la recepción de leche?",
    "¿Se registra la leche rechazada y su causa?",
    "¿En los tanques comunales se realiza refractometría a la leche recibida de cada proveedor?",
    "¿Se encuentra el tanque calibrado en su medida de volumen?"
  ],
  "III. Medidas Especiales": [
    "¿Sabe el operario sobre la importancia de una buena refrigeración y agitación?",
    "¿Está el tanque enfriando adecuadamente?",
    "Volumen de leche buena recepcionado según planillas (litros)",
    "Volumen de leche buena recepcionado según tanque (litros)",
    "Volumen de leche rechazada (litros)",
    "Hora a la que finaliza la recepción (hora)",
    "Temperatura de la leche al finalizar la RECEPCIÓN (numerico °C)",
    "¿Se hizo curva de enfriamiento?",
    "Hora de finalización del enfriamiento (hora)",
    "Hora a la que finaliza la INSPECCIÓN (hora)",
    "Temperatura de la leche al finalizar la inspección (numerico °C)"
  ]
};

export const SOLO_OBS = new Set([48, 49, 50, 51, 52, 54, 55, 56]);
export const IDX_CURVA = 53;
