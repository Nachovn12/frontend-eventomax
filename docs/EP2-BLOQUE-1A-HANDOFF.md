# Handoff Técnico - EventoMax EP2: Bloque 1A (Frontend)

- **Repositorio:** `frontend-eventomax`
- **Rama:** `feature/EMX-bloque-1a-frontend`
- **Fecha:** Octubre 2026
- **Estado del bloque:** Implementado y verificado localmente.

---

## 1. Alcance Implementado

En este bloque se desarrollaron los componentes y flujos Angular para la gestión de equipos en catálogo y la asignación de inventario al confirmar producciones:

1. **Modelos y Servicios de Datos:**
   - Modelo `equipment.model.ts`: Interfaces para `Equipment`, `EquipmentCategory`, `CreateEquipmentRequest` y `ProductionReservationResponse`.
   - Extensión de `ProductionStatusUpdateRequest` con `items?: ProductionReservationItemRequest[]` para soportar la reserva atómica durante el cambio de estado.
   - `CatalogDataService`: Métodos `getEquipment()`, `createEquipment()` y `getReservationsByProduction(productionId)`.

2. **Pestañas y Gestión de Equipos en Catálogo:**
   - Navegación por pestañas accesibles WAI-ARIA (`role="tablist"`, `role="tab"`) entre "Servicios" y "Equipos e Inventario" con soporte completo de teclado.
   - Panel de métricas de stock (total, disponible, crítico) y filtros por búsqueda y categoría.
   - Formulario reactivo para alta de equipos reservado a rol `Admin` con validaciones de nombre, categoría, stock inicial y costo.

3. **Asignación de Reservas en Producciones:**
   - Modal interactivo de confirmación de estado que permite seleccionar equipos y cantidades con validación de límite de stock disponible.
   - Prevención de doble envío (`isConfirming` / `submitting` flag) para evitar solicitudes concurrentes desde el navegador.
   - Visualización de equipos reservados directamente en la vista de detalle de la producción confirmada.

4. **Ajuste de Presupuesto en `angular.json`:**
   - Incremento del warning budget de estilo por componente a 8kB para absorber los estilos integrados del catálogo y producciones sin advertencias en build.

---

## 2. Evidencia de Pruebas Locales

- **Pruebas unitarias:** 149/149 PASS (`npm test -- --watch=false`) a través de 24 suites de pruebas Jasmine/Karma.
- **Build de producción:** `npm run build` ejecutado exitosamente con generación de artefactos en `dist/` con 0 errores y 0 advertencias.

---

## 3. Limitaciones Conocidas y Trabajo Pendiente

> [!WARNING]
> No se declara 100% verificado ni listo para producción. Quedan pendientes pruebas de integración distribuida (E2E) con los demás microservicios en red compartida y despliegue real en infraestructura cloud/AWS.

- Pruebas E2E de navegador (Cypress/Playwright) en entorno integrado con BFF.
- Flujos de actualización/eliminación de equipos y servicios (Bloque 1B).
- Verificación visual con tokens reales de Entra ID en despliegue cloud.

---

## 4. Instrucciones para Continuar en el Laboratorio

### Requisitos previos:
- Node.js 20+ y npm 10+.

### Comandos de clonado y ejecución:
```bash
git clone https://github.com/Nachovn12/frontend-eventomax.git
cd frontend-eventomax
git checkout feature/EMX-bloque-1a-frontend

# Instalar dependencias exactas
npm ci

# Ejecutar pruebas unitarias
npm test -- --watch=false

# Compilar para producción
npm run build
```
