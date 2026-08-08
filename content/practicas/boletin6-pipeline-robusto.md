---
title: "Boletín 6: Pipeline robusto: calidad, seguridad y cadena de suministro"
---

# Boletín 6: Pipeline robusto: calidad, seguridad y cadena de suministro

> **OBJETIVO**
>
> Endurecer el pipeline hasta un nivel profesional actual: control de cobertura, análisis estático del código, detección de secretos, aseguramiento de la cadena de suministro (pinning de actions, escaneo de imágenes, Dependabot) y reducción de la duplicación de YAML.

## 1. Objetivos de la sesión

- **Añadir quality gates**: cobertura de tests con umbral que bloquea.
- **Analizar el código en busca de vulnerabilidades** con CodeQL y detectar secretos filtrados.
- **Asegurar la cadena de suministro**: pinning de actions a SHA, escaneo de imágenes y Dependabot.
- **Reducir duplicación** con reusable workflows o composite actions.
- **Consolidar** el proyecto completo de punta a punta.

## 2. Conceptos clave

### 2.1 Por qué la seguridad del pipeline importa

Un workflow es código con permisos sobre tu repositorio y tus registros. Una action de terceros referenciada por una etiqueta móvil (como `@v4`) puede ser alterada por su autor o por un atacante que le robe la cuenta: la etiqueta apunta a otro commit y tu pipeline ejecuta código que nunca revisaste. **Anclar (pin) la action a un hash de commit (SHA)** garantiza que ejecutas exactamente el código que revisaste. Ha habido incidentes reales de este tipo con actions muy populares, y es hoy una de las prácticas más recomendadas en seguridad de CI/CD.

### 2.2 Cuatro cosas distintas que la gente llama "escanear"

| Técnica | Qué mira | Herramienta aquí |
|---|---|---|
| SAST | Tu propio código fuente, buscando patrones vulnerables. | CodeQL |
| SCA | Las dependencias que declaras y sus CVE conocidos. | Dependabot |
| Escaneo de imagen | Todo lo que hay dentro del contenedor, incluido el sistema base. | Trivy |
| Detección de secretos | Credenciales filtradas en el código o el historial. | gitleaks / push protection |

Son complementarias: una dependencia impecable puede correr sobre una imagen base con 40 CVE críticos, y un código perfecto no te salva si has subido una clave al historial.

### 2.3 La cobertura no es la calidad

Un umbral de cobertura es una red de seguridad, no un objetivo. Es trivial alcanzar un 90 % con tests que no comprueban nada (ejecutan el código sin aseverar). Sirve para detectar **código nuevo sin ningún test**, y para eso es excelente. Cuando en la Parte A elijas un umbral, justifícalo.

## 3. Trabajo práctico — Núcleo (obligatorio)

### Parte A — Quality gate de cobertura

- Añade el plugin **JaCoCo** al `pom.xml` y configúralo para fallar la build si la cobertura baja de un umbral (p. ej. 60 % de líneas).
- Verifica que `mvn verify` falla si la cobertura es insuficiente, y que el pipeline lo refleja.
- Publica el informe HTML de JaCoCo como artifact del job de tests.
- **Demuéstralo**: abre un PR que añada un método sin tests y comprueba que el gate lo bloquea.

> **CONSEJO**
>
> Opcionalmente integra **Codecov** o **SonarCloud** para visualizar la cobertura y la calidad en cada PR, con el comentario automático de cuánto sube o baja respecto a `main`.

### Parte B — Análisis estático con CodeQL

CodeQL es el motor de análisis de GitHub: entiende el flujo de datos de tu código y detecta inyecciones SQL, rutas no validadas o uso inseguro de criptografía. Actívalo en `Settings → Code security` o añade el workflow:

```yaml
name: CodeQL
on:
  push: { branches: [ main ] }
  pull_request:
  schedule: [ { cron: "0 3 * * 1" } ]   # también semanalmente: hay CVE nuevos

permissions:
  contents: read
  security-events: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: java }
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

- Introduce a propósito una vulnerabilidad evidente (por ejemplo, una consulta concatenando un parámetro de entrada) y comprueba que aparece en la pestaña **Security → Code scanning**.
- Arréglala y verifica que la alerta se cierra sola.

### Parte C — Detección de secretos

- Activa **Secret scanning** y **Push protection** en `Settings → Code security`.
- Compruébalo: intenta hacer push de un token con formato reconocible y observa cómo GitHub **rechaza el push** antes de que la credencial llegue al servidor.
- Añade además **gitleaks** al pipeline, para cubrir formatos que GitHub no reconoce:

```yaml
      - name: Buscar secretos en el historial
        uses: gitleaks/gitleaks-action@<SHA>   # anclar al SHA real
```

### Parte D — Pinning de actions a SHA

Sustituye las etiquetas móviles por hashes de commit concretos. Ejemplo (el hash es ilustrativo; usa el real de cada action):

```yaml
# Antes (móvil, atacable):
- uses: actions/checkout@v4

# Después (anclado a un commit concreto):
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

- Ancla **todas** las actions de terceros de tus workflows a su SHA, dejando el número de versión como comentario.
- Explica en el `AI_LOG.md` el inconveniente evidente de esta práctica (nadie actualiza a mano 15 hashes) y cómo lo resuelve la Parte F.

### Parte E — Escaneo de vulnerabilidades de la imagen

Añade un escaneo con **Trivy** al pipeline para detectar vulnerabilidades conocidas en la imagen **antes** de publicarla. Fíjate en que primero hay que construir la imagen localmente en el runner, sin subirla:

```yaml
      - name: Construir la imagen SIN publicarla
        uses: docker/build-push-action@<SHA>   # v6
        with:
          context: .
          push: false
          load: true                # la deja disponible para docker/Trivy
          tags: tareas-api:test

      - name: Escanear imagen con Trivy
        uses: aquasecurity/trivy-action@<SHA>   # anclar al SHA real
        with:
          image-ref: tareas-api:test
          severity: CRITICAL,HIGH
          ignore-unfixed: true      # no bloquees por CVE que aún no tienen parche
          exit-code: "1"            # falla el build si hay vulnerabilidades graves
```

- Ejecuta el escaneo. Si aparecen vulnerabilidades, prueba a **actualizar la imagen base** (una versión de JRE más reciente, o una variante `alpine`/*distroless*) y mide cuántas desaparecen.
- Encadena este job **antes** del de publicación del [Boletín 5](boletin5-cd-github-actions.html) con `needs`, de modo que una imagen con CVE críticos nunca llegue a `ghcr`.
- Anota la cifra de vulnerabilidades antes y después del cambio de base. Es el dato más contundente de toda la sesión.

### Parte F — Dependabot

Crea `.github/dependabot.yml` para que GitHub abra PRs automáticos cuando haya actualizaciones de dependencias Maven, de Docker y de las propias actions (incluidas las ancladas a SHA, que actualizará por ti):

```yaml
version: 2
updates:
  - package-ecosystem: maven
    directory: "/"
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
    groups:
      spring:
        patterns: [ "org.springframework*" ]

  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }

  - package-ecosystem: docker
    directory: "/"
    schedule: { interval: weekly }
```

- Confirma en la pestaña correspondiente que Dependabot está activo.
- **Fusiona al menos un PR de Dependabot** tras comprobar que el CI queda en verde, y coméntalo en la entrega. Este es el círculo virtuoso: tienes tests, así que puedes actualizar sin miedo.

### Parte G — Reducir duplicación de YAML

Tus workflows de CI y Release repiten pasos (checkout, setup-java, caché…). Extrae la lógica común a un **reusable workflow** invocable con `workflow_call`:

```yaml
# .github/workflows/build-and-test.yml
on:
  workflow_call:
    inputs:
      java-version: { type: string, default: "21" }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA>
      - uses: actions/setup-java@<SHA>
        with:
          distribution: temurin
          java-version: ${{ inputs.java-version }}
          cache: maven
      - run: mvn -B verify
# .github/workflows/ci.yml
jobs:
  build:
    uses: ./.github/workflows/build-and-test.yml
    with: { java-version: "21" }
```

- Haz que tanto `ci.yml` como `release.yml` lo reutilicen y cuenta cuántas líneas de YAML has eliminado.

### Parte H — Recorrido completo (cierre)

Realiza un último cambio end-to-end y documenta cada etapa con una captura:

- Abre un Issue y una rama de feature.
- Implementa el cambio con sus tests.
- Abre el PR: el CI valida (formato, build, tests, cobertura, CodeQL, escaneo).
- Tu pareja lo revisa y lo aprueba.
- Fusiona: el Release construye, escanea y publica la imagen versionada.
- Aprueba el entorno y descarga la imagen publicada para comprobarla.

## 4. Ampliación (para nota alta)

- **Firma de imágenes con cosign**: firma la imagen en el pipeline y verifica la firma antes de desplegarla en el [Boletín 7](boletin7-ansible.html). Explica qué ataque previene que no prevenga el escaneo.
- **OpenSSF Scorecard**: ejecútalo sobre tu propio repositorio, publica la nota como badge y arregla los dos puntos peor valorados.
- **Renovate** como alternativa a Dependabot: compara ambos en una tabla (agrupación de PRs, automerge, configurabilidad).
- **ADRs**: crea `docs/adr/` con al menos tres decisiones documentadas (por qué PostgreSQL, por qué multi-stage, por qué esa estrategia de merge), usando la plantilla clásica *Contexto / Decisión / Consecuencias*.
- **Badges** en el README: CI, cobertura, última versión publicada y Scorecard.
- **Métricas DORA**: estima para tu proyecto la frecuencia de despliegue y el *lead time* desde el commit hasta la imagen publicada, usando los tiempos reales de tus Actions.

## 5. Cierre de la sesión

### Reto de depuración

- **Trivy falla la build por un CVE sin parche disponible.** El equipo no puede parar la entrega. Explica tres respuestas posibles (`ignore-unfixed`, `.trivyignore` con fecha de caducidad, cambiar de imagen base) y argumenta cuál eliges y por qué. No hay respuesta única: se evalúa el razonamiento.
- **Dependabot abre un PR que rompe el CI.** ¿Cómo distingues "la librería ha cambiado de comportamiento" de "mi test dependía de un detalle interno"? ¿Fusionar, cerrar, o fijar la versión?
- **Tras anclar las actions a SHA, el pipeline falla con `Unable to resolve action`.** Diagnostica las dos causas típicas: el SHA es de otro repositorio, o es un SHA corto.

### Antes de terminar

- Actualiza `docs/AI_LOG.md`. Buena entrada para esta sesión: ¿la IA te propuso hashes de actions inventados? Comprueba siempre esos valores contra el repositorio real.
- Checkpoint: sabrás explicar la diferencia entre SAST, SCA y escaneo de imagen, y por qué un `@v4` es un riesgo.

## 6. Entrega del boletín

> **ENTREGA**
>
> El repositorio en GitHub, ya completo, con:

- Quality gate de cobertura (JaCoCo) integrado, con evidencia de un PR bloqueado por cobertura baja.
- CodeQL activo, con evidencia de una alerta detectada y cerrada.
- Secret scanning con push protection activado (con evidencia) y gitleaks en el pipeline.
- Actions **ancladas a SHA** en todos los workflows.
- Escaneo de la imagen con Trivy **antes** de publicarla, con el número de vulnerabilidades antes y después de cambiar la base.
- `dependabot.yml` activo y al menos un PR suyo fusionado.
- Reusable workflow o composite action eliminando duplicación.
- Evidencia del recorrido completo de punta a punta y `docs/AI_LOG.md` actualizado.

## 7. Criterios de evaluación

| Aspecto | Peso |
|---|---|
| Quality gate de cobertura funcionando y demostrado | 15% |
| Seguridad del código: CodeQL y detección de secretos | 20% |
| Cadena de suministro: pinning a SHA + Trivy bloqueante + Dependabot | 25% |
| Reutilización de workflows / composite action | 15% |
| Recorrido end-to-end documentado y proyecto coherente | 15% |
| Diario de IA (docs/AI_LOG.md) con reflexión real | 10% |
| Bonus — Ampliación: cosign, Scorecard, Renovate, ADRs, badges, métricas DORA | hasta +1,5 |

## 8. Dónde estás ahora

> **OBJETIVO**
>
> Al terminar este boletín dispones de un repositorio que demuestra un ciclo de prácticas continuas casi completo: una API REST en Maven, contenerizada con Docker (multi-stage) y persistida en PostgreSQL con migraciones versionadas, con un pipeline de CI/CD en GitHub Actions que valida cada cambio, controla la calidad, asegura la cadena de suministro y publica automáticamente una imagen versionada y lista para desplegar. Falta un último paso: que alguien la ponga a correr. Eso es el [Boletín 7](boletin7-ansible.html).
