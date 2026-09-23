# EventoMax Frontend

Frontend web de **EventoMax**, plataforma cloud para la gestión y producción de eventos.

## Tecnologías implementadas

- Angular 22
- TypeScript
- MSAL Angular / MSAL Browser
- Microsoft Entra ID
- OAuth 2.0 / OpenID Connect
- Authorization Code Flow con PKCE
- JWT
- AWS API Gateway HTTP API con JWT Authorizer
- `ms-eventomax-bff`
- microservicios de dominio
- PostgreSQL como base de datos vigente del proyecto

## Arquitectura y Flujo de Autenticación

El proyecto implementa el siguiente flujo seguro:

```text
Angular
→ Microsoft Entra ID
→ Access Token JWT
→ AWS API Gateway
→ ms-eventomax-bff
→ microservicio de dominio
```

## Validación previa al despliegue

```powershell
npm ci
npm test -- --watch=false
npm run build
```

Resultado esperado:

```text
18 test files passed
110 tests passed
build PASS
```

## Demo EP1 paso a paso

Esta demostración se realiza contra la infraestructura cloud desplegada de EventoMax.
No depende de localhost.

### 1. Abrir EventoMax en cloud y preparar Network

```text
https://eventomax-frontend-085765167202-us-east-1.s3.us-east-1.amazonaws.com/login
```

Antes de iniciar sesión:

1. Abrir la URL cloud.
2. Presionar `F12`.
3. Ir a `Network`.
4. Activar `Preserve log`.
5. Opcionalmente seleccionar `Fetch/XHR`.
6. Recién ahora seleccionar **Iniciar sesión con Microsoft**.
7. Completar la autenticación con Microsoft Entra ID.
8. Al volver a EventoMax, abrir Dashboard, Catálogo o Producciones.
9. Seleccionar una request `services` o `productions` hacia API Gateway.
10. Ir a `Headers → Request Headers`.
11. Verificar:

   `Authorization: Bearer <access_token>`

> Si DevTools se abre después del login, la solicitud utilizada para obtener el token puede no aparecer porque ocurrió antes. MSAL además puede reutilizar un Access Token vigente sin solicitar uno nuevo.

> Para la rúbrica, la evidencia principal es que una request protegida hacia API Gateway contiene `Authorization: Bearer <access_token>`.

> Durante la presentación no mostrar ni dejar visible el JWT completo.

---

### 2. Prueba 401 — endpoint protegido sin JWT

```powershell
curl.exe -i "https://ntnnrohhj8.execute-api.us-east-1.amazonaws.com/api/catalog/services"
```

Resultado esperado:

```text
HTTP/1.1 401
```

---

### 3. Prueba 401 — JWT inválido

```powershell
curl.exe -i `
  -H "Authorization: Bearer token-invalido" `
  "https://ntnnrohhj8.execute-api.us-east-1.amazonaws.com/api/catalog/services"
```

Resultado esperado:

```text
HTTP/1.1 401
```

---

### 4. Preparar el Access Token para las pruebas con curl

Desde una request protegida `services` o `productions`:

1. Ir a `Headers → Request Headers`.
2. Copiar únicamente el valor posterior a `Bearer`.
3. No copiar la palabra `Bearer`.

> Si se inspecciona la respuesta de autenticación de Microsoft, el token correcto para consumir API Gateway es `access_token`, no `id_token` ni `refresh_token`.

En PowerShell:

```powershell
$token = Get-Clipboard
```

---

### 5. JWT válido — GET Catálogo

```powershell
curl.exe -i `
  -H "Authorization: Bearer $token" `
  "https://ntnnrohhj8.execute-api.us-east-1.amazonaws.com/api/catalog/services"
```

Destino interno esperado:
```text
API Gateway → ms-eventomax-bff → ms-eventomax-catalog
```

Resultado esperado:

```text
HTTP/1.1 200
```
(Más el JSON).

---

### 6. JWT válido — GET Producciones

```powershell
curl.exe -i `
  -H "Authorization: Bearer $token" `
  "https://ntnnrohhj8.execute-api.us-east-1.amazonaws.com/api/productions"
```

Destino interno esperado:
```text
API Gateway → ms-eventomax-bff → ms-eventomax-productions
```

Resultado esperado según rol:

```text
HTTP/1.1 200
```
(Más el JSON).

---

### 7. Prueba de autorización por rol — 403

> **Prueba opcional:** ejecutar si el docente solicita demostrar
> autorización por roles.

Para esta prueba se necesita un JWT **válido**, pero perteneciente a un
usuario que no tenga el rol requerido por el endpoint.

Caso recomendado para EventoMax:

```text
Admin       → GET /api/catalog/services → permitido
Productor   → GET /api/catalog/services → permitido
Organizador → GET /api/catalog/services → no permitido
```

#### 1. Iniciar sesión con un usuario Organizador

Cerrar la sesión del usuario Admin.

Para evitar que Microsoft/MSAL reutilice la sesión anterior, utilizar
preferentemente una ventana privada/incógnito o un perfil de navegador
diferente.

Iniciar sesión en EventoMax cloud con el usuario que tenga rol
`Organizador`.

Abrir DevTools antes del login:

```text
F12
→ Network
→ Preserve log
→ Iniciar sesión con Microsoft
```

Una vez autenticado, abrir una request protegida y copiar únicamente su
`access_token`, sin la palabra `Bearer`.

#### 2. Cargar el token del usuario Organizador

En PowerShell:

```powershell
$tokenSinRol = Get-Clipboard
```

#### 3. Ejecutar GET sobre Catálogo

```powershell
curl.exe -i `
  -H "Authorization: Bearer $tokenSinRol" `
  "https://ntnnrohhj8.execute-api.us-east-1.amazonaws.com/api/catalog/services"
```

Resultado esperado:

```text
HTTP/1.1 403 Forbidden
```

Interpretación:

```text
401 Unauthorized
→ no existe un JWT válido o el token fue rechazado.

403 Forbidden
→ el JWT es válido y el usuario está autenticado,
  pero su rol no autoriza el acceso al recurso.
```

La comparación que se demuestra es:

```text
Admin + JWT válido
GET /api/catalog/services
→ 200 + JSON

Organizador + JWT válido
GET /api/catalog/services
→ 403 Forbidden
```

Esto evidencia que EventoMax no solo valida autenticación JWT, sino que
también aplica autorización por rol.

> Si la llamada con el usuario Organizador responde `200`, revisar la
> autorización del BFF/backend porque el endpoint estaría permitiendo un rol
> no esperado.
>
> Si responde `401`, revisar que se haya copiado correctamente el
> `access_token` válido del usuario Organizador.

---

### 8. Evidencias visuales en cloud (Presentación)

**Microsoft Entra ID:**
- Tenant operativo.
- App Registration EventoMax.
- Redirect URI cloud.
- API scope configurado.
- App Roles y usuarios asignados.

**Frontend Angular + MSAL:**
- Login con Microsoft desde el frontend cloud.
- Logout funcional.
- Intentar acceder a una ruta protegida sin sesión y comprobar que el Guard bloquea/redirige.
- Abrir `F12 → Network` antes del login y activar `Preserve log`.
- Autenticarse con Microsoft Entra ID.
- Seleccionar una request `services` o `productions` hacia API Gateway.
- Verificar en `Headers → Request Headers` que existe `Authorization: Bearer <access_token>`.
- No es necesario que la solicitud de adquisición del token vuelva a aparecer después de autenticarse.
- No exponer el JWT completo durante la presentación.
- Mostrar comportamiento de la interfaz según el rol del usuario.
- Flujo OAuth 2.0 / OpenID Connect con Authorization Code + PKCE.

**AWS API Gateway:**
- Rutas `/api/catalog/*` y `/api/productions/*` configuradas.
- Integración hacia `ms-eventomax-bff`.
- JWT Authorizer asociado a las rutas protegidas.
- Issuer configurado.
- Audience configurado.
- CORS configurado para el frontend cloud.

**BFF / Spring Security:**
- Configuración de Resource Server JWT.
- Validación de issuer y audience.
- Validación de firma y vigencia mediante el proveedor de identidad.
- Autorización por rol.
- Flujo: API Gateway → `ms-eventomax-bff` → microservicio de dominio.

**Pruebas funcionales:**
- Request sin JWT → `401`.
- JWT inválido → `401`.
- JWT válido + rol autorizado → `200 + JSON`.
- JWT válido sin rol requerido → `403`, si existe usuario de prueba.
- Catálogo responde desde `ms-eventomax-catalog`.
- Producciones responde desde `ms-eventomax-productions`.

---

## Checklist final de demostración

| Prueba | Resultado esperado |
|---|---|
| Frontend cloud | Abre correctamente |
| Login Microsoft | Sesión autenticada |
| Guard sin sesión | Ruta protegida bloqueada/redirigida |
| Logout | Sesión finalizada |
| MsalInterceptor | `Authorization: Bearer ...` |
| GET sin JWT | 401 |
| JWT inválido | 401 |
| JWT válido + rol autorizado | 200 + JSON |
| JWT válido + rol insuficiente | 403, si existe usuario de prueba |
| Catálogo | JSON real |
| Producciones | JSON real |

---

## Proyecto académico

**Asignatura:** DSY1107 — Desarrollo Cloud Native I
**Caso:** Caso 8 — EventoMax

**Integrantes:**

- Ignacio Valeria
- Benjamín Flores
- Benjamín Espinoza