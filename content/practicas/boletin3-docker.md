---
title: "Boletín 3: Docker: contenerizar la aplicación"
---

# Boletín 3: Docker: contenerizar la aplicación

> **OBJETIVO**
>
> Empaquetar tu API en una imagen Docker portable, ligera y segura, eliminando el clásico "en mi máquina funciona". Escribirás un Dockerfile multi-stage y levantarás la aplicación junto a una base de datos PostgreSQL con Docker Compose, gestionando la configuración sensible con un fichero `.env` que nunca llega al repositorio.

## 1. Objetivos de la sesión

- **Entender imágenes y contenedores**: capas, caché de build, registries y portabilidad.
- **Escribir un Dockerfile multi-stage** que compile con Maven y produzca una imagen ligera y sin privilegios de root.
- **Usar Docker Compose** para levantar la API junto a PostgreSQL, con arranque ordenado y persistencia real.
- **Separar configuración y código** con variables de entorno y un fichero `.env`.

## 2. Conceptos clave

### 2.1 Imagen vs contenedor

Una **imagen** es una plantilla inmutable (el "molde") construida en capas. Un **contenedor** es una instancia en ejecución de esa imagen (el "objeto"). De una imagen puedes arrancar muchos contenedores.

### 2.2 Las capas y la caché de build

Cada instrucción del Dockerfile crea una capa. Docker reutiliza una capa si la instrucción y sus entradas no han cambiado, pero invalida esa capa y todas las siguientes en cuanto algo cambia. **Lo que cambia poco, arriba; lo que cambia mucho, abajo**. Por eso se copia primero el `pom.xml` y se descargan las dependencias, y solo después se copia `src/`: así editar una clase no vuelve a descargar medio Maven Central.

### 2.3 Por qué multi-stage para Java

Compilar requiere Maven y el JDK completo (cientos de MB). Pero para ejecutar solo necesitas el JAR y un JRE. El **multi-stage build** usa una primera etapa para compilar y una segunda, mínima, que solo copia el JAR resultante. La imagen final es mucho más pequeña y tiene menos superficie de ataque, ya que cada herramienta que no está en la imagen es una vulnerabilidad que no tienes.

### 2.4 Conceptos de Docker Compose

| Término | Qué es |
|---|---|
| volumen nombrado | Almacenamiento gestionado por Docker que sobrevive a `docker compose down` (pero no a `docker compose down -v`). |
| healthcheck | Comando que Docker ejecuta periódicamente para saber si el servicio está listo, no solo arrancado. |
| red de Compose | Red privada donde cada servicio es alcanzable por su nombre (`db`, `api`). |

### 2.5 Configuración y secretos

El mismo código debe poder ejecutarse en tu portátil, en el CI y en producción cambiando solo la **configuración** (URL de la base de datos, usuarios, contraseñas). Esa configuración se pasa mediante **variables de entorno**, nunca escrita en el código ni en ficheros versionados.

| Fichero | ¿Se sube al repo? | Para qué sirve |
|---|---|---|
| `.env` | **No** | Valores reales de tu entorno local. Compose lo lee automáticamente. |
| `.env.example` | **Sí** | Plantilla que documenta qué variables hacen falta, con valores de ejemplo. |

## 3. Trabajo práctico

### Parte A — Primeros pasos con Docker

- Instala Docker Desktop (el panel de control visual de Docker que incluye Docker Engine y Docker Compose). Comprueba la instalación y ejecuta una imagen de prueba:

```bash
docker --version
docker compose version
docker run hello-world
```

### Parte B — Endpoint de salud

Antes de contenerizar, la aplicación necesita una forma de decir "estoy lista". Añade Spring Boot Actuator y expón únicamente lo necesario. Este endpoint lo usarán el healthcheck del Dockerfile (Parte C), Compose (Parte D), el pipeline ([Boletín 4](boletin4-ci-github-actions.html)) y el despliegue ([Boletín 6](boletin6-ansible.html)).

En el `pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

En `src/main/resources/application.properties`:

```properties
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized
```

- Arranca la aplicación en local y comprueba que `curl http://localhost:8080/actuator/health` devuelve `{"status":"UP"}`.

### Parte C — Dockerfile multi-stage

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

# curl solo para el healthcheck (la imagen base no garantiza que venga instalado)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Nunca ejecutes la aplicación como root
RUN useradd --system --uid 1001 app
COPY --from=build /app/target/*.jar app.jar
USER app

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD curl -fs http://localhost:8080/actuator/health | grep -q UP || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

- Crea también un `.dockerignore` para no enviar basura (ni secretos) al contexto de build:

```text
target/
.git/
.idea/
.vscode/
.devcontainer/
*.md
deploy/
.env
docker-compose*.yml
```

- Construye la imagen y arranca un contenedor:

```bash
docker build -t tareas-api:0.1 .
docker run --rm -p 8080:8080 tareas-api:0.1
# En otra terminal:
curl http://localhost:8080/api/tasks
```

- Con el contenedor arrancado, ejecuta `docker ps` y espera a que la columna `STATUS` muestre `(healthy)`.

- **Compara tamaños.** Construye solo la etapa intermedia con `--target` y muestra ambas imágenes:

```bash
docker build --target build -t tareas-api:build .
docker images tareas-api
```

  Explica de dónde sale la diferencia de tamaño.

- **Demuestra la caché de capas**:
  1. Cambia una línea de una clase Java, reconstruye y mide el tiempo (`time docker build -t tareas-api:0.1 .`).
  2. Mueve `COPY src ./src` por encima de `COPY pom.xml .`, vuelve a cambiar una clase, reconstruye y mide de nuevo.
  3. Explica la diferencia de tiempos y deja el Dockerfile en su orden original.

### Parte D — De H2 a PostgreSQL con Compose

Hasta ahora la app usaba H2 en memoria. Vamos a darle persistencia real con PostgreSQL en un segundo contenedor.

#### D.1 Cambiar la base de datos

Sustituye H2 por el driver de PostgreSQL. Puedes pedírselo a una IA.

**Prompt de ejemplo**: Modifica ligeramente el proyecto existente para sustituir la base de datos H2 en memoria por PostgreSQL, manteniendo Spring Data JPA con Hibernate como capa de persistencia. 

Comprueba que en `application.properties` no queda ninguna propiedad de H2 y que está la línea:

```text
spring.jpa.hibernate.ddl-auto=update
```

A partir de aquí la imagen ya no arranca sola con `docker run` (no tiene base de datos). Desde ahora levantaremos siempre el stack con Compose.

#### D.2 docker-compose.yml

Crea un `docker-compose.yml` en la raíz:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: tareas
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret_local_dev
    # Solo para conectarte desde tu máquina con un cliente SQL.
    ports: ["127.0.0.1:5432:5432"]
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

> **NOTA**
>
> El servicio `api` no declara healthcheck porque **hereda** el `HEALTHCHECK` del Dockerfile.

#### D.3 Comprobar la persistencia

Levanta todo el stack:

```bash
docker compose up --build -d
docker compose ps        # espera a que ambos servicios estén (healthy)
docker compose logs -f api   # Ctrl+C para salir de los logs
```

Inserta un dato y comprueba que está (adapta los campos del JSON a tu entidad):

```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Comprobar persistencia"}'

curl http://localhost:8080/api/tasks
```

Para y vuelve a levantar el stack:

```bash
docker compose down
docker compose up -d
curl http://localhost:8080/api/tasks   # el dato sigue ahí
```

Ahora repite con `-v`:

```bash
docker compose down -v
docker compose up -d
curl http://localhost:8080/api/tasks   # lista vacía
```

- Explica la diferencia entre `docker compose down` y `docker compose down -v`. ¿Qué se borra en cada caso?

> **OJO**
>
> El Compose tiene ahora la contraseña escrita en texto plano y va a acabar en el repositorio. Eso lo arreglamos en la Parte E.

### Parte E — Sacar la configuración a un fichero `.env`

Docker Compose lee automáticamente un fichero llamado `.env` situado junto a `docker-compose.yml` y usa sus valores para sustituir las expresiones `${VARIABLE}` del YAML. Vamos a sacar ahí las credenciales, paso a paso.

#### Paso 1 — Crear la plantilla `.env.example`

Este fichero **sí** se versiona: documenta qué variables necesita el proyecto, sin valores reales. Créalo en la raíz:

```dotenv
# Copia este fichero a .env y ajusta los valores
POSTGRES_DB=tareas
POSTGRES_USER=app
POSTGRES_PASSWORD=cambia_esto
```

#### Paso 2 — Crear tu `.env` local

Cópialo y pon tu contraseña local:

```bash
cp .env.example .env
```

Edita `.env`:

```dotenv
POSTGRES_DB=tareas
POSTGRES_USER=app
POSTGRES_PASSWORD=secret_local_dev
```

#### Paso 3 — Impedir que `.env` llegue a Git

No debe haber ningún `.env` en el repositorio. Añade al `.gitignore`:

```gitignore
.env
```

> **OJO**
>
> Si `.env` ya se había subido alguna vez, añadirlo al `.gitignore` no basta: hay que sacarlo del índice con `git rm --cached .env` y **cambiar la contraseña**, porque sigue en el historial.

#### Paso 4 — Impedir que `.env` llegue a la imagen

Ya lo añadimos al `.dockerignore` en la Parte C. Comprueba que está ahí: si no, el fichero se enviaría al contexto de build y podría acabar copiado dentro de una imagen publicada.

#### Paso 5 — Usar las variables en `docker-compose.yml`

Sustituye los valores escritos a mano por referencias a variables:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD en el fichero .env}
    ports: ["127.0.0.1:5432:5432"]
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build: .
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/${POSTGRES_DB}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      db:
        condition: service_healthy

volumes:
  db-data:
```

En este `docker-compose.yml` se utilizan tres formas distintas de trabajar con variables:

- **`${VAR}`**: Docker Compose sustituye la variable por su valor antes de crear el contenedor.

  ```yaml
  POSTGRES_DB: ${POSTGRES_DB}
  ```

  El valor puede proceder, por ejemplo, del entorno desde el que se ejecuta `docker compose` o del fichero `.env`.

- **`${VAR:?mensaje}`**: obliga a que la variable exista y tenga un valor no vacío. Si no es así, Compose no arranca y muestra el mensaje indicado.

  ```yaml
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD en el fichero .env}
  ```

- **`$${VAR}`**: el `$$` escapa el símbolo `$`, por lo que Docker Compose no sustituye la variable. Se deja como `${VAR}` para que sea resuelta posteriormente dentro del contenedor.

  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
  ```

#### Paso 6 — Verificar la sustitución

Antes de arrancar nada, pide a Compose que muestre la configuración final con las variables ya resueltas:

```bash
docker compose config
```

Comprueba que en la salida aparecen `tareas`, `app` y tu contraseña en lugar de `${...}`.

#### Paso 7 — Levantar el stack y comprobar que todo sigue funcionando

```bash
docker compose down -v      # partimos de cero
docker compose up --build -d
docker compose ps
curl http://localhost:8080/actuator/health
```

> **IMPORTANTE**
>
> PostgreSQL solo usa `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` **la primera vez** que inicializa el volumen. Si cambias la contraseña en `.env` con el volumen ya creado, la base de datos seguirá con la antigua y la API no podrá conectarse. En desarrollo, la solución es `docker compose down -v`.

### Parte F — Dev container

Un *dev container* define el entorno de desarrollo como código: quien clone el repositorio obtiene el mismo JDK, el mismo Maven y las mismas herramientas, sin instalar nada. Sigue la [Dev Containers spec](https://containers.dev/), un estándar abierto que soportan VS Code, GitHub Codespaces y la CLI `devcontainer`. Crea `.devcontainer/devcontainer.json`:

```json
{
  "name": "tareas-api",
  "image": "mcr.microsoft.com/devcontainers/java:21",
  "features": {
    "ghcr.io/devcontainers/features/java:1": { "installMaven": "true" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": { "moby": false }
  },
  "forwardPorts": [8080, 5432],
  "postCreateCommand": "test -f .env || cp .env.example .env; if [ -d .githooks ]; then git config core.hooksPath .githooks; fi; mvn -B dependency:go-offline",
  "customizations": {
    "vscode": { "extensions": ["vscjava.vscode-java-pack", "ms-azuretools.vscode-docker"] }
  }
}
```

- Investiga y explica qué indica cada campo. En particular:
  - ¿Para qué sirve la feature `docker-in-docker`?
  - ¿Qué hace cada una de las tres órdenes de `postCreateCommand`?
- En VS Code, instala la extensión **Dev Containers** y usa *Dev Containers: Reopen in Container*.
- Dentro del dev container, ejecuta `docker compose up --build` y comprueba que la API responde en `http://127.0.0.1:8080/actuator/health` desde el navegador de tu máquina.

Esto es útil para que todos los miembros del equipo tengan el mismo entorno de desarrollo. No obstante, si lo tenéis todo instalado en la máquina local, no es obligatorio usarlo.

### Parte G — Versionar los cambios

- Documenta en el README cómo levantar el proyecto con Docker.
- Documenta en el README cómo levantar el proyecto con Dev Container.
- Crea una rama y abre un Pull Request como en el [Boletín 2](boletin2-github.html) con todos los cambios del boletín:
  - `Dockerfile` y `.dockerignore`
  - `docker-compose.yml` y `.env.example`
  - `.gitignore` (con `.env`)
  - `pom.xml`, `application.properties`, etc.
  - `.devcontainer/devcontainer.json`
  - `README.md` actualizado


### Parte H — Registry de Docker (no modifica el repositorio)

Esta parte no debe modificar el repositorio del proyecto. Investiga cómo subir la imagen a Docker Hub y muestra los pasos que has seguido en la memoria (`boletin3.md`).

### Parte I — Entorno de pruebas reproducible (no modifica el repositorio)

Esta parte no debe modificar el repositorio del proyecto. Escoge un repositorio open source de GitHub no trivial que tenga una batería de tests y genera un Dockerfile que levante un contenedor con todo lo necesario para ejecutar los tests de ese proyecto. Los pasos a seguir y documentar (en la memoria `boletin3.md`) son:

1. Elegir repositorio. Selecciona un repositorio open-source popular y público (con >1k de estrellas o uso real).
2. Analizar requisitos. Identifica lenguaje, versión/es, gestor de paquetes, herramientas de build y cualquier dependencia del sistema. Cita la fuente (README, docs oficiales, pyproject.toml, package.json, pom.xml, etc.).
3. Crear Dockerfile. Escribe un Dockerfile que instale todas las dependencias y herramientas necesarias para ejecutar los tests del proyecto.
4. Construir y ejecutar. Construye la imagen y ejecuta los tests dentro del contenedor, asegurándote de que todos pasan correctamente. Monta el código fuente del proyecto median

