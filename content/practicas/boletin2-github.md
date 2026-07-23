---
title: "Práctica 2: GitHub"
---

# Práctica 2: GitHub

## Objetivos

El objetivo principal de esta tarea es que aprendáis a trabajar con el flujo profesional de colaboración en GitHub: **ramas *feature*, *pull requests*, revisión de código**, entre otras prácticas habituales en equipos de desarrollo real.

Al terminar la práctica sabréis:

- Publicar un repositorio local en GitHub y gestionar un remoto.
- Trabajar con ramas *feature* siguiendo el flujo de *GitHub Flow*.
- Abrir, describir y revisar *Pull Requests*.
- Resolver conflictos de *merge* y usar *issues* para organizar el trabajo.

## Relación con el temario

Esta práctica se apoya directamente en el **[Tema 3: Colaboración y flujos de trabajo sobre repositorios](../slides/tema3-colaboracion-github.html)**.

## Contexto

Trabajaréis en equipos (2-3 personas) sobre el proyecto de la Práctica 1 (o uno equivalente proporcionado por el profesorado), esta vez alojado en GitHub, aplicando un flujo de colaboración con ramas y *Pull Requests* en lugar de trabajar todos directamente sobre `main`.

## Tareas

1. **Publicar el repositorio**
   - Crear un repositorio en GitHub (uno de los miembros del equipo como propietario) y añadir al resto como colaboradores.
   - Configurar el remoto (`git remote add origin <url>`) y subir el historial existente (`git push -u origin main`).
   - Activar una **regla de protección** sobre `main`: exigir *Pull Request* antes de fusionar y prohibir el `push` directo.

2. **Crear issues**
   - Abrir al menos 3 *issues* describiendo tareas o mejoras pendientes (por ejemplo: "Añadir operación de potencia", "Validar división por cero", "Documentar el README").
   - Etiquetarlos (`enhancement`, `bug`...) y asignarlos a miembros del equipo.

3. **Trabajar con ramas *feature***
   - Cada persona crea una rama por cada *issue* que resuelva, con un nombre descriptivo (`feature/potencia`, `fix/division-cero`...).
   - Confirmar los cambios en commits pequeños y con mensajes claros.
   - Subir la rama (`git push -u origin <rama>`).

4. **Abrir y revisar Pull Requests**
   - Abrir un PR por cada rama, con una descripción que incluya qué hace, cómo probarlo y `Closes #<issue>`.
   - Cada PR debe ser **revisado por al menos otro miembro del equipo** antes de fusionarse: comentarios, `Request changes` o `Approve`.
   - Resolver los comentarios de revisión (aplicando cambios o respondiendo) antes de fusionar.

5. **Provocar y resolver un conflicto de *merge***
   - Intencionadamente, dos ramas distintas deben modificar la misma parte de un archivo.
   - Al intentar fusionar la segunda, resolver el conflicto manualmente (editar el archivo, `git add`, continuar el *merge*) y documentar en el PR cómo se resolvió.

6. **Fusionar y limpiar**
   - Fusionar los PRs aprobados (usando la estrategia que indique el profesorado: *merge commit* o *squash*).
   - Borrar las ramas ya fusionadas.
   - Comprobar que los *issues* correspondientes se han cerrado automáticamente.

## Entregables

- Enlace al repositorio en GitHub (con el equipo añadido como colaboradores del profesorado).
- Al menos 3 *Pull Requests* fusionados, cada uno con su revisión documentada.
- Un PR debe incluir explícitamente la resolución de un conflicto de *merge*.

## Criterios de evaluación orientativos

| Criterio | Peso orientativo |
|---|---|
| Uso correcto de ramas *feature* + PRs (no hay *pushes* directos a `main`) | 30% |
| Calidad de la revisión de código (comentarios sustanciales, no solo "LGTM") | 25% |
| Resolución correcta y documentada de un conflicto de *merge* | 20% |
| Uso de *issues* para organizar el trabajo, con cierre automático vía PR | 15% |
| Mensajes de commit y descripciones de PR claros | 10% |

> Estos pesos son orientativos; el profesorado puede ajustarlos y añadir criterios específicos del enunciado concreto de cada curso.
