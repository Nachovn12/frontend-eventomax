# EventoMax Frontend

Frontend web de **EventoMax**, plataforma para la gestión y producción de eventos.

## Tecnologías

- Angular
- TypeScript
- Angular Router
- HttpClient
- Reactive Forms
- MSAL Angular
- Tailwind CSS
- Angular CDK

## Autenticación

La aplicación utilizará **Microsoft Entra ID** mediante **MSAL Angular**.

El flujo seguro definido para EventoMax es:

Angular → Microsoft Entra ID → JWT → AWS API Gateway → ms-eventomax-bff → microservicio de dominio

## Estrategia de ramas

- `main`: versión estable y preparada para entrega.
- `develop`: rama de integración.
- `feature/*`: desarrollo de historias de usuario.
- `fix/*`: correcciones.
- `chore/*`: configuración e infraestructura.

Flujo de integración:

`feature/* → Pull Request → develop → pruebas → Pull Request → main`

## Seguridad

No se deben almacenar en este repositorio:

- Client Secrets
- Access Tokens
- credenciales AWS
- credenciales PostgreSQL
- archivos `.env` reales
- passwords o claves privadas

Las configuraciones sensibles deberán utilizar variables de entorno o mecanismos seguros equivalentes.

## Ejecución local

Las instrucciones de instalación, compilación y ejecución se completarán cuando se inicialice el proyecto Angular.

## Proyecto académico

**Asignatura:** DSY1107 – Desarrollo Cloud Native I  
**Caso:** Caso 8 – EventoMax
