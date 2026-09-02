---
title: "Boletín 4: Integración Continua con GitHub Actions"
---

# Boletín 4: Integración Continua con GitHub Actions

> **OBJETIVO**
>
> Automatizar la construcción, el formato y los tests del proyecto: cada push y cada Pull Request dispararán un pipeline que compila, verifica el estilo, ejecuta tests unitarios y de integración contra una base de datos real, y publica los resultados.

## 1. Objetivos de la sesión

- **Entender qué es la Integración Continua** y por qué acorta el ciclo de feedback.
- **Escribir un workflow de GitHub Actions** estructurado en varios jobs con dependencias entre ellos.
- **Ejecutar tests de integración contra PostgreSQL real** con Testcontainers, igual en local que en el CI.
- **Optimizar y acotar el pipeline**: caché, matriz, concurrencia, tiempos máximos y permisos mínimos.
- **Convertir el CI en una barrera** mediante required status checks sobre `main`.

## 2. Conceptos clave

### 2.1 Qué es (y qué no es) la CI

La esencia de la Integración Continua es **integrar cambios pequeños y frecuentes a `main`, validándolos automáticamente**, de modo que los problemas se detecten en minutos y no en días. El objetivo último es que `main` esté siempre sana.

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

Grosso modo, hay dos formas de tener una base de datos real durante los tests:

- **Service containers**: los declara el propio workflow. Funcionan bien, pero solo existen en el CI: en tu portátil los tests siguen necesitando que tú levantes Postgres a mano.
- **Testcontainers**: una librería que arranca el contenedor **desde el propio test**. El mismo test funciona idéntico en tu máquina y en el runner, y cada ejecución parte de una base limpia.

## 3. Trabajo práctico

### Parte A — Primer pipeline de CI

Crea el archivo `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

# este workflow solo necesita leer el código
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

- Indica qué sentido el campo `concurrency` del `ci.yml`.

- Indica cuando se dispara el workflow y fuerza el que se dispare en todas las ocasiones.


### Parte B — Demostrar que el CI atrapa errores

- En una rama, rompe un test a propósito (por ejemplo, cambia una aserción para que falle).
- Abre un PR y comprueba que el pipeline se pone ROJO y el check falla.
- Arregla el test, haz push a la misma rama y comprueba que el check pasa a verde.


### Parte C — Separar responsabilidades en jobs

Un único job puede hacer que todo tarde más y da peor información. Si falla, no sabes de un vistazo si fue el formato o un test. Reestructura el workflow en tres jobs encadenados con `needs`:

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
        if: always()                    
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

- Provoca un fallo de formato (desordena una clase y salta el hook con `git commit --no-verify`) y comprueba que el job `lint` falla y los demás ni siquiera se ejecutan.
- Explica por qué es útil que `lint` vaya primero y por qué el paso del informe lleva `if: always()`.
- Muestra el informe de tests y el jar generado.


### Parte D — Convertir el CI en una barrera

- En **Settings → Branches**, edita la protección de `main` del [Boletín 2](boletin2-github.html) y activa **"Require status checks to pass before merging"**, seleccionando los checks `lint`, `test` y `package`.
- Marca también **"Require branches to be up to date before merging"**.
- Verifica el resultado: abre un PR con un test roto y comprueba que GitHub impide fusionarlo.


### Parte E — Ampliaciones interesantes (opcionales)

- Modifica el workflow para que se ignoren los cambios en el README.
- Genera un workflow tal que, cada vez que se haga un pull request, se ejecute una revisión de código por parte de una IA de manera que genere un resumen en lenguaje natural de qué se ha cambiado. Recomiendo algún modelo potente de Ollama Cloud. El API token se tiene que gestionar con secretos (no se puede hacer push de un secreto al repositorio). Si hay algún error, el comentario debe indicar: "La IA ha fallado".
- Añade un badge del estado del CI al README.