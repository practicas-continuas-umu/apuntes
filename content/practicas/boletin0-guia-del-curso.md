---
title: "Boletín 0: Guía del curso, uso de la IA y sistema de evaluación"
---

# Boletín 0: Guía del curso, uso de la IA y sistema de evaluación


> **OBJETIVO**
>
> Este documento explica cómo funciona la asignatura, qué se espera de ti en cada sesión y —muy importante— cómo se evalúa un trabajo en el que puedes (y debes) usar herramientas de IA. Léelo antes del [Boletín 1](boletin1-git-maven.html) y vuelve a él cada vez que dudes sobre qué se está puntuando.

## 1. La idea del curso

A lo largo de siete sesiones construirás, de forma incremental, una **API REST en Java (Spring Boot)** gestionada con Maven, contenerizada con Docker, validada por un pipeline de CI/CD en GitHub Actions y desplegada automáticamente con Ansible.

La entrega de TODO el curso es **UN único repositorio de GitHub** que crece sesión a sesión.

**No se evalúa que escribas Java a mano.** Se evalúa que domines las tecnologías que rodean a ese código: Git, GitHub, Maven, Docker, CI/CD, etc.

## 2. Los boletines del curso

| Boletín | Tema |
|---|---|
| 0 | Guía del curso, uso de la IA y sistema de evaluación *(este documento)* |
| [1](boletin1-git-maven.html) | Git, el proyecto Maven base y la calidad desde el primer commit |
| [2](boletin2-github.html) | GitHub y colaboración con Pull Requests |
| [3](boletin3-docker.html) | Docker: contenerizar la aplicación |
| [4](boletin4-ci-github-actions.html) | Integración Continua con GitHub Actions |
| [5](boletin5-cd-github-actions.html) | Entrega Continua: construir, versionar y publicar la imagen |
| [6](boletin6-pipeline-robusto.html) | Pipeline robusto: calidad, seguridad y cadena de suministro |
| [7](boletin7-ansible.html) | Despliegue con Ansible: cerrar el ciclo |

## 3. Política de uso de IA

El uso de asistentes de IA (ChatGPT, Claude, Copilot, Gemini…) está **permitido y recomendado** para generar el código de la aplicación, redactar tests, escribir YAML o depurar errores. Es exactamente lo que harás en la industria.

Ahora bien: si cualquiera puede pedirle a un modelo un `ci.yml` impecable, el archivo por sí solo ya no demuestra nada. Por eso el curso evalúa:

- **El proceso**: mediante el historial de commits, Pull Requests, ejecuciones de Actions, etc.
- **La explicación**: mediante una entrevista. Si no sabes defender una línea de tu repositorio (relacionada con las tecnologías utilizadas), esa línea no puntúa.

### 3.1 El diario de IA (obligatorio)

En cada sesión debes actualizar el archivo `docs/AI_LOG.md` del repositorio con al menos **dos entradas**.

```
## Sesión 3 — Docker

### Entrada 1
- **Qué necesitaba:** un Dockerfile multi-stage para un proyecto Maven + Spring Boot.
- **Qué le pedí:** "Dame un Dockerfile multi-stage para Spring Boot 3 con Java 21..."
- **Qué me devolvió:** dos etapas, build con maven:3.9 y runtime con eclipse-temurin:21-jre.
- **Qué estaba MAL o no aplicaba:** copiaba todo el proyecto antes de resolver
  dependencias, así que cualquier cambio en el código invalidaba la caché de capas
  y la build tardaba 4 min en vez de 20 s. Además ejecutaba como root.
- **Cómo lo corregí:** moví COPY pom.xml + mvn dependency:go-offline por delante de
  COPY src, y añadí un usuario 'app' sin privilegios con USER app.
- **Qué he aprendido:** el orden de las instrucciones de un Dockerfile es una
  decisión de rendimiento, no de estilo.
```

### 3.2 Entrevistas

Para verificar que realmente hay aprendizaje, al final de la asignatura habrá una **entrevista** de 15 minutos en la que se te pedirá que expliques tu repositorio y tu diario de IA.

## 4. Estructura de cada sesión (4 horas)

| Bloque | Duración | Qué es |
|---|---|---|
| Núcleo | ~2 h 30 | Obligatorio. Cubre los objetivos de la sesión y da hasta el 10 sobre 10. |
| Ampliación | ~1 h | Opcional. Suma hasta +1,5 puntos de bonus sobre la nota del boletín (máximo final: 10). |
| Cierre | ~30 min | Reto de depuración, AI_LOG.md, README y checkpoint. |

Cada boletín incluye además un **reto de depuración**: algo que está roto a propósito y que debes arreglar explicando la causa. Aquí la IA ayuda poco, porque la información está en *tus* logs y no en el prompt.

## 5. El repositorio al final del curso

```
tareas-api/
├── .devcontainer/devcontainer.json      # B3 (ampliación)
├── .github/
│   ├── ISSUE_TEMPLATE/                  # B2
│   ├── PULL_REQUEST_TEMPLATE.md         # B2
│   ├── CODEOWNERS                       # B2
│   ├── dependabot.yml                   # B6
│   └── workflows/
│       ├── ci.yml                       # B4
│       ├── release.yml                  # B5
│       ├── deploy.yml                   # B7
│       ├── ai-review.yml                # B4 (ampliación)
│       └── build-and-test.yml           # B6 (reusable workflow)
├── deploy/                              # B7
│   ├── inventory.ini
│   ├── deploy.yml
│   ├── roles/api/
│   └── group_vars/servidores/vault.yml
├── docs/
│   ├── AI_LOG.md                        # todas las sesiones
│   └── adr/                             # B6 (ampliación)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore  .gitignore  .gitattributes  .editorconfig
├── pom.xml
└── README.md
```

## 6. Criterios transversales

Además de la rúbrica específica de cada boletín, estos criterios se aplican siempre:

| Criterio transversal | Efecto |
|---|---|
| Diario de IA (docs/AI_LOG.md) completo y con reflexión real | Incluido como 10 % en cada boletín |
| Defensa del checkpoint | Veto: lo no explicado no puntúa |
| No regresión: lo entregado en boletines anteriores sigue funcionando | Hasta −1 punto si algo se ha roto |
| Higiene del repositorio (sin target/, sin secretos, README al día) | Hasta −1 punto |
| Ampliación completada | Hasta +1,5 puntos |

## 7. Herramientas necesarias

- Git 2.40+, JDK 21 (Temurin recomendado), Maven 3.9+.
- Docker Desktop o Docker Engine + Docker Compose v2.
- Cuenta de GitHub (con el Student Developer Pack activado si te corresponde).
- Un editor con soporte de contenedores (VS Code + extensión Dev Containers, o IntelliJ IDEA).
- Ansible (a partir del [Boletín 7](boletin7-ansible.html); se instala en la propia sesión).

> **CONSEJO**
>
> Si vas a trabajar desde Windows, activa **WSL2** y trabaja dentro de la distribución Linux. Te ahorrará la mitad de los problemas de finales de línea, permisos y rutas que aparecen al contenerizar.
