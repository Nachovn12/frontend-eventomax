<div align="center">

<a href="https://eventomax-production-portal-app.s3.us-east-1.amazonaws.com/index.html">
  <img src="public/branding/eventomax/logos/eventomax-readme-banner.svg" alt="EventoMax — Cloud Native Production Operations Portal" width="100%" />
</a>

<br />

[![Portal Web](https://img.shields.io/badge/Portal%20Web-Amazon%20S3-024ffc?style=for-the-badge&logo=amazonaws&logoColor=white)](https://eventomax-production-portal-app.s3.us-east-1.amazonaws.com/index.html)
[![Swagger UI](https://img.shields.io/badge/Swagger%20UI-OpenAPI%203-85EA2D?style=for-the-badge&logo=swagger&logoColor=173647)](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/swagger-ui/index.html)
[![Kafka UI](https://img.shields.io/badge/Kafka%20UI-3%20Brokers-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/kafka-ui/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Management%20UI-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/rabbitmq/)

<p>
  <a href="#contexto-del-caso--eventomax"><strong>Contexto</strong></a> •
  <a href="#accesos-directos--demo-en-vivo"><strong>Accesos Demo</strong></a> •
  <a href="#roles-y-gobierno-de-acceso-rbac"><strong>Roles RBAC</strong></a> •
  <a href="#stack-tecnológico-e-infraestructura-aws"><strong>Stack y AWS</strong></a> •
  <a href="#arquitectura-cloud-native"><strong>Arquitectura</strong></a> •
  <a href="#galería-del-portal"><strong>Galería</strong></a>
</p>

<sub>
  <strong>Caso 8:</strong> Plataforma de Producción y Montaje de Eventos &nbsp;|&nbsp;
  <strong>Asignatura:</strong> Desarrollo Cloud Native (<code>DSY1107</code>) &nbsp;|&nbsp;
  <strong>Equipo:</strong> Ignacio Valeria · Benjamín Flores · Benjamín Espinoza
</sub>

</div>

---

## Contexto del Caso — EventoMax

**EventoMax** es una plataforma **SaaS B2B** diseñada para productoras de eventos masivos y empresas de montaje técnico que requieren coordinar operaciones críticas en tiempo real, trazabilidad documental y control de acceso corporativo sobre infraestructura **Cloud Native en AWS (`us-east-1`)**.

- **Ciclo Operativo End-to-End:** Administra producciones técnicas desde su solicitud hasta el cierre (`SOLICITADO → CONFIRMADO → EN_MONTAJE → EN_EJECUCION → CERRADO`), integrando catálogo de equipamiento y reservas en **Amazon RDS PostgreSQL**.
- **Mensajería Híbrida Desacoplada:**
  - **RabbitMQ Cluster HA (Comandos y DLQ):** Orquesta tareas asíncronas de notificación, emisión de **Tickets de Cuadrilla** (`/crew-ticket`), generación de **Actas de Cierre PDF** (`/quote-pdf`) y administración programática con `AmqpAdmin`.
  - **Apache Kafka (Event-Driven + DLT):** Transmite eventos de dominio (`productions.events`) hacia proyecciones analíticas de **KPIs ejecutivos** y un registro de **Auditoría distribuida inmutable**.
- **Seguridad Defense-in-Depth:** Autenticación federada con **Microsoft Entra ID (OAuth 2.0 + PKCE)** en el frontend Angular 22 y validación criptográfica de JWT, scopes y verificación de propiedad (**anti-IDOR**) en el **Backend-for-Frontend (`ms-eventomax-bff`)**.

---

## Accesos Directos — Demo en Vivo

Todos los endpoints y consolas operan sobre **HTTPS público** (Amazon S3 + AWS API Gateway → Nginx Edge Proxy), listos para abrir desde cualquier PC institucional sin túneles ni configuraciones locales:

| Interfaz UI | Acceso HTTPS | Credenciales / Autenticación |
| :--- | :--- | :--- |
| **Portal Web EventoMax**<br /><sub>SPA Angular • Flujo operativo, producciones, catálogo y auditoría</sub> | [**Abrir Portal Web**](https://eventomax-production-portal-app.s3.us-east-1.amazonaws.com/index.html) | **SSO Microsoft Entra ID**<br /><sub>OAuth 2.0 + PKCE (cuentas asignadas por rol)</sub> |
| **Swagger UI (API BFF)**<br /><sub>Endpoints REST `GET`/`POST`/`PUT`/`DELETE` • [Spec OpenAPI JSON](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/v3/api-docs)</sub> | [**Abrir Swagger UI**](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/swagger-ui/index.html) | **Lectura pública**<br /><sub>Probar `/api/**`: botón **Authorize** → `Bearer <JWT>`</sub> |
| **Apache Kafka UI**<br /><sub>`eventomax-cluster` • 3 brokers, 6 tópicos, 65 particiones</sub> | [**Abrir Kafka UI**](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/kafka-ui/) | Usuario: `eventomax_admin`<br />Clave: `EventoMax2026!` |
| **RabbitMQ Management**<br /><sub>Clúster HA 2 nodos • Exchanges, colas `q.cmd.*` y DLQs</sub> | [**Abrir RabbitMQ UI**](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/rabbitmq/) | Usuario: `eventomax`<br />Clave: `eventomax` |

> **Requisito para evaluación:** La capa backend, brokers y base de datos corren sobre **AWS Academy Learner Lab** (`ec2-eventomax-apps`, `ec2-eventomax-kafka`, `ec2-eventomax-mq`); verificar que el laboratorio y las 3 instancias EC2 estén en estado `running` antes de la demo.

---

## Roles y Gobierno de Acceso (RBAC)

La plataforma aplica autorización granular por **App Roles** emitidos en el JWT de **Microsoft Entra ID** (`EntraJwtAuthoritiesConverter` + guards Angular en [`src/app/app.routes.ts`](src/app/app.routes.ts)):

| Rol Corporativo | Responsabilidad en el Negocio | Vistas SPA Habilitadas | Capacidades Clave en API / Plataforma |
| :--- | :--- | :--- | :--- |
| **`Admin`** | Dirección general, gobierno de plataforma y operación de infraestructura | `/dashboard`, `/productions`, `/catalog`, `/reports`, `/audit` | Control total de producciones, CRUD completo del catálogo (`POST`/`PUT`), reportería de KPIs (`/api/report/**`), auditoría y administración programática de colas (`/api/rabbit-admin/**`) |
| **`Productor`** | Jefe técnico y operativo del montaje y coordinación en terreno | `/dashboard`, `/productions`, `/catalog` | Gestión de ciclo de vida y estados (`PUT /status`), republicación de comandos RabbitMQ, emisión de **Crew Tickets**, Actas PDF y consulta de catálogo |
| **`Organizador`** | Gestor comercial / cliente responsable del evento y su alcance | `/dashboard`, `/productions` | Creación de nuevas producciones (`POST /productions`), actualización de contacto, seguimiento de estado, reservas asociadas y descarga de **Acta PDF** |
| **`Auditor`** | Fiscalización, cumplimiento normativo y trazabilidad operativa | `/dashboard`, `/audit` | Visibilidad ejecutiva de solo lectura en tablero operativo y consulta del timeline inmutable de eventos consumidos desde Kafka (`/api/audit/timeline`) |

> Las rutas `/portal` y `/login` son públicas para ingreso federado; cualquier acceso autenticado sin el rol requerido es redirigido determinísticamente a `/forbidden` y rechazado por el BFF con `403 Forbidden`.

---

## Stack Tecnológico e Infraestructura AWS

<table>
  <tr>
    <td align="center" width="20%">
      <img src="public/branding/tech/angular.svg" width="40" height="40" alt="Angular 22" /><br />
      <strong>Angular 22</strong><br />
      <sub>SPA • TypeScript 6 • Tailwind 4</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/microsoft.svg" width="40" height="40" alt="Microsoft Entra ID" /><br />
      <strong>Microsoft Entra ID</strong><br />
      <sub>MSAL • OAuth 2.0 • RBAC JWT</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/spring-boot.svg" width="40" height="40" alt="Spring Boot" /><br />
      <strong>Spring Boot</strong><br />
      <sub>BFF API • OpenAPI / Swagger</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/apache-kafka.svg" width="40" height="40" alt="Apache Kafka" /><br />
      <strong>Apache Kafka 3.8</strong><br />
      <sub>3 Brokers • 6 Tópicos • Kafka UI</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/rabbitmq.svg" width="40" height="40" alt="RabbitMQ" /><br />
      <strong>RabbitMQ</strong><br />
      <sub>Clúster HA 2 Nodos • AMQP</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <img src="public/branding/tech/postgresql.svg" width="40" height="40" alt="PostgreSQL" /><br />
      <strong>PostgreSQL</strong><br />
      <sub>Persistencia Relacional • RDS</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/docker.svg" width="40" height="40" alt="Docker" /><br />
      <strong>Docker Compose</strong><br />
      <sub>Contenedores • Nginx Edge Proxy</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/aws.svg" width="40" height="40" alt="AWS API Gateway" /><br />
      <strong>AWS API Gateway</strong><br />
      <sub>Punto Único HTTPS Público</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/aws-ec2.svg" width="40" height="40" alt="Amazon EC2" /><br />
      <strong>Amazon EC2 (×3)</strong><br />
      <sub>Apps • Clúster Kafka • Clúster MQ</sub>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/aws-s3.svg" width="40" height="40" alt="Amazon S3" /><br />
      <strong>Amazon S3</strong><br />
      <sub>Hosting Estático SPA</sub>
    </td>
  </tr>
</table>

---

## Arquitectura Cloud Native

```mermaid
flowchart TB
    User(["Navegador / PC Demo"])

    User -->|"HTTPS Estático"| S3["Amazon S3<br/>Portal Web Angular 22 SPA"]
    User -.->|"OAuth 2.0 / OIDC"| Entra["Microsoft Entra ID<br/>Identidad y Roles JWT"]
    User -->|"HTTPS + Bearer JWT"| APIGW["AWS API Gateway<br/>7dewsdyt7i · us-east-1"]

    subgraph VPC["AWS VPC · us-east-1"]
        direction TB

        subgraph AppsEC2["ec2-eventomax-apps · 52.20.127.84 (VPC 172.31.22.43)"]
            direction TB
            Proxy["Nginx Edge Proxy (:8080)<br/>eventomax-edge-proxy"]
            BFF["ms-eventomax-bff (:8081)<br/>Spring Boot BFF · JWT + RBAC + Swagger UI"]

            subgraph Services["Microservicios Backend (Docker · eventomax-net)"]
                direction LR
                MS["Dominio<br/>productions · catalog · notify<br/>report · audit"]
                ADM["Administración Brokers<br/>kafka-admin · rabbit-admin"]
            end

            Proxy -->|"/api/** · /swagger-ui/**"| BFF
            BFF --> MS
            BFF --> ADM
        end

        APIGW -->|"HTTP :8080"| Proxy

        subgraph DataPlane["Mensajería y Persistencia en VPC"]
            direction LR
            KafkaEC2["ec2-eventomax-kafka (172.31.20.204)<br/>Apache Kafka 3.8 (3 Brokers) · Kafka UI"]
            MQEC2["ec2-eventomax-mq (172.31.25.8)<br/>RabbitMQ Cluster HA (2 Nodos)"]
            RDS[("Amazon RDS<br/>PostgreSQL")]
        end

        Proxy -->|"/kafka-ui/**"| KafkaEC2
        Proxy -->|"/rabbitmq/**"| MQEC2
        MS -->|"Eventos Kafka"| KafkaEC2
        ADM -->|"Admin Tópicos"| KafkaEC2
        MS -->|"Comandos AMQP"| MQEC2
        ADM -->|"AmqpAdmin"| MQEC2
        MS -->|"JDBC"| RDS
    end

    classDef client fill:#024ffc,stroke:#60a5fa,stroke-width:2px,color:#ffffff;
    classDef edge fill:#0f294d,stroke:#3b82f6,stroke-width:1.5px,color:#f8fafc;
    classDef app fill:#1e3a5f,stroke:#38bdf8,stroke-width:1.5px,color:#f8fafc;
    classDef infra fill:#1e293b,stroke:#94a3b8,stroke-width:1.5px,color:#f8fafc;
    classDef aws fill:#2d200f,stroke:#f59e0b,stroke-width:1.5px,color:#fef3c7;

    class User client;
    class Entra,APIGW edge;
    class S3,RDS aws;
    class Proxy,BFF,MS,ADM app;
    class KafkaEC2,MQEC2 infra;
```

---

## Galería del Portal

<table>
  <tr>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-1-dashboard.png" alt="Dashboard Ejecutivo" width="100%" />
      <p align="center"><strong>Dashboard Ejecutivo</strong> — KPIs operativos y gráficas Apache ECharts</p>
    </td>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-2-productions.png" alt="Gestión de Producciones" width="100%" />
      <p align="center"><strong>Producciones</strong> — Ciclo operativo, reservas y asignación técnica</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-3-crewticket.png" alt="Crew Ticket y Actas PDF" width="100%" />
      <p align="center"><strong>Crew Ticket & Actas PDF</strong> — Órdenes de cuadrilla y documentos asíncronos</p>
    </td>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-4-audit.png" alt="Auditoría Distribuida" width="100%" />
      <p align="center"><strong>Auditoría Distribuida</strong> — Trazabilidad inmutable de eventos Kafka</p>
    </td>
  </tr>
</table>
