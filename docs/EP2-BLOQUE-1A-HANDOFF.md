# Handoff Técnico - EventoMax EP2: Bloque 1A (Frontend)

- **Repositorio:** `frontend-eventomax`
- **Rama:** `feature/EMX-bloque-1a-frontend`
- **Fecha:** Octubre 2026
- **Estado del bloque:** Implementado localmente; configuración de desarrollo local separada de producción.

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

4. **Separación de Configuración Local y Productiva:**
   - Destino productivo intacto en `src/environments/environment.ts` y `environment.prod.ts` (`https://ntnnrohhj8.execute-api.us-east-1.amazonaws.com`).
   - Configuración local explícita en `src/environments/environment.local.ts` (`apiGatewayUrl: 'http://localhost:4200'`).
   - Proxy dedicado en `proxy.conf.json` enrutando `/api/**` hacia `http://localhost:8080`.
   - Configuración en `angular.json` con `fileReplacements` específico para `local` y script npm `"start:local": "ng serve -c local"`.

---

## 2. Evidencia de Pruebas y Estado Real Verificado

- **Pruebas unitarias:** 149/149 PASS (`npm test -- --watch=false`).
- **Build de producción:** `npm run build` genera bundle limpio en `dist/` conservando el destino AWS original.
- **Arranque local comprobado en sesión:**
  - Microservicio Catalog levantado en puerto 8081 con PostgreSQL local en 5433 (`catalog_db`).
  - Microservicio Productions levantado en puerto 8082 con PostgreSQL local en 5432 (`productions_db`), RabbitMQ en 5672 y Kafka en 9092.
  - BFF levantado en puerto 8080 enrutando hacia Catalog (8081) y Productions (8082).
  - Proxy local verificado: peticiones a `http://localhost:4200/api/catalog/equipment` ingresan al BFF y son rechazadas con `401 Unauthorized` por falta de token Bearer (comprobación de aislamiento y seguridad activa).
- **Pruebas pendientes para el laboratorio:**
  - **Login interactivo con Entra ID y MFA:** Pendiente de ejecución en navegador.
  - **Audiencia real del token:** No debe inferirse únicamente a partir del string del scope; debe comprobarse inspeccionando el claim `aud` del token real emitido por Entra ID en la sesión del navegador.
  - **Flujo funcional completo:** Crear equipo con stock 5 → crear producción → confirmar con 2 unidades → verificar disponible=3 y reservado=2 → recargar página para validar persistencia → probar rechazo por sobreventa.
  - **Servicios Report y Audit:** No fueron levantados en esta sesión (rutas en BFF responderán con error de downstream; no se utilizaron mocks ni tráfico hacia la nube).

---

## 3. Instrucciones para Retomar en el Laboratorio

### Requisitos Previos:
- Node.js 20+ y npm 10+.
- JDK 21+ y Maven 3.9+ (o `./mvnw`).
- Docker Desktop activo para bases de datos PostgreSQL locales (o instancias locales de PostgreSQL 15/17).

### Ramas Requeridas:
- `frontend-eventomax`: rama `feature/EMX-bloque-1a-frontend`
- `ms-eventomax-catalog`: rama `feature/EMX-bloque-1a-catalog`
- `ms-eventomax-productions`: rama `feature/EMX-bloque-1a-productions`
- `ms-eventomax-bff`: rama `feature/EMX-bloque-1a-bff`

### Variables de Entorno Necesarias (Sin Secretos):

1. **Bases de datos locales (Docker):**
   ```bash
   docker run -d --name eventomax-test-catalog-db -p 5433:5432 -e POSTGRES_DB=catalog_db -e POSTGRES_USER=catalog_user -e POSTGRES_PASSWORD=catalog_pass postgres:17-alpine
   docker run -d --name eventomax-test-productions-db -p 5432:5432 -e POSTGRES_DB=productions_db -e POSTGRES_USER=productions_user -e POSTGRES_PASSWORD=productions_pass postgres:17-alpine
   ```

2. **Catalog (`ms-eventomax-catalog`):**
   ```bash
   java "-Dserver.port=8081" "-DDB_URL=jdbc:postgresql://localhost:5433/catalog_db" "-DDB_USER=catalog_user" "-DDB_PASSWORD=catalog_pass" -jar target/ms-eventomax-catalog-0.0.1-SNAPSHOT.jar
   ```

3. **Productions (`ms-eventomax-productions`):**
   ```bash
   java "-Dserver.port=8082" "-DDB_URL=jdbc:postgresql://localhost:5432/productions_db" "-DDB_USER=productions_user" "-DDB_PASSWORD=productions_pass" "-DCATALOG_BASE_URL=http://localhost:8081" "-DRABBITMQ_HOST=localhost" "-DRABBITMQ_PORT=5672" "-DRABBITMQ_USERNAME=eventomax" "-DRABBITMQ_PASSWORD=eventomax" "-DRABBITMQ_VHOST=/" "-DKAFKA_BOOTSTRAP_SERVERS=localhost:9092" "-DENTRA_ISSUER_URI=https://login.microsoftonline.com/f191bdc8-7926-4722-9ec0-cba663701940/v2.0" "-DENTRA_AUDIENCE=api://a1a87bcd-fed7-4d65-83c3-338389b80093" -jar target/ms-eventomax-productions-0.0.1-SNAPSHOT.jar
   ```

4. **BFF (`ms-eventomax-bff`):**
   ```bash
   java "-Dserver.port=8080" "-DENTRA_ISSUER_URI=https://login.microsoftonline.com/f191bdc8-7926-4722-9ec0-cba663701940/v2.0" "-DENTRA_AUDIENCE=api://a1a87bcd-fed7-4d65-83c3-338389b80093" "-DPRODUCTIONS_BASE_URL=http://localhost:8082" "-DCATALOG_BASE_URL=http://localhost:8081" "-DREPORT_BASE_URL=http://localhost:8083" "-DAUDIT_BASE_URL=http://localhost:8084" -jar target/ms-eventomax-bff-0.0.1-SNAPSHOT.jar
   ```

5. **Frontend Angular (`frontend-eventomax`):**
   ```bash
   git clone https://github.com/Nachovn12/frontend-eventomax.git
   cd frontend-eventomax
   git checkout feature/EMX-bloque-1a-frontend
   npm ci

   # Iniciar con configuración local integrada y proxy hacia localhost:8080
   npm run start:local
   ```
   Abrir en navegador: `http://localhost:4200/`
