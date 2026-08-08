---
title: "Boletín 4: Integración Continua con GitHub Actions"
---

# Boletín 4: Integración Continua con GitHub Actions

> **OBJETIVO**
>
> Automatizar la construcción, el formato y los tests del proyecto: cada push y cada Pull Request dispararán un pipeline que compila, verifica el estilo, ejecuta tests unitarios y de integración contra una base de datos real, y publica los resultados. Conectarás ese pipeline a la protección de main para que NO se pueda fusionar código roto.

## 1. Objetivos de la sesión

- **Entender qué es la Integración Continua** y por qué acorta el ciclo de feedback.
- **Escribir un workflow de GitHub Actions** estructurado en varios jobs con dependencias entre ellos.
- **Ejecutar tests de integración contra PostgreSQL real** con Testcontainers, igual en local que en el CI.
- **Optimizar y acotar el pipeline**: caché, matriz, concurrencia, tiempos máximos y permisos mínimos.
- **Convertir el CI en una barrera** mediante required status checks sobre `main`.

## 2. Conceptos clave

### 2.1 Qué es (y qué no es) la CI

La Integración Continua no consiste solo en "ejecutar tests". Su esencia es: **integrar cambios pequeños y frecuentes a `main`, validándolos automáticamente**, de modo que los problemas se detecten en minutos y no en días. El objetivo último es que `main` esté siempre sana.

Un corolario incómodo: **un pipeline lento no se usa**. Si validar un PR tarda 25 minutos, la gente deja de esperar y empieza a fusionar a ciegas. Optimizar tiempos no es coquetería, es lo que mantiene vivo el control de calidad.

### 2.2 Anatomía de un workflow

Un workflow es un archivo YAML en `.github/workflows/`. Sus piezas:

| Elemento | Qué es |
|---|---|
| on | Los eventos que disparan el workflow (push, pull_request…). |
| jobs | Conjuntos de pasos que se ejecutan en una máquina (runner). Corren en paralelo salvo que uses needs. |
| steps | Acciones individuales: ejecutar un comando o usar una "action". |
| runs-on | El tipo de runner (p. ej. ubuntu-latest). |
| permissions | Qué puede hacer el token del workflow. Por defecto, más de lo necesario: acótalo. |
| concurrency | Agrupa ejecuciones para poder cancelar las obsoletas de la misma rama. |

### 2.3 Testcontainers frente a service containers

Hay dos formas de tener una base de datos real durante los tests:

- **Service containers**: los declara el propio workflow. Funcionan bien, pero solo existen en el CI: en tu portátil los tests siguen necesitando que tú levantes Postgres a mano.
- **Testcontainers**: una librería que arranca el contenedor **desde el propio test**. El mismo test funciona idéntico en tu máquina y en el runner, y cada ejecución parte de una base limpia.

Usaremos Testcontainers como opción principal, porque elimina la clase de fallo más frustrante del curso: *"en el CI pasa y en local no"*.

## 3. Trabajo práctico — Núcleo (obligatorio)

### Parte A — Primer pipeline de CI

Crea el archivo `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

# Cancela ejecuciones antiguas de la misma rama: no valides código ya obsoleto
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

# Mínimo privilegio: este workflow solo necesita leer el código
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - name: Configurar JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Construir y testear
        run: mvn --batch-mode verify
```

- Sube el workflow **en una rama, vía PR** y observa cómo se ejecuta en la pestaña Actions.
- Comprueba que el PR muestra el check del pipeline ejecutándose y terminando en verde.

> **CONSEJO**
>
> Tres líneas que casi nadie pone y que deberías poner siempre: `concurrency` (ahorra minutos y dinero), `timeout-minutes` (evita que un test colgado consuma 6 horas de runner) y `permissions` (mínimo privilegio desde el primer día).

### Parte B — Demostrar que el CI atrapa errores (obligatorio)

- En una rama, rompe un test a propósito (cambia una aserción para que falle).
- Abre un PR y comprueba que el pipeline se pone ROJO y el check falla.
- Arregla el test, haz push a la misma rama y comprueba que el check pasa a verde.

> **CONSEJO**
>
> Haz capturas de ambos estados (rojo y verde): son una buena evidencia para la entrega.

### Parte C — Separar responsabilidades en jobs

Un único job que lo hace todo tarda más y da peor información: si falla, no sabes de un vistazo si fue el formato o un test. Reestructura el workflow en tres jobs encadenados con `needs`:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "21", cache: maven }
      - name: Comprobar formato
        run: mvn -B spotless:check      # el Spotless del Boletín 1

  test:
    needs: lint
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "21", cache: maven }
      - name: Tests
        run: mvn -B verify
      - name: Publicar informe de tests
        if: always()                    # también cuando fallan: es cuando más falta hace
        uses: dorny/test-reporter@v1
        with:
          name: Resultados JUnit
          path: target/surefire-reports/*.xml
          reporter: java-junit

  package:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "21", cache: maven }
      - run: mvn -B package -DskipTests
      - name: Subir JAR
        uses: actions/upload-artifact@v4
        with:
          name: app-jar
          path: target/*.jar
          retention-days: 7
```

- Provoca un fallo de formato (desordena una clase y salta el hook con `git commit --no-verify`) y comprueba que el job `lint` falla y los demás **ni siquiera se ejecutan**.
- Explica en el `AI_LOG.md` por qué es útil que `lint` vaya primero y por qué el paso del informe lleva `if: always()`.

### Parte D — Caché y matriz de versiones

- El `cache: maven` de `setup-java` ya está puesto. **Mide la diferencia**: compara la duración de la primera ejecución (caché fría) con la siguiente. Anota ambos tiempos.
- Comprueba que la app construye en varias versiones de Java a la vez:

```yaml
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false        # que un fallo en Java 21 no oculte el de Java 23
      matrix:
        java: [ "21", "23" ]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}
          cache: maven
      - run: mvn --batch-mode verify
```

### Parte E — Tests de integración contra PostgreSQL con Testcontainers

Añade las dependencias de test y escribe al menos **dos tests de integración** que ataquen la API completa contra una base de datos real (uno de escritura + lectura y otro que compruebe una validación devolviendo 400 o 404):

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class TaskApiIT {

  @Container
  @ServiceConnection                       // Spring inyecta solo la URL, usuario y clave
  static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16");

  @Autowired TestRestTemplate rest;

  @Test
  void crea_y_recupera_una_tarea() { /* ... */ }

  @Test
  void devuelve_404_si_la_tarea_no_existe() { /* ... */ }
}
```

- Ejecuta `mvn verify` **en tu portátil** y comprueba que Testcontainers levanta y destruye el Postgres solo.
- Comprueba que en el runner funciona igual, sin declarar ningún servicio en el YAML.
- Verifica que Hibernate crea el esquema en esa base efímera igual que en el [Boletín 3](boletin3-docker.html).

> **CONSEJO**
>
> Alternativa válida si Testcontainers te da problemas: **service containers** declarados en el job. Es lo que se usaba tradicionalmente y conviene que sepas leerlo:

```yaml
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: tareas
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
        ports: [ "5432:5432" ]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```

### Parte F — Convertir el CI en una barrera

- En **Settings → Branches**, edita la protección de `main` del [Boletín 2](boletin2-github.html) y activa **"Require status checks to pass before merging"**, seleccionando los checks `lint`, `test` y `package`.
- Marca también **"Require branches to be up to date before merging"**.
- Verifica el resultado: abre un PR con un test roto y comprueba que GitHub **IMPIDE** fusionarlo (el botón de merge queda deshabilitado, no solo en rojo).

> **OJO**
>
> Si usas matriz, los checks se llaman `test (21)` y `test (23)`: son checks distintos y debes seleccionarlos todos, o quedará un hueco por el que colar código roto.

## 4. Ampliación (para nota alta)

### Parte G — Revisión automática del PR con IA

Vas a añadir un revisor automático que comente tus Pull Requests. Es un ejercicio muy completo: toca eventos, permisos, secretos y llamadas a una API externa; y sobre todo te obliga a pensar **qué** le pides al modelo.

```yaml
name: Revisión con IA
on:
  pull_request:
    types: [ opened, synchronize ]

permissions:
  contents: read
  pull-requests: write        # necesario para poder comentar

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Obtener el diff
        run: |
          git diff origin/${{ github.base_ref }}...HEAD > diff.txt
          head -c 60000 diff.txt > diff_recortado.txt

      - name: Pedir la revisión
        env:
          API_KEY: ${{ secrets.LLM_API_KEY }}
        run: |
          # Construye la petición con jq y guarda la respuesta en review.md
          # Prompt sugerido: "Eres revisor de código Java. Señala SOLO problemas
          # reales de corrección, seguridad, casos límite y tests que falten.
          # Ignora el formato. Máximo 5 puntos, cada uno con archivo y línea."
          ...

      - name: Publicar como comentario
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: fs.readFileSync('review.md', 'utf8')
            });
```

- Guarda tu clave como **secret** del repositorio (`Settings → Secrets and variables → Actions`). Nunca en el YAML.
- Prueba dos prompts distintos (uno genérico, otro con el checklist de revisión del [Boletín 2](boletin2-github.html)) y compara la calidad de los comentarios.
- Responde en el `AI_LOG.md`: de los comentarios que generó, **¿cuántos eran realmente útiles y cuántos ruido?** ¿Sustituye a tu pareja revisora o la complementa?

> **OJO**
>
> El evento `pull_request` en PRs que vienen de un *fork* no tiene acceso a los secrets, por seguridad: si no fuera así, cualquiera podría abrir un PR que imprimiera tus claves. Menciona esta limitación en tu documentación; es la razón de existir de `pull_request_target` y de por qué ese evento hay que usarlo con muchísimo cuidado.

### Parte H — Afinar el pipeline

- **Path filters**: que el CI no se dispare por cambios que solo tocan `**.md` (con `paths-ignore`). Piensa en la trampa: si el check no se ejecuta, ¿puede fusionarse un PR que lo requiere?
- Añade un **badge** del estado del CI al README.
- Usa `actions/upload-artifact` para subir también los informes de Surefire cuando fallan, y descárgalos para diagnosticar.
- Explora `workflow_dispatch` para poder lanzar el pipeline a mano con parámetros.

## 5. Cierre de la sesión

### Reto de depuración

- **Un test pasa en local y falla en el CI.** Escribe (o provoca) un test que dependa de la zona horaria o del *locale* de la máquina. Explica por qué el runner se comporta distinto y cómo se arregla de forma robusta.
- **El pipeline no se dispara.** Alguien ha puesto el workflow en `.github/workflow/ci.yml`. Explica por qué GitHub lo ignora en silencio y qué otros errores producen el mismo síntoma (YAML mal indentado, rama equivocada en `on:`).
- **El check requerido nunca aparece.** Se ha renombrado el job de `build` a `test` pero la protección de rama sigue exigiendo `build`. ¿Qué le ocurre al PR y por qué es un fallo peligroso?

### Antes de terminar

- Actualiza `docs/AI_LOG.md` con al menos dos entradas. Si has hecho la Parte G, una de ellas debe ser la valoración del revisor automático.
- Checkpoint: sabrás explicar qué hace `needs`, por qué `concurrency` ahorra tiempo, y la diferencia entre Testcontainers y un service container.

## 6. Entrega del boletín

> **ENTREGA**
>
> El repositorio en GitHub, con:

- `.github/workflows/ci.yml` con jobs `lint`, `test` y `package` encadenados con `needs`.
- `permissions`, `concurrency` y `timeout-minutes` configurados.
- Caché de Maven (con los dos tiempos medidos), matriz de versiones y **tests de integración con Testcontainers** (o service container documentado como alternativa).
- Informe de tests visible en el PR y JAR publicado como artifact.
- Evidencia de un PR **bloqueado** por tests en rojo y luego desbloqueado al arreglarlos.
- Required status checks **activos** sobre `main`, incluyendo el de formato.
- `docs/AI_LOG.md` actualizado.

## 7. Criterios de evaluación

| Aspecto | Peso |
|---|---|
| Pipeline funcional y bien estructurado en jobs con dependencias | 25% |
| Tests de integración contra Postgres real (Testcontainers) ejecutándose en el CI | 20% |
| Required status checks bloqueando PRs rotos (demostrado con capturas) | 20% |
| Higiene del workflow: permisos mínimos, concurrencia, timeout, caché medida y matriz | 15% |
| Artifacts, informe de tests y limpieza general del YAML | 10% |
| Diario de IA (docs/AI_LOG.md) con reflexión real | 10% |
| Bonus — Ampliación: revisión automática con IA, path filters, badge, workflow_dispatch | hasta +1,5 |
