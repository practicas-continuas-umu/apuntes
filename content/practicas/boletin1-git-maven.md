---
title: "Boletín 1: Git, el proyecto Maven base y la calidad desde el primer commit"
---

# Boletín 1: Git, el proyecto Maven base y la calidad desde el primer commit

> **OBJETIVO**
>
> A lo largo del curso construirás, de forma incremental, una API REST en Java (Spring Boot) gestionada con Maven, contenerizada con Docker, automatizada con un pipeline de CI/CD y desplegada con Ansible.

## 1. Objetivos de la sesión

- **Entender el modelo de Git**: el grafo de commits, las ramas como punteros y las tres áreas de trabajo.
- **Manejar el flujo local**: add, commit, branch, merge y resolución de conflictos.
- **Comprender Maven**: qué problema resuelve, el `pom.xml` y el ciclo de vida de construcción.
- Tener una **aplicación Maven que compila, pasa tests y se empaqueta** en tu máquina.
- **Automatizar el formato del código** con Spotless y un hook de pre-commit, para que ningún commit entre sin formatear.

## 2. Conceptos clave

### 2.1 Git

Git no guarda diferencias, guarda **instantáneas (snapshots)** del proyecto en cada commit. El historial es un grafo dirigido de commits, y una **rama es simplemente un puntero** que se mueve a un commit.

**Las tres áreas** que debes distinguir siempre:

- **Working directory**: tus archivos tal cual los editas.
- **Staging area (índice)**: lo que has marcado con `git add` para el próximo commit.
- **Repositorio**: los commits ya confirmados (`git commit`).

### 2.2 Maven

Maven es a la vez un **gestor de dependencias** (descarga las librerías que tu proyecto necesita) y una **herramienta de construcción** (compila, testea y empaqueta siguiendo un ciclo de vida estándar). Todo se declara en el `pom.xml`.

| Comando | Qué hace |
|---|---|
| mvn compile | Compila el código fuente. |
| mvn test | Compila y ejecuta los tests unitarios. |
| mvn package | Empaqueta el resultado en un JAR (incluye compile + test). |
| mvn verify | Ejecuta también los tests de integración y las comprobaciones de calidad. |
| mvn clean | Borra lo construido previamente (carpeta target/). |

> **CONSEJO**
>
> Spring Boot produce un **"fat JAR"**: un único `.jar` que contiene tu código, todas las dependencias y un servidor web embebido. Por eso arranca con un simple `java -jar app.jar` sin instalar nada más.

### 2.3 Commits

Un commit es una **unidad de cambio con significado**. Los commits deben inducir un historial legible que permita revisar, revertir y encontrar el origen de un fallo. Por eso el curso adopta **Conventional Commits**, un convenio de una línea que además habilita changelogs automáticos más adelante:

```bash
feat(tasks): añade filtro de búsqueda por estado
fix(api): devuelve 404 cuando la tarea no existe
test(service): cubre la validación de fecha límite
chore(build): sube spring-boot a 3.3.2
docs(readme): documenta el arranque local
```

Formato: `tipo(ámbito): descripción en imperativo`. En el ámbito es opcional y suele haber libertad, los tipos son más cerrados. Tipos habituales:

| Tipo | Cuándo se usa |
|---|---|
| `feat` | Añade una funcionalidad nueva. |
| `fix` | Corrige un error. |
| `docs` | Cambios solo en documentación (README, comentarios, etc.). |
| `test` | Añade o corrige tests, sin tocar código de producción. |
| `refactor` | Reestructura código existente sin cambiar su comportamiento. |
| `chore` | Tareas de mantenimiento que no afectan al código fuente ni a los tests (dependencias, configuración, build). |
| `ci` | Cambios en la configuración de integración continua (workflows, pipelines). |

### 2.4 El formato del código

El código se debe formatear automáticamente para evitar diffs con reformateos. Cada lenguaje de programación tiene su estilo y herramienta de formateo. En Java usaremos **Spotless** con el estilo de Google.

## 3. Trabajo práctico

### Parte A — Instalación y verificación del entorno

- Comprueba que tienes Git, un JDK 21 y Maven instalados:

```bash
git --version
java -version
mvn -version
```

- Configura tu identidad en Git (aparecerá en tus commits) y una política de pull segura:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
git config --global pull.ff only      # evita merges automáticos sorpresa
git config --global init.defaultBranch main
```

### Parte B — Generar la aplicación con ayuda de IA

Pide a una IA que genere una **API REST con Spring Boot y Maven**, con persistencia (en memoria, nada de base de datos). El dominio sugerido es una **API de gestión de tareas (To-Do)**, pero puedes elegir otro (biblioteca, pedidos, etc.) siempre que sea no trivial.

**Requisitos mínimos** de la aplicación para considerarse "no trivial":

- Al menos una entidad de dominio con varios campos y validaciones.
- Operaciones CRUD completas (crear, leer, actualizar, borrar).
- Separación en capas (controlador / servicio / repositorio).
- Manejo de errores centralizado: un recurso inexistente devuelve **404**, no una traza de excepción.
- Al menos **5 tests que comprueben reglas de negocio reales** (p. ej. "no se puede crear una tarea con fecha límite pasada"), no simples `assertNotNull`.

> **CONSEJO**
>
> Prompt de ejemplo: Genera un proyecto Maven con Spring Boot 3 y Java 21: una API REST de gestión de tareas (entidad Task con id, título, descripción, estado, prioridad y fecha límite). Incluye endpoints CRUD, capa de servicio, validaciones con Bean Validation, manejo de errores con @RestControllerAdvice y tests unitarios con JUnit 5. Usa H2 en memoria por ahora.
> **Requisitos mínimos** de la aplicación para considerarse "no trivial":
>- Al menos una entidad de dominio con varios campos y validaciones.
>- Operaciones CRUD completas (crear, leer, actualizar, borrar).
>- Separación en capas (controlador / servicio / repositorio).
>- Manejo de errores centralizado: un recurso inexistente devuelve **404**, no una traza de excepción.
>- Al menos **5 tests que comprueben reglas de negocio reales** (p. ej. "no se puede crear una tarea con fecha límite pasada"), no simples `assertNotNull`


### Parte C — Construir y probar en local

- Coloca el código en una carpeta y empaquétalo:

```bash
mvn clean package
# El JAR queda en target/*.jar
```

- Arranca la aplicación y comprueba que escucha:

```bash
java -jar target/tareas-0.0.1-SNAPSHOT.jar

# En otra terminal:
curl http://localhost:8080/api/tasks
```

### Parte D — Control de versiones con Git

- Inicializa el repositorio y crea los archivos de configuración base:

```bash
git init
printf "target/\n*.class\n.idea/\n.env\n" > .gitignore

# .gitattributes: normaliza los finales de línea entre Windows, macOS y Linux
printf "* text=auto eol=lf\n*.jar binary\n" > .gitattributes

git add .
git commit -m "chore: proyecto Maven inicial de la API de tareas"
```

> **CONSEJO**
>
> Sin `.gitattributes` un `.sh` guardado en Windows con finales `CRLF` falla dentro del contenedor Linux del [Boletín 3](boletin3-docker.html) con un error raro.

- Añade también un `.editorconfig` para que todos los editores usen la misma indentación:

```bash
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 4

[*.{yml,yaml,json}]
indent_size = 2
```

- Haz commit del `.editorconfig` por separado, con su propio tipo (`chore`, porque es configuración de herramientas, no código de aplicación):

```bash
git add .editorconfig
git commit -m "chore(editor): añade .editorconfig"
```

- Crea una rama, haz un cambio pequeño y haz commit en ella:

```bash
git switch -c feat/campo-prioridad
# ... editar código con IA ...
git add . && git commit -m "feat(tasks): añade campo prioridad a Task"
```

- Fusiona la rama en main y observa el historial:

```bash
git switch main
git merge feat/campo-prioridad
git log --oneline --graph --all
```

### Parte E — Formateo automático en cada commit

Añade **Spotless** al `pom.xml` para que el proyecto tenga un único estilo y se pueda comprobar automáticamente (en el [Boletín 4](boletin4-ci-github-actions.html) este mismo comando pasará a ser una barrera del pipeline):

```xml
<plugin>
  <groupId>com.diffplug.spotless</groupId>
  <artifactId>spotless-maven-plugin</artifactId>
  <version>2.43.0</version>
  <configuration>
    <java>
      <googleJavaFormat/>
      <removeUnusedImports/>
      <trimTrailingWhitespace/>
      <endWithNewline/>
    </java>
  </configuration>
</plugin>
```

- Prueba los dos modos: `mvn spotless:check` (falla si algo no está formateado) y `mvn spotless:apply` (lo arregla).
- Ahora automatízalo con un **hook de pre-commit**, para que sea imposible commitear código sin formatear:

```bash
# Crea el hook (versionado, para que tus compañeros lo tengan igual)
mkdir -p .githooks
cat > .githooks/pre-commit <<'EOF'
#!/bin/sh
echo "Formatting with Spotless..."
mvn -q spotless:apply || exit 1
git add -u          # re-añade los archivos que Spotless haya reformateado
EOF
chmod +x .githooks/pre-commit

# Indica a Git que use esa carpeta de hooks
git config core.hooksPath .githooks
```

- Haz commit del plugin y del hook, también como `chore` (son herramientas de build/repositorio, no funcionalidad ni tests):

```bash
git add pom.xml .githooks/pre-commit
git commit -m "chore(build): añade Spotless para formateo automático"
git add .
git commit -m "chore(hooks): añade hook de pre-commit con Spotless"
```

- Comprueba que funciona: desordena a propósito la indentación de una clase, haz `git commit` y verifica que el commit resultante contiene el código **ya formateado**.

> **OJO**
>
> Los hooks viven en `.git/hooks/`, que **no se versiona**. Por eso los guardamos en `.githooks/` y apuntamos `core.hooksPath` ahí: así el hook viaja con el repositorio. Aun así, cada persona que clone debe ejecutar ese `git config` una vez; documéntalo en el README. Un hook local nunca sustituye a la comprobación en CI, porque siempre se puede saltar con `--no-verify`.

### Parte F — Provocar y resolver un conflicto

- Crea dos ramas a partir de `main` que modifiquen LA MISMA línea de un archivo de forma distinta.
- Fusiona la primera en `main` (irá bien).
- Fusiona la segunda: Git marcará el conflicto. Edítalo a mano eliminando los marcadores `<<<<<<<`, `=======`, `>>>>>>>` y deja la versión final correcta.
- Cierra con `git add` y `git commit`.
- Explica **por qué** Git no pudo resolverlo solo.