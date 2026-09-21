# EventoMax Frontend

Frontend web de **EventoMax**, plataforma cloud para la gestión y producción de eventos del **Caso 8** de DSY1107 – Desarrollo Cloud Native I.

## Estado EP1

La versión de EP1 implementa el flujo seguro definido para el proyecto:

`Angular → Microsoft Entra ID → JWT → AWS API Gateway → ms-eventomax-bff → microservicio de dominio`

Actualmente el frontend incluye:

- autenticación con Microsoft Entra ID mediante MSAL Angular;
- Authorization Code Flow con PKCE;
- adquisición y envío de Access Token mediante `MsalInterceptor`;
- protección de rutas con `MsalGuard` y autorización por roles;
- Dashboard con datos reales;
- consulta de producciones desde la API real;
- consulta del catálogo de servicios desde la API real;
- manejo de estados de carga, error y datos vacíos;
- formato regional `es-CL`;
- vistas de Reportes y Auditoría preparadas para las siguientes etapas, sin datos simulados.

## Tecnologías implementadas

- Angular 22
- TypeScript 6
- Angular Router
- HttpClient
- Reactive Forms
- MSAL Angular / MSAL Browser
- RxJS
- Vitest
- CSS modular propio

> El repositorio documenta las tecnologías realmente utilizadas en esta versión. No se incluyen dependencias no instaladas como parte del stack efectivo de EP1.

## Autenticación y autorización

EventoMax utiliza **Microsoft Entra ID** con OAuth 2.0 / OpenID Connect.

La SPA:

1. autentica al usuario con MSAL;
2. obtiene un Access Token para el scope configurado de EventoMax;
3. agrega `Authorization: Bearer <access_token>` a las solicitudes protegidas;
4. envía las solicitudes a AWS API Gateway;
5. aplica control de acceso en frontend según los roles presentes en el token.

Roles contemplados:

- `Admin`
- `Productor`
- `Organizador`
- `Auditor`

La autorización del frontend complementa, pero no reemplaza, las validaciones de seguridad del API Gateway, BFF y microservicios.

## Rutas principales

- `/login`
- `/dashboard`
- `/productions`
- `/catalog`
- `/reports`
- `/audit`

Las rutas protegidas usan `MsalGuard` y `roleGuard` según el rol requerido.

## Configuración

Los archivos de entorno se encuentran en:

- `src/environments/environment.ts` para desarrollo local;
- `src/environments/environment.prod.ts` para build de producción.

Estos archivos contienen únicamente configuración pública de la SPA, como tenant, client ID público, scope y URL de API Gateway. No deben incorporarse secretos.

## Ejecución local

Requisitos:

- Node.js compatible con Angular 22
- npm

Instalar dependencias:

```bash
npm ci
```

Ejecutar en desarrollo:

```bash
npm start
```

La aplicación queda disponible normalmente en:

```text
http://localhost:4200
```

## Pruebas

Ejecutar la suite:

```bash
npm test -- --watch=false
```

La validación final de EP1 cerró con **88 pruebas aprobadas**.

## Build de producción

```bash
npm run build
```

La configuración de producción utiliza `environment.prod.ts` y genera artefactos con hashing para despliegue estático.

El frontend está preparado para desplegarse en **Amazon S3 + CloudFront**. La configuración de Redirect URI de Entra ID y CORS de API Gateway debe incluir el dominio final de CloudFront.

## Seguridad

No almacenar en este repositorio:

- Client Secrets;
- Access Tokens o Refresh Tokens;
- credenciales AWS;
- credenciales PostgreSQL;
- archivos `.env` reales;
- passwords;
- claves privadas o archivos PEM.

Los secretos deben administrarse mediante variables de entorno y servicios seguros de configuración cuando corresponda.

## Estrategia de ramas

- `main`: versión estable y preparada para entrega/despliegue.
- `develop`: rama de integración.
- `feature/*`: nuevas funcionalidades.
- `fix/*`: correcciones.
- `chore/*`: configuración o mantenimiento.
- `docs/*`: documentación.

Flujo de integración:

`feature/fix/docs → Pull Request → develop → pruebas → Pull Request → main`

## Proyecto académico

**Asignatura:** DSY1107 – Desarrollo Cloud Native I  
**Caso:** Caso 8 – EventoMax

**Integrantes:**

- Ignacio Valeria
- Benjamín Flores
- Benjamín Espinoza
