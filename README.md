<a href="https://eventomax-production-portal-app.s3.us-east-1.amazonaws.com/index.html">
  <img src="public/branding/eventomax/logos/eventomax-readme-banner.svg" alt="EventoMax — Portal de Operaciones" width="100%" />
</a>

> **Caso de Estudio 8:** Plataforma B2B de Producción y Montaje de Eventos &nbsp;|&nbsp; **Asignatura:** Desarrollo Cloud Native (`DSY1107`) &nbsp;|&nbsp; **Equipo:** Ignacio Valeria, Benjamín Flores, Benjamín Espinoza

## Contexto del Proyecto

**EventoMax** centraliza la operación diaria de productoras de eventos masivos y empresas de montaje técnico sobre una arquitectura distribuida en **AWS (`us-east-1`)**.

El portal coordina el ciclo completo de cada producción (`SOLICITADO → CONFIRMADO → EN_MONTAJE → EN_EJECUCION → CERRADO`) junto con las reservas de equipamiento y servicios alojadas en **Amazon RDS PostgreSQL**.

Los procesos pesados y documentos operativos (órdenes de cuadrilla **Crew Ticket** y **Actas de Cierre en PDF**) se procesan de forma asíncrona mediante **RabbitMQ**, mientras que los cambios de estado viajan por **Apache Kafka** (`productions.events`) para alimentar el tablero de KPIs y el registro histórico de auditoría. Todo el tráfico hacia los microservicios pasa por `ms-eventomax-bff`, que valida los tokens JWT emitidos por **Microsoft Entra ID** y verifica la propiedad de los recursos antes de entregar archivos o datos sensibles.

## Accesos Directos (Demo en Vivo)

Todas las interfaces están expuestas bajo **HTTPS público** (Amazon S3 y AWS API Gateway hacia el Edge Reverse Proxy en EC2), por lo que funcionan desde cualquier computador institucional sin túneles ni configuración local.

| Interfaz | Enlace HTTPS | Usuario | Contraseña / Método |
| :--- | :--- | :--- | :--- |
| **Portal Web EventoMax** | [Abrir Portal Web](https://eventomax-production-portal-app.s3.us-east-1.amazonaws.com/index.html) | Cuenta Microsoft Entra ID | Login federado OAuth 2.0 (PKCE) |
| **Swagger UI (API BFF)** | [Abrir Swagger UI](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/swagger-ui/index.html) · [JSON](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/v3/api-docs) | Lectura pública | Para probar `/api/**`: botón **Authorize** con `Bearer <JWT>` |
| **Apache Kafka UI** | [Abrir Kafka UI](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/kafka-ui/) | Sin login | Acceso directo al clúster `eventomax-cluster` |
| **RabbitMQ Management** | [Abrir RabbitMQ UI](https://7dewsdyt7i.execute-api.us-east-1.amazonaws.com/rabbitmq/) | `eventomax` | `eventomax` |

*Nota de operación: la infraestructura backend y de mensajería se ejecuta en **AWS Academy Learner Lab**. Antes de iniciar la demostración, verificar que el laboratorio y las instancias `ec2-eventomax-apps`, `ec2-eventomax-kafka` y `ec2-eventomax-mq` estén encendidas (`running`).*

## Roles y Control de Acceso (RBAC)

La autorización se aplica tanto en las rutas del frontend ([`src/app/app.routes.ts`](src/app/app.routes.ts)) como en cada endpoint del BFF a partir del claim `roles` del token de Microsoft Entra ID.

| Rol | Función en la Operación | Vistas Habilitadas | Alcance Principal |
| :--- | :--- | :--- | :--- |
| **`Admin`** | Administración general y gobierno técnico de la plataforma | `/dashboard`, `/productions`, `/catalog`, `/reports`, `/audit` | Gestión global de producciones, CRUD completo de catálogo, reportería ejecutiva, auditoría y administración de colas (`/api/rabbit-admin/**`) |
| **`Productor`** | Dirección técnica y coordinación operativa del montaje | `/dashboard`, `/productions`, `/catalog` | Cambio de estado de producciones, republicación de comandos hacia RabbitMQ, emisión de Crew Tickets, descarga de Actas PDF y consulta de catálogo |
| **`Organizador`** | Contraparte comercial responsable del evento | `/dashboard`, `/productions` | Creación de nuevas solicitudes de producción, actualización de contacto, seguimiento de reservas asociadas y descarga de Actas PDF |
| **`Auditor`** | Revisión de cumplimiento y trazabilidad operativa | `/dashboard`, `/audit` | Lectura del tablero operativo y consulta del historial cronológico de eventos registrados vía Kafka |

Las rutas `/portal` y `/login` son públicas. Si un usuario autenticado intenta acceder a un módulo fuera de su rol, la aplicación redirige a `/forbidden` y el BFF responde `403 Forbidden`.

## Stack e Infraestructura

<table>
  <tr>
    <td align="center" width="20%">
      <img src="public/branding/tech/angular.svg" width="36" height="36" alt="Angular 22" /><br />
      <strong>Angular 22</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/microsoft.svg" width="36" height="36" alt="Microsoft Entra ID" /><br />
      <strong>Entra ID (MSAL)</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/spring-boot.svg" width="36" height="36" alt="Spring Boot" /><br />
      <strong>Spring Boot BFF</strong>
    </td>
    <td align="center" width="20%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="public/branding/tech/apache-kafka-dark.svg" />
        <img src="public/branding/tech/apache-kafka.svg" width="36" height="36" alt="Apache Kafka" />
      </picture><br />
      <strong>Apache Kafka 3.8</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/rabbitmq.svg" width="36" height="36" alt="RabbitMQ" /><br />
      <strong>RabbitMQ Cluster</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <img src="public/branding/tech/postgresql.svg" width="36" height="36" alt="PostgreSQL" /><br />
      <strong>PostgreSQL</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/docker.svg" width="36" height="36" alt="Docker" /><br />
      <strong>Docker & Nginx</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/aws.svg" width="36" height="36" alt="AWS API Gateway" /><br />
      <strong>API Gateway</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/aws-ec2.svg" width="36" height="36" alt="Amazon EC2" /><br />
      <strong>Amazon EC2 (×3)</strong>
    </td>
    <td align="center" width="20%">
      <img src="public/branding/tech/aws-s3.svg" width="36" height="36" alt="Amazon S3" /><br />
      <strong>Amazon S3</strong>
    </td>
  </tr>
</table>

## Arquitectura en AWS

```mermaid
flowchart TB
    User["Navegador"]

    User -->|HTTPS| S3["Amazon S3<br/>Portal Angular 22 SPA"]
    User -.->|OAuth 2.0 PKCE| Entra["Microsoft Entra ID<br/>Tokens JWT y Roles"]
    User -->|HTTPS + Bearer JWT| APIGW["AWS API Gateway<br/>7dewsdyt7i.us-east-1"]

    subgraph VPC["AWS VPC (us-east-1)"]
        direction TB

        subgraph AppsEC2["ec2-eventomax-apps · 52.20.127.84"]
            direction TB
            Proxy["Nginx Edge Proxy (:8080)"]
            BFF["ms-eventomax-bff (:8081)<br/>JWT · RBAC · Swagger UI"]
            MS["Servicios de Dominio<br/>productions · catalog · notify · report · audit"]
            ADM["Admin Brokers<br/>kafka-admin · rabbit-admin"]

            Proxy -->|"/api/** · /swagger-ui/**"| BFF
            BFF --> MS
            BFF --> ADM
        end

        APIGW -->|HTTP :8080| Proxy

        KafkaEC2["ec2-eventomax-kafka (172.31.20.204)<br/>3 Brokers Kafka · Kafka UI"]
        MQEC2["ec2-eventomax-mq (172.31.25.8)<br/>RabbitMQ HA (2 nodos)"]
        RDS[("Amazon RDS<br/>PostgreSQL")]

        Proxy -->|"/kafka-ui/**"| KafkaEC2
        Proxy -->|"/rabbitmq/**"| MQEC2
        MS -->|Eventos| KafkaEC2
        ADM -->|Tópicos| KafkaEC2
        MS -->|Comandos AMQP| MQEC2
        ADM -->|AmqpAdmin| MQEC2
        MS -->|JDBC| RDS
    end
```

## Vistas del Portal

<table>
  <tr>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-1-dashboard.png" alt="Dashboard operativo" width="100%" />
      <p align="center"><strong>Dashboard operativo</strong></p>
    </td>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-2-productions.png" alt="Gestión de producciones" width="100%" />
      <p align="center"><strong>Gestión de producciones</strong></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-3-crewticket.png" alt="Ticket de cuadrilla y Acta PDF" width="100%" />
      <p align="center"><strong>Ticket de cuadrilla y Acta PDF</strong></p>
    </td>
    <td width="50%">
      <img src="public/branding/eventomax/demo/demo-real-4-audit.png" alt="Auditoría de eventos" width="100%" />
      <p align="center"><strong>Auditoría de eventos (Kafka)</strong></p>
    </td>
  </tr>
</table>
