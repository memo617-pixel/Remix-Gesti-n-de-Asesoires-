# Reglas y Contexto del Proyecto: Gestión de Asesores

Este archivo contiene el contexto del proyecto y las reglas que el agente de IA debe seguir en todas las interacciones.

## Flujo de Trabajo y Despliegue
- **Desarrollo:** AI Studio.
- **Control de Versiones:** Repositorio en GitHub.
- **Hosting / Plataforma de Despliegue:** Vercel.
- **URL de Producción:** (Pendiente de actualizar por el usuario)

## Objetivos del Proyecto
- **PWA Offline-First:** La aplicación está diseñada específicamente para ser instalada y ejecutada de manera nativa (PWA) en teléfonos celulares. Su principal característica es el funcionamiento *offline* para que los asesores puedan usarla en las fincas sin señal de internet.

## Reglas de Arquitectura
- **Archivos PWA:** `manifest.json`, `sw.js` (Service Worker), y los íconos (ej. `icon-512x512.png`) deben mantenerse siempre en el directorio `/public/` para que la plataforma de hosting los exponga en la raíz del servidor y el Service Worker mantenga su "scope" completo.
- **Evitar Errores de API Globales:** Se debe siempre tener precaución con modificaciones a objetos globales como `window.fetch` que librerías externas o builders puedan sobreescribir.

## Reglas de Interfaz y Negocio (Regla de Oro)
- NO modificar bajo ninguna circunstancia la estructura visual, colores de la interfaz, lógicas de cálculo de cumplimiento, ni formulación de las preguntas en los componentes principales (como `VisitaInforme.tsx` y `ChecklistTanques.tsx`), a menos que se indique directa y explícitamente modificar algo de ello.
