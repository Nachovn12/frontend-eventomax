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
  <a href="#accesos-directos--demo-en-vivo"><strong>Accesos Demo</strong></a> •
  <a href="#stack-tecnológico-e-infraestructura-aws"><strong>Stack y AWS</strong></a> •
  <a href="#arquitectura-cloud-native"><strong>Arquitectura</strong></a> •
  <a href="#galería-del-portal"><strong>Galería</strong></a>
</p>

</div>

**EventoMax Production Portal** es la plataforma web **Cloud Native** para la gestión operativa de eventos masivos, producciones técnicas, acreditación, reportería ejecutiva y auditoría distribuida, desplegada en **AWS (`us-east-1`)** y accesible vía **HTTPS** desde cualquier navegador.

---

## Accesos Directos — Demo en Vivo

Todos los servicios operan sobre **HTTPS público** (Amazon S3 + AWS API Gateway + Nginx Edge Proxy), listos para usar desde cualquier PC institucional:

| Interfaz UI | Acceso HTTPS | Credenciales / Autenticación |
| :--- | :--- | :--- |
| **Portal Web EventoMax**<br /><sub>SPA Angular • Flujo operativo, producciones y RBAC</sub> | [**Abrir Portal Web**](https://eventomax-production-portal-app.s3.us-east-1.amazonaws.com/index.html) | **SSO Microsoft Entra ID**<br /><sub>Login corporativo OAuth 2.0 / MSAL</sub> |
| **Swagger UI (API BFF)**<br /><sub>Endpoints REST • [Spec OpenAPI JSON](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/v3/api-docs)</sub> | [**Abrir Swagger UI**](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/swagger-ui/index.html) | **Lectura pública**<br /><sub>Probar `/api/**`: **Authorize** → `Bearer <JWT>`</sub> |
| **Apache Kafka UI**<br /><sub>`eventomax-cluster` • 3 brokers, 6 tópicos, 65 particiones</sub> | [**Abrir Kafka UI**](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/kafka-ui/) | Usuario: `eventomax_admin`<br />Clave: `EventoMax2026!` |
| **RabbitMQ Management**<br /><sub>Clúster HA 2 nodos • Colas `q.cmd.*` y DLQs</sub> | [**Abrir RabbitMQ UI**](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/rabbitmq/) | Usuario: `eventomax`<br />Clave: `eventomax` |

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
      <p align="center"><strong>Dashboard Ejecutivo</strong> — KPIs y gráficas Apache ECharts</p>
    </td>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-2-productions.png" alt="Gestión de Producciones" width="100%" />
      <p align="center"><strong>Producciones</strong> — Ciclo operativo y asignación técnica</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-3-crewticket.png" alt="Crew y Acreditación" width="100%" />
      <p align="center"><strong>Crew & Ticketing</strong> — Gestión de personal, zonas y entradas</p>
    </td>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-4-audit.png" alt="Auditoría y Trazabilidad" width="100%" />
      <p align="center"><strong>Auditoría Distribuida</strong> — Trazabilidad de eventos</p>
    </td>
  </tr>
</table>

---

<details>
<summary><strong>Referencia técnica: Rutas RBAC y comandos de desarrollo / despliegue S3</strong></summary>

### Rutas y Roles ([`src/app/app.routes.ts`](src/app/app.routes.ts))

| Ruta | Roles Permitidos | Descripción |
| :--- | :--- | :--- |
| `/portal`, `/login` | Público | Landing y login corporativo MSAL |
| `/dashboard` | `Admin`, `Productor`, `Organizador`, `Auditor` | Tablero operativo |
| `/productions` | `Admin`, `Productor`, `Organizador` | Administración de producciones |
| `/catalog` | `Admin`, `Productor` | Catálogo de recursos y proveedores |
| `/reports` | `Admin` | Reportería consolidada |
| `/audit` | `Admin`, `Auditor` | Auditoría y trazabilidad |
| `/forbidden` | Autenticado | Acceso denegado |

### Comandos Locales y S3

```bash
npm ci && npm start          # Desarrollo local (http://localhost:4200)
npm test && npm run e2e      # Vitest + Playwright
npm run build && aws s3 sync dist/frontend-eventomax/browser/ s3://eventomax-production-portal-app --delete
```

</details>
