---
title: "Práctica 4: Integración continua con GitHub Actions"
---

# Práctica 4: Integración continua con GitHub Actions

## Objetivos

El objetivo principal de esta tarea es que aprendáis a construir *pipelines* utilizando **GitHub Actions** para automatizar la construcción y los tests de proyectos software.

Al terminar la práctica sabréis:

- Escribir un *workflow* de GitHub Actions en YAML.
- Configurar disparadores (`push`, `pull_request`) y *runners*.
- Cachear dependencias para acelerar la CI.
- Interpretar los resultados de la CI directamente en un *Pull Request*.

## Relación con el temario

Esta práctica se apoya directamente en el **[Tema 5: Integración y Entrega Continuas](../slides/tema5-integracion-entrega-continua.html)**.

## Contexto

Partiréis del repositorio de las prácticas anteriores (con Maven y, opcionalmente, Docker). Hasta ahora, cada persona ejecuta los tests manualmente antes de abrir un *Pull Request*, lo cual es propenso a olvidos: alguien puede fusionar código que rompe los tests de otro compañero. El objetivo es automatizar esta comprobación con GitHub Actions.

## Tareas

1. **Crear el workflow básico de CI**
   - Crear `.github/workflows/ci.yml`.
   - Configurar los disparadores: `push` a `main` y `pull_request` contra `main`.
   - Añadir un job `build` que use `actions/checkout` y `actions/setup-java`, y ejecute `mvn -B clean verify`.

2. **Comprobar el efecto en un Pull Request**
   - Abrir un PR con un cambio cualquiera y comprobar que el workflow se ejecuta automáticamente y aparece su resultado (✅/❌) en el propio PR.
   - Configurar la protección de rama de `main` para **exigir que el check de CI pase** antes de poder fusionar.

3. **Provocar un fallo intencionado**
   - En una rama de prueba, romper un test a propósito y abrir un PR.
   - Comprobar que GitHub Actions marca el PR en rojo y que (si la regla de protección está activa) no se puede fusionar.
   - Corregir el fallo y comprobar que el check pasa a verde.

4. **Optimizar el workflow**
   - Activar el *caching* de dependencias de Maven (`cache: maven` en `actions/setup-java`) y comparar el tiempo de ejecución antes/después.
   - Añadir un segundo job (o una matriz) que ejecute los tests en dos versiones distintas de Java, en paralelo.

5. **Añadir un paso de análisis estático (opcional)**
   - Incorporar un *linter* o analizador estático adecuado al lenguaje del proyecto como *step* adicional del job de CI.

6. **Publicar artefactos**
   - Añadir un *step* con `actions/upload-artifact` que suba el `.jar` generado por `mvn package` como artefacto del workflow.
   - Descargar el artefacto desde la pestaña *Actions* de GitHub y comprobar que es el esperado.

## Entregables

- `.github/workflows/ci.yml` funcional en el repositorio del equipo.
- Al menos un PR que muestre un check de CI en rojo y su posterior corrección a verde (capturas de pantalla o enlace al historial de *checks*).
- Regla de protección de rama activa sobre `main` que exija el check de CI.

## Criterios de evaluación orientativos

| Criterio | Peso orientativo |
|---|---|
| El workflow se ejecuta correctamente en `push` y `pull_request` | 30% |
| Uso correcto de *caching* y/o matrices para optimizar la CI | 20% |
| Protección de rama configurada exigiendo el paso de la CI | 20% |
| Evidencia de un fallo detectado y corregido gracias a la CI | 20% |
| Publicación de artefactos (`upload-artifact`) | 10% |

> Estos pesos son orientativos; el profesorado puede ajustarlos y añadir criterios específicos del enunciado concreto de cada curso.
