---
title: "Boletín 3: Docker: contenerizar la aplicación"
---

# Boletín 3: Docker: contenerizar la aplicación

> **OBJETIVO**
>
> Empaquetar tu API en una imagen Docker portable, ligera y segura, eliminando el clásico "en mi máquina funciona". Escribirás un Dockerfile multi-stage, levantarás la aplicación junto a una base de datos PostgreSQL con Docker Compose y aprenderás a que el arranque conjunto sea fiable: healthchecks y volúmenes.

## 1. Objetivos de la sesión

- **Entender imágenes y contenedores**: capas, caché de build, registries y portabilidad.
- **Escribir un Dockerfile multi-stage** que compile con Maven y produzca una imagen ligera y sin privilegios de root.
- **Usar Docker Compose** para levantar la API junto a PostgreSQL, con arranque ordenado y persistencia real.
- **Exponer el estado de la aplicación** con un endpoint de salud, base de todo lo que viene después.

## 2. Conceptos clave

### 2.1 Imagen vs contenedor

Una **imagen** es una plantilla inmutable (el "molde") construida en capas. Un **contenedor** es una instancia en ejecución de esa imagen (el "objeto"). De una imagen puedes arrancar muchos contenedores.

### 2.2 Las capas y la caché de build

Cada instrucción del Dockerfile crea una capa. Docker reutiliza una capa si la instrucción y sus entradas no han cambiado, **pero invalida esa capa y todas las siguientes en cuanto algo cambia**. De ahí la regla de oro: *lo que cambia poco, arriba; lo que cambia mucho, abajo*. Por eso se copia primero el `pom.xml` y se descargan las dependencias, y solo después se copia `src/`: así editar una clase no vuelve a descargar medio Maven Central.

### 2.3 Por qué multi-stage para Java

Compilar requiere Maven y el JDK completo (cientos de MB). Pero para **ejecutar** solo necesitas el JAR y un JRE. El **multi-stage build** usa una primera etapa para compilar y una segunda, mínima, que solo copia el JAR resultante. La imagen final es mucho más pequeña y tiene menos superficie de ataque: cada herramienta que no está en la imagen es una vulnerabilidad que no tienes.

| Término | Qué es |
|---|---|
| volumen nombrado | Almacenamiento gestionado por Docker que sobrevive a docker compose down. |
| bind mount | Una carpeta de tu máquina montada dentro del contenedor. |
| healthcheck | Comando que Docker ejecuta periódicamente para saber si el servicio está listo, no solo arrancado. |
| red de Compose | Red privada donde cada servicio es alcanzable por su nombre (db, api). |

## 3. Trabajo práctico — Núcleo (obligatorio)

### Parte A — Primeros pasos con Docker

- Comprueba la instalación y ejecuta una imagen de prueba:

```bash
docker --version
docker compose version
docker run hello-world
```

### Parte B — Dockerfile multi-stage

Crea un archivo `Dockerfile` en la raíz del proyecto:

```dockerfile
# ---- Etapa 1: build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Etapa 2: runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Nunca ejecutes la aplicación como root
RUN useradd --system --uid 1001 app
COPY --from=build /app/target/*.jar app.jar
USER app

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD ["sh", "-c", "wget -qO- http://localhost:8080/actuator/health | grep -q UP"]
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- Crea también un `.dockerignore` para no copiar basura al contexto de build:

```bash
target/
.git/
.idea/
*.md
deploy/
```

- Construye la imagen y arranca un contenedor:

```bash
docker build -t tareas-api:0.1 .
docker run -p 8080:8080 tareas-api:0.1
# Prueba: curl http://localhost:8080/api/tasks
```

- Compara el tamaño de la imagen final con la de build: `docker images | grep -E "tareas-api|maven"`.
- **Demuestra la caché de capas**: cambia una línea de una clase Java, reconstruye y mide el tiempo. Después mueve `COPY src ./src` por encima de `COPY pom.xml .`, reconstruye y vuelve a medir. Anota ambos tiempos en el `AI_LOG.md`.

> **OJO**
>
> La instrucción `HEALTHCHECK` anterior necesita el endpoint de salud de la Parte C. Añade primero Actuator o el contenedor aparecerá siempre como *unhealthy*.

### Parte C — Endpoint de salud

Añade Spring Boot Actuator y expón únicamente lo necesario. Este endpoint lo usarán después el healthcheck de Compose (Parte D), el pipeline ([Boletín 4](boletin4-ci-github-actions.html)) y el despliegue ([Boletín 7](boletin7-ansible.html)):

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
# application.properties
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized
```

- Comprueba que `curl http://localhost:8080/actuator/health` devuelve `{"status":"UP"}`.

### Parte D — De H2 a PostgreSQL con Compose

Hasta ahora la app usaba H2 en memoria. Vamos a darle persistencia real con PostgreSQL en un segundo contenedor.

- Sustituye la dependencia de H2 por el driver `postgresql` en el `pom.xml`.
- Deja que Hibernate cree el esquema al arrancar: `spring.jpa.hibernate.ddl-auto=update`.

Crea `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: tareas
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret_local_dev
    ports: ["5432:5432"]
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d tareas"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build: .
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/tareas
      SPRING_DATASOURCE_USERNAME: app
      SPRING_DATASOURCE_PASSWORD: secret_local_dev
    depends_on:
      db:
        condition: service_healthy

volumes:
  db-data:
```

- Levanta todo el stack y compruébalo:

```bash
docker compose up --build

curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Probar Docker","status":"TODO"}'
```

- Comprueba la persistencia: `docker compose down`, `docker compose up` y verifica que la tarea **sigue ahí**.
- Comprueba ahora `docker compose down -v` y explica en el `AI_LOG.md` la diferencia entre ambos comandos.

> **CONSEJO**
>
> Los dos detalles que más fallos causan en esta parte son el **volumen nombrado** (sin él "persiste" por accidente en un volumen anónimo que no controlas) y `depends_on` con `condition: service_healthy`. Sin la condición, `depends_on` solo espera a que el contenedor *arranque*, no a que Postgres acepte conexiones: la API intentará conectarse antes de tiempo y fallará de forma intermitente. Es la causa número uno del clásico *"a veces funciona y a veces no"*.

> **OJO**
>
> La contraseña en texto plano del Compose es solo para desarrollo local. **Nunca** se suben credenciales reales al repositorio. En el [Boletín 5](boletin5-cd-github-actions.html) verás cómo gestionar secretos correctamente.

### Parte E — Versionar los cambios

- Crea una rama y abre un Pull Request como en el [Boletín 2](boletin2-github.html) con: `Dockerfile`, `.dockerignore` y `docker-compose.yml`.
- Documenta en el README cómo levantar el proyecto con Docker.
- Pide revisión a tu pareja: que compruebe que el `docker compose up` le funciona **en su máquina** partiendo de un clon limpio.

## 4. Ampliación (para nota alta)

### Parte F — Dev container

Un *dev container* define el entorno de desarrollo como código: quien clone el repositorio obtiene el mismo JDK, el mismo Maven y las mismas extensiones, sin instalar nada. Crea `.devcontainer/devcontainer.json`:

```json
{
  "name": "tareas-api",
  "image": "mcr.microsoft.com/devcontainers/java:21",
  "features": {
    "ghcr.io/devcontainers/features/java:1": { "installMaven": "true" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "forwardPorts": [8080, 5432],
  "postCreateCommand": "git config core.hooksPath .githooks && mvn -B dependency:go-offline",
  "customizations": {
    "vscode": { "extensions": ["vscjava.vscode-java-pack", "ms-azuretools.vscode-docker"] }
  }
}
```

- Ábrelo con "Reopen in Container" y comprueba que puedes compilar y lanzar los tests dentro. Documenta la ventaja en el README.

### Parte G — Adelgazar y auditar la imagen

- Prueba una base más pequeña (`eclipse-temurin:21-jre-alpine`) o una imagen *distroless*, y compara tamaños en una tabla.
- Usa `docker history tareas-api:0.1` y la herramienta `dive` para ver qué pesa en cada capa.
- Ejecuta `docker scout quickview tareas-api:0.1` y anota cuántas vulnerabilidades tiene tu imagen base (en el [Boletín 6](boletin6-pipeline-robusto.html) lo automatizarás con Trivy).
- Acelera la build con una **caché de BuildKit** para el repositorio local de Maven:

```bash
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.m2 mvn -B clean package -DskipTests
```

### Parte H — Perfiles de entorno

- Separa la configuración en `application-dev.properties` (H2) y `application-prod.properties` (PostgreSQL), y selecciona el perfil con la variable `SPRING_PROFILES_ACTIVE`.
- Comprueba que la aplicación arranca igual en local sin Docker (perfil `dev`) y dentro de Compose (perfil `prod`).

## 5. Cierre de la sesión

### Reto de depuración

Estos tres fallos son reales y los verás otra vez en el resto del curso. Reprodúcelos y explica la causa:

- Quita `condition: service_healthy` del Compose y levanta el stack varias veces desde cero (`docker compose down -v && docker compose up`). Describe el error de la API y por qué aparece unas veces sí y otras no.
- Cambia `EXPOSE 8080` por `EXPOSE 9090` sin tocar nada más. ¿Sigue funcionando `docker run -p 8080:8080`? Explica para qué sirve realmente `EXPOSE`.
- Ejecuta `docker run tareas-api:0.1` (sin `-p`). La aplicación arranca pero `curl` desde tu máquina falla. ¿Por qué?

### Antes de terminar

- Actualiza `docs/AI_LOG.md` con al menos dos entradas (los tiempos de build de la Parte B dan una entrada excelente).
- Checkpoint: sabrás explicar por qué `COPY pom.xml` va antes que `COPY src` y qué diferencia hay entre `down` y `down -v`.

## 6. Entrega del boletín

> **ENTREGA**
>
> El repositorio en GitHub, ahora con:

- `Dockerfile` **multi-stage** funcional, con usuario no root y `HEALTHCHECK`, más `.dockerignore`.
- La imagen se construye y el contenedor arranca y responde; comparativa de tamaños documentada.
- Endpoint `/actuator/health` respondiendo `UP`.
- `docker-compose.yml` con volumen nombrado, healthcheck de Postgres y `depends_on: condition: service_healthy`.
- Evidencia de persistencia entre `down` y `up`.
- README actualizado y cambios incorporados vía Pull Request revisado.
- `docs/AI_LOG.md` actualizado.

## 7. Criterios de evaluación

| Aspecto | Peso |
|---|---|
| Dockerfile multi-stage correcto, imagen ligera, sin root y con healthcheck | 25% |
| Compose con Postgres: arranque ordenado, volumen nombrado y persistencia demostrada | 35% |
| Endpoint de salud y comprensión de la caché de capas (tiempos medidos) | 15% |
| Cambios versionados vía PR revisado y documentación | 15% |
| Diario de IA (docs/AI_LOG.md) con reflexión real | 10% |
| Bonus — Ampliación: devcontainer, adelgazamiento y auditoría de la imagen, perfiles | hasta +1,5 |
