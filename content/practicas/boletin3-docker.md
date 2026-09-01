---
title: "Boletín 3: Docker: contenerizar la aplicación"
---

# Boletín 3: Docker: contenerizar la aplicación

> **OBJETIVO**
>
> Empaquetar tu API en una imagen Docker portable, ligera y segura, eliminando el clásico "en mi máquina funciona". Escribirás un Dockerfile multi-stage y levantarás la aplicación junto a una base de datos PostgreSQL con Docker Compose.

## 1. Objetivos de la sesión

- **Entender imágenes y contenedores**: capas, caché de build, registries y portabilidad.
- **Escribir un Dockerfile multi-stage** que compile con Maven y produzca una imagen ligera y sin privilegios de root.
- **Usar Docker Compose** para levantar la API junto a PostgreSQL, con arranque ordenado y persistencia real.

## 2. Conceptos clave

### 2.1 Imagen vs contenedor

Una **imagen** es una plantilla inmutable (el "molde") construida en capas. Un **contenedor** es una instancia en ejecución de esa imagen (el "objeto"). De una imagen puedes arrancar muchos contenedores.

### 2.2 Las capas y la caché de build

Cada instrucción del Dockerfile crea una capa. Docker reutiliza una capa si la instrucción y sus entradas no han cambiado, pero invalida esa capa y todas las siguientes en cuanto algo cambia. De ahí la regla de oro: **lo que cambia poco, arriba; lo que cambia mucho, abajo**. Por eso se copia primero el `pom.xml` y se descargan las dependencias, y solo después se copia `src/`: así editar una clase no vuelve a descargar medio Maven Central.

### 2.3 Por qué multi-stage para Java

Compilar requiere Maven y el JDK completo (cientos de MB). Pero para ejecutar solo necesitas el JAR y un JRE. El **multi-stage build** usa una primera etapa para compilar y una segunda, mínima, que solo copia el JAR resultante. La imagen final es mucho más pequeña y tiene menos superficie de ataque ya que cada herramienta que no está en la imagen es una vulnerabilidad que no tienes.

| Término | Qué es |
|---|---|
| volumen nombrado | Almacenamiento gestionado por Docker que sobrevive a docker compose down. |
| bind mount | Una carpeta de tu máquina montada dentro del contenedor. |
| healthcheck | Comando que Docker ejecuta periódicamente para saber si el servicio está listo, no solo arrancado. |
| red de Compose | Red privada donde cada servicio es alcanzable por su nombre (db, api). |

## 3. Trabajo práctico

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

- Compara el tamaño de la imagen final con la de build. Para ello construye la etapa itermedia y muestra ambos tamaños con `docker images`.
- **Demuestra la caché de capas**: cambia una línea de una clase Java, reconstruye y mide el tiempo. Después mueve `COPY src ./src` por encima de `COPY pom.xml .`, reconstruye y vuelve a medir. Explica la diferencia de tiempos.

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
# en application.properties
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized
```

- Comprueba que `curl http://localhost:8080/actuator/health` devuelve `{"status":"UP"}`.

### Parte D — De H2 a PostgreSQL con Compose

Hasta ahora la app usaba H2 en memoria. Vamos a darle persistencia real con PostgreSQL en un segundo contenedor.

- Sustituye H2 por el driver `postgresql`. Hay que tocar el `pom.xml` y el `application.properties`. Pide a una IA que haga el cambio.

**Prompt de ejemplo**: Modifica ligeramente proyecto existente para sustituir la base de datos H2 en memoria por PostgreSQL, manteniendo Spring Data JPA con Hibernate como capa de persistencia.

- Crea un `docker-compose.yml` similar a esto:

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

- Levanta todo el stack y comprueba que hay persistencia real:

```bash
docker compose up --build
# inserta un dato real
curl -X POST ...
docker compose down

docker compose up
# comprueba que el dato sigue ahí
curl -X GET ...
```
- Comprueba ahora `docker compose down -v` y explica la diferencia entre ambos comandos.

> **OJO**
>
> La contraseña en texto plano del Compose es solo para desarrollo local. **Nunca** se suben credenciales reales al repositorio. En el [Boletín 5](boletin5-cd-github-actions.html) verás cómo gestionar secretos correctamente.

### Parte E — Versionar los cambios

- Crea una rama y abre un Pull Request como en el [Boletín 2](boletin2-github.html) con: `Dockerfile`, `.dockerignore` y `docker-compose.yml`.
- Documenta en el README cómo levantar el proyecto con Docker.
- Pide revisión a tu pareja: que compruebe que el `docker compose up` le funciona en su máquina partiendo de un clon limpio.

### Parte F — Dev container

Un *dev container* define el entorno de desarrollo como código: quien clone el repositorio obtiene el mismo JDK, el mismo Maven y las mismas herramientas, sin instalar nada. Sigue [Dev Containers spec](https://containers.dev/), un estándar abierto que soportan VS Code, GitHub Codespaces y la CLI `devcontainer`. Crea `.devcontainer/devcontainer.json`:

```json
{
  "name": "tareas-api",
  "image": "mcr.microsoft.com/devcontainers/java:21",
  "features": {
    "ghcr.io/devcontainers/features/java:1": { "installMaven": "true" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": { "moby": false }
  },
  "forwardPorts": [8080, 5432],
  "postCreateCommand": "git config core.hooksPath .githooks && mvn -B dependency:go-offline",
  "customizations": {
    "vscode": { "extensions": ["vscjava.vscode-java-pack", "ms-azuretools.vscode-docker"] }
  }
}
```

- Investiga y explica qué indica cada campo.
- En VS Code, hay una extensión llamada "Dev Containers" que te permite abrir el proyecto en un contenedor de desarrollo.


