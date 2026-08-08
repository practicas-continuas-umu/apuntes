---
title: "Boletín 2: GitHub y colaboración con Pull Requests"
---

# Boletín 2: GitHub y colaboración con Pull Requests

> **OBJETIVO**
>
> Llevar tu proyecto a GitHub y trabajar con el flujo profesional de colaboración: ramas de feature, Pull Requests, revisión de código real entre compañeros, plantillas, propietarios de código y protección de la rama principal.

## 1. Objetivos de la sesión

- **Publicar el repositorio** en GitHub y entender la relación local ↔ remoto.
- **Dominar el flujo de Pull Requests** (GitHub Flow): rama → PR → revisión → merge.
- **Revisar el código de otra persona** con criterio, no solo aprobar.
- **Usar Issues, plantillas y CODEOWNERS** para organizar el trabajo.
- **Configurar branch protection** en `main` y elegir una política de merge justificada.

## 2. Conceptos clave

### 2.1 Local frente a remoto

Tu repositorio local y el remoto (GitHub) son copias independientes que sincronizas explícitamente. Los verbos esenciales:

| Comando | Qué hace |
|---|---|
| git clone | Copia un repositorio remoto a tu máquina. |
| git push | Envía tus commits locales al remoto. |
| git fetch | Trae cambios del remoto SIN fusionarlos. |
| git pull | fetch + merge: trae y fusiona en un paso. |
| git pull --ff-only | Trae y solo avanza el puntero; si no puede, para y te avisa. |

> **CONSEJO**
>
> Configura `git config --global pull.ff only`. El `git pull` por defecto crea merge commits automáticos que ensucian el historial sin que te enteres; con `--ff-only` Git te obliga a decidir conscientemente entre `merge` o `rebase`.

### 2.2 GitHub Flow

Es el flujo de colaboración más simple y el estándar de facto para equipos pequeños y proyectos modernos:

- `main` siempre debe estar desplegable (verde).
- Cada cambio se hace en una rama de feature corta.
- Al terminar, se abre un **Pull Request** para revisar el código antes de fusionar.
- Tras la aprobación (y los checks en verde), se fusiona a `main` y se borra la rama.


### 2.3 Cómo fusionar: merge, squash o rebase

GitHub ofrece tres botones y ninguno es "el correcto": cada uno produce un historial distinto. Debes elegir uno **y justificarlo**.

| Estrategia | Historial resultante | Cuándo tiene sentido |
|---|---|---|
| Merge commit | Conserva todos los commits de la rama y añade un commit de fusión. | Ramas largas donde el detalle intermedio aporta. |
| Squash and merge | Un único commit por PR en main. | Lo más habitual hoy: 1 PR = 1 cambio con significado. |
| Rebase and merge | Reaplica los commits en main, sin commit de fusión. | Historial lineal estricto, con commits ya bien redactados. |

### 2.4 Qué es una buena revisión de código

Aprobar sin leer es peor que no revisar, porque da una falsa sensación de control. Una revisión útil mira, en este orden:

- **¿Resuelve el problema del Issue?** Antes que el estilo, la intención.
- **¿Hay tests que fallarían si el cambio estuviera mal?**
- **Casos límite**: nulos, listas vacías, fechas pasadas, concurrencia.
- **Seguridad y datos**: ¿se registra en el log algo sensible? ¿se validan las entradas?
- **Legibilidad**: ¿lo entenderá alguien dentro de seis meses? El formato ya lo resuelve Spotless, no lo comentes.


## 3. Trabajo práctico — Núcleo (obligatorio)

### Parte A — Publicar el repositorio

- Crea un repositorio NUEVO y vacío en GitHub (sin README, para no generar conflictos).
- Conecta tu repo local con el remoto y haz el primer push:

```bash
git remote add origin https://github.com/TU_USUARIO/tareas-api.git
git branch -M main
git push -u origin main
```

- Completa el `README.md`: descripción, requisitos, cómo construir, cómo arrancar y cómo activar los hooks del [Boletín 1](boletin1-git-maven.html).

### Parte B — Gobernanza del repositorio

Antes de abrir el primer PR, deja el repositorio preparado para que colaborar sea fácil:

- `.github/PULL_REQUEST_TEMPLATE.md`, que se cargará solo al abrir cada PR:

```
## Qué hace este PR

Closes #

## Cómo lo he probado

- [ ] Tests unitarios nuevos o actualizados
- [ ] Probado manualmente con curl / navegador

## Notas para quien revise

<!-- decisiones discutibles, alternativas descartadas, dudas -->
```

- Una plantilla de Issue en `.github/ISSUE_TEMPLATE/feature.md` (y otra para `bug.md`).
- Un archivo `.github/CODEOWNERS` que asigne revisor automáticamente:

```bash
# Toda la aplicación la revisa el equipo
*               @tu_usuario @usuario_companero
# Los workflows los revisa quien los mantiene
/.github/       @tu_usuario
```

- Crea etiquetas (`feature`, `bug`, `infra`, `docs`) y úsalas en tus Issues.

### Parte C — Trabajo por Pull Requests (núcleo de la sesión)

Realiza al menos **TRES** ciclos completos de PR, cada uno aportando una mejora real a la API (un endpoint nuevo, una validación, un filtro de búsqueda, paginación…).

**Ciclo de cada Pull Request:**

- Crea un Issue describiendo la mejora, con su etiqueta.
- Crea una rama de feature: `git switch -c feat/busqueda-por-estado`.
- Implementa el cambio (puedes usar la IA) y añade o ajusta los tests correspondientes.
- Sube la rama: `git push -u origin feat/busqueda-por-estado`.
- Abre el PR usando la plantilla. Enlaza el Issue con `Closes #N`.
- Recibe la revisión, **responde a los comentarios** y sube commits de corrección a la misma rama.
- Fusiona el PR con la estrategia que hayas elegido y borra la rama.

> **OJO**
>
> Un PR que se fusiona sin ningún comentario de revisión no cuenta como ciclo completo. Se evalúa la conversación: al menos uno de tus tres PRs debe contener un comentario que provoque un **cambio real** en el código antes del merge.

### Parte D — Revisión cruzada (obligatoria)

Ponte en pareja con un compañero y añadíos mutuamente como **colaboradores** del repositorio. Cada uno abre sus PRs y **revisa y aprueba los del otro**, usando el checklist del apartado 2.4.

- Cada miembro debe dejar al menos **dos revisiones con comentarios en líneas concretas** en el repositorio del otro.
- Al menos una revisión debe usar **"Request changes"**, no solo "Approve".
- Rotad los roles: en un PR eres autor, en el siguiente revisor.

> **CONSEJO**
>
> Si trabajas sin pareja, la alternativa mínima es abrir los PRs desde una **cuenta secundaria** o pedir la revisión al profesor; la auto-revisión en solitario solo puntúa la mitad, porque no ejercita lo importante: explicar tu código a alguien que no lo escribió.

### Parte E — Provocar un conflicto en un PR

- Crea dos ramas que modifiquen la misma zona de código.
- Fusiona la primera vía PR.
- Al intentar fusionar la segunda, GitHub avisará del conflicto. Resuélvelo (en la web, o trayendo `main` a tu rama con `git merge main` en local) y completa el PR.

### Parte F — Proteger la rama main

En **Settings → Branches** (o Rules → Rulesets), añade una regla de protección para `main`:

- Requiere Pull Request antes de fusionar, con **al menos 1 aprobación**.
- Prohíbe el push directo a `main`.
- **Require conversation resolution before merging**: no se fusiona con comentarios abiertos.
- **Dismiss stale approvals**: si el autor sube más commits, la aprobación caduca.
- Documenta en el README la política de merge elegida (squash, merge o rebase) y **por qué**.
- Comprueba que la protección funciona intentando saltártela:

```bash
git switch main
echo "prueba" >> README.md
git commit -am "chore: intento de push directo"
git push          # debe ser RECHAZADO por el servidor
```

> **CONSEJO**
>
> Deja activada esta protección: en el [Boletín 4](boletin4-ci-github-actions.html) le añadirás los **required status checks** para que un PR con tests rojos tampoco se pueda fusionar.

## 4. Otros

- **GitHub Projects**: crea un tablero (Todo / In progress / Done) y enlaza tus Issues; comprueba que las tarjetas se mueven solas al cerrar un PR.
- **Milestone** "Entrega del curso" agrupando los Issues de todos los boletines.
- **Commits verificados**: sube tu clave de firma a GitHub y consigue que tus commits aparezcan como *Verified*. Añade la exigencia de firma a la protección de rama.
- **Reglas de nombres de rama** (rulesets) que solo permitan `feat/*`, `fix/*`, `chore/*`.
- **Borrado automático de ramas** tras el merge (Settings → General) y `git fetch --prune` en local.
- Escribe un `CONTRIBUTING.md` explicando el flujo del proyecto a alguien que llega nuevo.

## 5. Cierre de la sesión

### Reto de depuración

- Tu compañero dice: *"he hecho push y mis cambios no aparecen en el PR"*. Su rama local se llama `feat/x` pero el PR apunta a `feature/x`. Explica qué ha pasado y cómo se arregla sin perder trabajo.
- Un PR muestra **380 archivos modificados** cuando solo tocaste uno. Diagnostica la causa (pista: finales de línea y el `.gitattributes` del [Boletín 1](boletin1-git-maven.html)) y propón la solución.
- Alguien ha fusionado a `main` un PR cuyo cambio hay que revertir, pero `main` está protegida. ¿Cómo lo deshaces correctamente? Compara `git revert` con `git reset --hard` y explica cuál es admisible en una rama compartida y por qué.

### Antes de terminar

- Actualiza `docs/AI_LOG.md` (mínimo dos entradas). Incluye una sobre el uso de IA **al revisar**: ¿te sugirió algún comentario de revisión? ¿era pertinente?
- Checkpoint: sabrás explicar la diferencia entre `fetch` y `pull`, qué estrategia de merge elegiste y por qué, y qué hace exactamente `Closes #N`.

## 6. Entrega del boletín

> **ENTREGA**
>
> El enlace a tu repositorio en GitHub, que debe mostrar:

- `README.md` completo, con la política de merge justificada.
- Plantillas de PR e Issue, `CODEOWNERS` y etiquetas en uso.
- **Al menos 3 Pull Requests** fusionados, cada uno con su Issue enlazado.
- Al menos **2 revisiones cruzadas** hechas por ti en el repositorio de tu pareja (enlaces), y al menos un PR tuyo donde un comentario haya provocado un cambio.
- Un PR con un **conflicto resuelto**.
- La rama `main` **protegida**, con evidencia de un push directo rechazado.
- Historial de ramas de feature creadas y borradas tras el merge.
- `docs/AI_LOG.md` actualizado.

## 7. Criterios de evaluación

| Aspecto | Peso |
|---|---|
| Flujo de PRs correcto (rama → PR → revisión → merge), 3 ciclos completos | 30% |
| Calidad de las revisiones cruzadas: comentarios concretos que mejoran el código | 25% |
| Conflicto resuelto dentro de un PR | 10% |
| Branch protection (incl. resolución de conversaciones) y política de merge justificada | 15% |
| Gobernanza: plantillas, CODEOWNERS, Issues enlazados y README | 10% |
| Diario de IA (docs/AI_LOG.md) con reflexión real | 10% |
| Bonus — Ampliación: Projects, commits verificados, rulesets, CONTRIBUTING.md | hasta +1,5 |
