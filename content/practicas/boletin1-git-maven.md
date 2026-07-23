---
title: "Práctica 1: Git y Maven"
---

# Práctica 1: Git y Maven

## Objetivos

El objetivo principal de esta tarea es que aprendáis a usar **Git** como sistema de control de versiones y **Maven** como herramienta de construcción (*build tool*), trabajando sobre un proyecto Java sencillo.

Al terminar la práctica sabréis:

- Crear e inicializar un repositorio Git, y confirmar cambios de forma ordenada.
- Entender y usar las tres zonas de Git (*working directory*, *staging area*, repositorio local).
- Estructurar un proyecto Java siguiendo las convenciones de Maven.
- Declarar dependencias y ejecutar las fases del ciclo de vida de Maven (`compile`, `test`, `package`).

## Relación con el temario

Esta práctica se apoya directamente en el **[Tema 2: Control de versiones y herramientas de construcción](../slides/tema2-control-versiones-build.html)**.

## Contexto

Se os proporciona (o crearéis desde cero) un proyecto Java mínimo con Maven que implementa una pequeña calculadora con un par de operaciones. El proyecto todavía no tiene tests, y su historial de cambios no está versionado.

## Tareas

1. **Inicializar el repositorio**
   - Ejecutar `git init` en la raíz del proyecto.
   - Crear un fichero `.gitignore` que excluya `target/` y los ficheros propios del IDE.
   - Hacer un primer commit con el estado inicial del proyecto (`git add`, `git commit -m "Commit inicial"`).

2. **Completar el `pom.xml`**
   - Añadir las coordenadas del proyecto (`groupId`, `artifactId`, `version`).
   - Añadir la dependencia de **JUnit 5** con `scope=test`.
   - Configurar el `maven-compiler-plugin` para compilar con la versión de Java indicada por el profesorado.

3. **Implementar y compilar**
   - Completar las operaciones de la calculadora que falten (indicadas con `TODO` en el código).
   - Compilar el proyecto con `mvn compile` y corregir los errores de compilación, si los hay.
   - Hacer commit de los cambios con un mensaje descriptivo.

4. **Escribir tests unitarios**
   - Añadir al menos un test por cada operación de la calculadora en `src/test/java`.
   - Incluir un caso de error esperado (por ejemplo, división por cero) usando `assertThrows`.
   - Ejecutar `mvn test` y comprobar que todos los tests pasan.

5. **Empaquetar la aplicación**
   - Ejecutar `mvn clean package` y comprobar que se genera el `.jar` en `target/`.
   - Ejecutar el `.jar` generado (`java -jar target/....jar`) y comprobar que funciona.

6. **Historial de commits**
   - Revisar con `git log --oneline` que el historial refleja los pasos anteriores en commits pequeños y bien diferenciados (no un único commit gigante al final).

## Entregables

- Repositorio Git (se indicará si se entrega como `.zip` con la carpeta `.git` incluida, o mediante un enlace a un repositorio remoto — ver Práctica 2).
- El `pom.xml` completo y funcional.
- Los tests unitarios implementados.

## Criterios de evaluación orientativos

| Criterio | Peso orientativo |
|---|---|
| El proyecto compila y `mvn test` pasa sin errores | 40% |
| Cobertura razonable de tests (casos normales + casos límite/error) | 25% |
| Historial de commits ordenado, con mensajes descriptivos | 20% |
| `pom.xml` correctamente configurado (dependencias, plugin de compilación) | 15% |

> Estos pesos son orientativos; el profesorado puede ajustarlos y añadir criterios específicos del enunciado concreto de cada curso.
