---
title: "Proyecto"
---

# Proyecto de la asignatura

## Objetivos

El proyecto integra, en un único trabajo, todas las competencias trabajadas a lo largo de las prácticas: control de versiones, herramientas de construcción, colaboración en GitHub, contenedorización, integración/entrega continuas e infraestructura como código.

Al terminar el proyecto habréis puesto en práctica, sobre una aplicación propia y de principio a fin:

- Un flujo de trabajo profesional con Git y GitHub (ramas, *Pull Requests*, revisión de código).
- Una build reproducible con Maven (o la herramienta de construcción equivalente al lenguaje elegido).
- Una aplicación dockerizada y orquestada con Docker Compose.
- Un *pipeline* de integración y entrega continuas con GitHub Actions.
- El aprovisionamiento del entorno de despliegue automatizado con Ansible.

## Relación con el temario

El proyecto es transversal a **todos los temas** de la asignatura (Temas 1-6) y consolida lo trabajado en las Prácticas 1-6.

## Enunciado

En equipos (el tamaño lo indicará el profesorado), diseñaréis e implementaréis una **aplicación web sencilla** (a elegir por el equipo, sujeta a aprobación del profesorado: por ejemplo, una API REST con persistencia en base de datos) aplicando de principio a fin las prácticas continuas trabajadas en la asignatura.

No se evalúa la complejidad funcional de la aplicación en sí, sino la **calidad del proceso de desarrollo y despliegue** que la rodea.

## Tareas

1. **Arranque del proyecto**
   - Crear el repositorio en GitHub con la estructura Maven (u otra build tool equivalente) del proyecto elegido.
   - Definir desde el principio una regla de protección sobre `main` (PRs obligatorios, CI en verde antes de fusionar).

2. **Desarrollo colaborativo**
   - Repartir el trabajo en *issues*, y desarrollar cada uno en su propia rama *feature*.
   - Todo cambio en `main` debe llegar mediante un *Pull Request* revisado por, al menos, otro miembro del equipo.
   - Mantener una cobertura de tests razonable sobre la lógica de negocio.

3. **Contenedorización**
   - Escribir un `Dockerfile` para la aplicación y un `docker-compose.yml` que incluya también sus dependencias (base de datos, caché, etc.).
   - La aplicación completa debe poder levantarse en cualquier máquina con `docker compose up`.

4. **Integración continua**
   - Configurar un *workflow* de GitHub Actions que compile, testee y (opcionalmente) analice estáticamente el código en cada `push`/`pull_request`.

5. **Entrega/despliegue continuo**
   - Extender el *pipeline* para construir y publicar la imagen Docker de la aplicación.
   - Desplegar automáticamente a un entorno de *staging*, y a producción con aprobación manual (o despliegue continuo, si el equipo lo justifica).

6. **Infraestructura como código**
   - Automatizar con Ansible el aprovisionamiento del entorno donde se despliega la aplicación (instalación de dependencias del sistema, configuración del servidor, etc.), de forma que un entorno nuevo pueda prepararse ejecutando un único *playbook*.

7. **Documentación**
   - Un `README.md` que explique: qué hace la aplicación, cómo ejecutarla en local (Docker Compose), cómo funciona el *pipeline* de CI/CD, y cómo se aprovisiona el entorno con Ansible.

## Entregables

- Enlace al repositorio en GitHub, con el historial completo de *issues*, ramas y *Pull Requests* usados durante el desarrollo.
- `docker-compose.yml` funcional.
- Workflows de GitHub Actions (CI y CD) funcionando sobre el repositorio.
- Playbooks y roles de Ansible para el aprovisionamiento del entorno.
- `README.md` con la documentación indicada arriba.
- Una breve memoria (o presentación) donde el equipo explique las decisiones técnicas tomadas en cada fase.

## Criterios de evaluación orientativos

| Bloque | Peso orientativo |
|---|---|
| Flujo de colaboración en GitHub (ramas, PRs, revisiones, issues) | 20% |
| Build reproducible y tests (Maven/equivalente) | 15% |
| Contenedorización con Docker/Docker Compose | 15% |
| Pipeline de integración y entrega continuas (GitHub Actions) | 25% |
| Infraestructura como código con Ansible | 15% |
| Documentación y memoria técnica | 10% |

> Estos pesos son orientativos; el profesorado publicará la rúbrica definitiva y las fechas de entrega junto con el enunciado detallado de cada curso.
