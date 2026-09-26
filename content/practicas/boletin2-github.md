---
title: "Boletín 2: GitHub y colaboración con Pull Requests"
---

# Boletín 2: GitHub y colaboración con Pull Requests

> **OBJETIVO**
>
> Llevar tu proyecto a GitHub y trabajar con el flujo profesional de colaboración: ramas de feature, Pull Requests, revisión de código entre compañeros, plantillas, propietarios de código y protección de la rama principal.

## 1. Objetivos de la sesión

- **Publicar el repositorio** en GitHub (**repositorio público**) y entender la relación local ↔ remoto.
- **Dominar el flujo de Pull Requests** (GitHub Flow): rama → PR → revisión → merge.
- **Revisar el código** de otra persona.
- **Usar Issues, plantillas y CODEOWNERS** para organizar el trabajo.
- **Configurar branch protection** en `main` y elegir una política de merge.

## 2. Conceptos clave

### 2.1 Local frente a remoto

Tu repositorio local y el remoto (GitHub) son copias independientes que sincronizas explícitamente. Los comandos esenciales:

| Comando | Qué hace |
|---|---|
| git clone | Copia un repositorio remoto a tu máquina. |
| git push | Envía tus commits locales al remoto. |
| git fetch | Trae cambios del remoto SIN fusionarlos. |
| git pull | fetch + merge: trae y fusiona en un paso. |
| git pull --ff-only | Trae y solo avanza el puntero; si no puede, para y te avisa. |

> **CONSEJO**
>
> Configura `git config --global pull.ff only`. El `git pull` por defecto crea merge commits automáticos; con `--ff-only` Git te obliga a decidir conscientemente entre `merge` o `rebase`.

### 2.2 GitHub Flow

Es el flujo de colaboración más simple y el estándar de facto para equipos pequeños y proyectos modernos:

- `main` siempre debe estar desplegable (verde).
- Cada cambio se hace en una rama de feature corta.
- Al terminar, se abre un **Pull Request** para revisar el código antes de fusionar.
- Tras la aprobación (y los checks en verde), se fusiona a `main` y se borra la rama.


### 2.3 Cómo fusionar: merge, squash o rebase

GitHub ofrece tres botones y cada uno produce un historial distinto (ninguno es "el correcto"). Debes elegir uno y justificarlo.

| Estrategia | Historial resultante | Cuándo tiene sentido |
|---|---|---|
| Merge commit | Conserva todos los commits de la rama y añade un commit de fusión. | Ramas largas donde el detalle intermedio aporta. |
| Squash and merge | Un único commit por PR en main. | Lo más habitual hoy: 1 PR = 1 cambio con significado. |
| Rebase and merge | Reaplica los commits en main, sin commit de fusión. | Historial lineal estricto, con commits ya bien redactados. |



## 3. Trabajo práctico 

### Parte A — Publicar el repositorio

- Crea un repositorio **nuevo**, **público** y **vacío en GitHub** (sin README, para no generar conflictos).
- El creador del repositorio debe dar de alta como colaborador a su pareja para que pueda hacer push.
- Conecta tu repo local con el remoto y haz el primer push:

```bash
git remote add origin https://github.com/TU_USUARIO/repo.git
git branch -M main
git push -u origin main
```

- Completa el `README.md`: descripción, requisitos, cómo construir, cómo arrancar y cómo activar los hooks del [Boletín 1](boletin1-git-maven.html). En definitiva, como poner todo en marcha desde cero.

### Parte B — Gobernanza del repositorio

Antes de abrir el primer PR, deja el repositorio preparado para que colaborar sea fácil:

- `.github/PULL_REQUEST_TEMPLATE.md`, [plantilla](https://docs.github.com/es/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository) que se cargará solo al abrir cada PR:

```
## Qué hace este PR

Closes #

## Cómo lo he probado

- [ ] Tests unitarios nuevos o actualizados
- [ ] Probado manualmente con curl / navegador

## Notas para quien revise

<!-- decisiones discutibles, alternativas descartadas, dudas -->
```

- Investiga qué son las [**plantillas y etiquetas de Issue**](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates) en GitHub y cómo usarlas. Crea al menos dos plantillas una para *enhancement* y otra para *bug*:`.github/ISSUE_TEMPLATE/enhancement.md` y `.github/ISSUE_TEMPLATE/bug.md`.

- Crea un archivo `.github/CODEOWNERS` para definir los propietarios del código y hacer que GitHub solicite automáticamente su revisión en los PR que afecten a esos archivos.

```bash
# Toda la aplicación la revisa el equipo
*               @tu_usuario @usuario_companero
```
Aquí se podría afinar más. Por ejemplo, si el path `src/path1` es revisado por un propietario y el path `src/path2` por otro.

```bash
# src/path1 lo revisa @usuario1
src/path1/**     @usuario1
# src/path2 lo revisa @usuario2
src/path2/**     @usuario2
```

- Investiga cómo escoger la estrategia de fusión del PR por defecto y escoge la que consideres.

- Genera un `CONTRIBUTING.md` con instrucciones para contribuir al proyecto (todo lo que necesite saber alguien que quiera contribuir: cómo contribuir, política de fusión, como poner en marcha el entorno de desarrollo, los hooks, etc.).

- Haz push de todos estos cambios y comprueba que GitHub reconoce las plantillas y los propietarios de código.

### Parte C — Proteger la rama main

En **Settings → Branches** (o Rules → Rulesets), añade una regla de protección para `main`:

- Require a pull request before merging.
- Require at least 1 approval.
- Require review from Code Owners.
- Require conversation resolution before merging.
- Dismiss stale pull request approvals when new commits are pushed.
- Do not allow bypassing the above settings, para que la regla también se aplique a quienes administran el repositorio.
- No permitas force pushes ni eliminación de main.

Explica qué estamos consiguiendo con estas reglas y prueba que funcionan intentando hacer un push directo a `main`:

```bash
git switch main
echo "prueba" >> README.md
git commit -am "chore: intento de push directo"
git push          # debe ser RECHAZADO por el servidor
```

### Parte D — Trabajo por Pull Requests

Realiza al menos **DOS** ciclos completos de PR, cada uno aportando una mejora real a la API (un endpoint nuevo, una validación, un filtro de búsqueda, paginación...). Un integrante de la pareja abre el PR y el otro lo revisa. Luego cambian los roles.

**Ciclo de cada Pull Request:**

- Crea un Issue describiendo la mejora, con su etiqueta.
- Crea una rama de feature: `git switch -c feat/busqueda-por-estado`.
- Implementa el cambio (puedes usar la IA) y añade o ajusta los tests correspondientes.
- Sube la rama: `git push -u origin feat/busqueda-por-estado`.
- Abre el PR usando la plantilla. Enlaza el Issue con `Closes #N`.
- Recibe la revisión, responde a los comentarios (si los hay) y sube commits de corrección a la misma rama (si se considera necesario).
- Fusiona el PR con la estrategia que hayas elegido y borra la rama.


### Parte E — Provocar un conflicto en un PR

- Crea dos ramas que modifiquen la misma zona de código (la misma línea).
- Fusiona la primera vía PR.
- Abre un PR con la segunda rama y observa que hay conflicto.
- Haz en local un rebase de la segunda rama sobre `main` y resuelve el conflicto (puede requerir `git push --force-with-lease`). Haz push y observa como GitHub ha actualizado el PR automáticamente y ya no hay conflicto.

### Parte F — PR con fork

Ahora vas a colaborar en un repositorio sobre el que no tienes permisos de escritura. Abre un issue no trivial en tu proyecto y pide a otra pareja que haga un PR para resolverlo desde un fork. Haced lo mismo en el respotorio de la otra pareja.
