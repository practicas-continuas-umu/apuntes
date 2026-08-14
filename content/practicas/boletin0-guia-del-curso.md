---
title: "Boletín 0: Guía de la primera parte de la asignatura"
---

# Boletín 0: Guía de la primera parte de la asignatura


> **OBJETIVO**
>
> Este documento explica cómo se va a evaluar la primera parte de la asignatura. En particular, se explican los sistemas de evaluación, los boletines en parejas, el proyecto global y el proyecto asociado al enunciado común.

## 1. El sistema de evaluación

En la asignatura hay tres ítems evaluables:

| ID | Denominación | Criterio | Peso |
|---|---|---|---|
| SE1 | Entrevistas virtuales de seguimiento de prácticas | Asistencia y participación | 10% |
|SE2 | Evaluación de informes escritos, trabajos y proyectos |  Boletines en parejas, proyecto global y proyecto asociado al enunciado común | 80% |
| SE3 | Evaluación de la presentación pública de trabajos | Entrevista/presentación final | 10% |



## 2. Boletines en parejas

A lo largo de siete sesiones se construirá, de forma incremental, una **API REST en Java (Spring Boot)** gestionada con Maven, contenerizada con Docker, validada por un pipeline de CI/CD en GitHub Actions y desplegada automáticamente con Ansible.

### Boletines

| Boletín | Tema |
|---|---|
| [1](boletin1-git-maven.html) | Git, el proyecto Maven base y la calidad desde el primer commit |
| [2](boletin2-github.html) | GitHub y colaboración con Pull Requests |
| [3](boletin3-docker.html) | Docker: contenerizar la aplicación |
| [4](boletin4-ci-github-actions.html) | Integración Continua con GitHub Actions |
| [5](boletin5-cd-github-actions.html) | Entrega Continua: construir, versionar y publicar la imagen |
| [6](boletin6-pipeline-robusto.html) | Pipeline robusto: calidad, seguridad y cadena de suministro |
| [7](boletin7-ansible.html) | Despliegue con Ansible |

### Entrega

La entrega de esta parte **UN único repositorio de GitHub** que crece sesión a sesión. Debe haber una carpeta llamada `docs` en el repositorio. Dentro de esa carpeta debe haber un archivo markdown por sesión (llamado `boletinX.md`, donde X es el número de la sesión) que contenga:

- Una tabla resumen con los commits realizados en esa sesión, el mensaje, una descripción simple de lo que se hizo y un enlace al commit en GitHub.
- Para cada commit, una explicación de lo que se hizo y su relación con el boletín. Si se ha usado IA, se debe indicar la herramienta y qué se le ha pedido.
- Si hay partes del boletín que no se reflejan en los commits, adjuntar capturas de pantalla.

### Uso de la IA

**No se evalúa que escribas Java a mano.** Se evalúa que domines las tecnologías que rodean a ese código: Git, GitHub, Docker, CI/CD, etc.

El uso de asistentes de IA (ChatGPT, Claude, Copilot, Gemini...) está **permitido y recomendado** para generar cualquier artefacto software. Se debe indicar en el boletín qué herramienta se ha usado y qué se le ha pedido.

Se recomienda usar Claude code, GitHub Copilot o Codex (con sus respectivas extensiones en VS Code).


## 3. Proyecto global

Todos los estudiantes vais a colaborar en un **proyecto global**. Dicho proyecto global va a ser una página web simple que dado un tamaño de entrada y un algoritmo famoso, muestre el tiempo de ejecución del algoritmo en todos los lenguajes de programación soportados.

Os vais a dividir en grupos sigueindo la distribución de grupos del enunciado común. Cada grupo va a ser el responsable de un repositorio de GitHub que contenga un microservicio. Los microservicios deben ser los siguientes:

* Frontend: página web que permita seleccionar el tamaño de entrada y el algoritmo a ejecutar y se comunique con todos los microservicios para mostrar el tiempo.

* Microservicio de Java: que ejecute el algoritmo en Java y devuelva el tiempo de ejecución. Debe contener un endpoint REST que reciba el tamaño de entrada y el algoritmo a ejecutar.

* Microservicio de Python: que ejecute el algoritmo en Python y devuelva el tiempo de ejecución. Debe contener un endpoint REST que reciba el tamaño de entrada y el algoritmo a ejecutar.

* Microservicio de Go...

* Microservicio de X lenguaje...

En general si hay 5 grupos, habrá 4 microservicios (con diferentes lenguajes) y un frontend. Si hay 6 grupos, habrá 5 microservicios (con diferentes lenguajes) y un frontend. Y así sucesivamente. Cada grupo es el encargado de un microservicio. Esto es, debe de preparar toda la infraestructura:

1. Debe preparar la REST API en el lenguaje que le toque con un único algoritmo implementado.
2. Debe preparar el pipeline de CI/CD para que se construya, versiona y publique la imagen del microservicio.
3. Debe preparar un conjunto de issues a resolver dentro del repositorio por miembros de otros equipos (por ejemplo y sin ánimo de ser exhaustivo, lo más sencillo es que cada equipo prepare un issue por algoritmo a implementar; si se trata del frontend, mejoras estilísticas).
4. Preparar un README.md con instrucciones de uso y de despliegue del microservicio.
5. Preparar un CONTRIBUTING.md con instrucciones de cómo contribuir al microservicio.

Requisitos de los microservicios:
1. En los microservicios, deben haber tests unitarios. Por ejemplo, cada algoritmo debe tener una serie de tests unitarios que verifiquen que el algoritmo funciona correctamente. En el caso del frontend, debe haber tests unitarios que verifiquen que la página web funciona correctamente con mockups de los microservicios.
2. En los microservicios, deben haber tests de integración. Los de las APIs REST deben verificar que los endpoints funcionan correctamente. En el caso del frontend, debe haber tests de integración que verifiquen que la página web funciona correctamente con uno o varios microservicios reales.
3. Todas las REST APIs deben seguir el mismo contrato de entrada y salida para hacer la vida más fácil al frontend. Por ejemplo, el endpoint REST de cada microservicio debe recibir un JSON con el tamaño de entrada y el algoritmo a ejecutar y devolver un JSON con el tiempo de ejecución.
4. Los algoritmos a implementar deben ser (en todos los casos, se deben hacer 5 mediciones y tomar la mediana): 
   * MergeSort. Para medir el tiempo las entradas deben generarse aleatoriamente.
   * QuickSort. Para medir el tiempo las entradas deben generarse aleatoriamente.
   * Fibonacci con programación dinámica.
   * Multiplicación de matrices.

Requisitos mínimos de calidad en la colaboración:
* Push a main desactivado
* Cada PR debe tener al menos un revisor por parte de los owners
* Cada PR debe pasar la pipeline de CI, en caso contrario no debe ser mergeado

Cada estudiante debe:
* Hacer una contribución no trivial a cada microservicio.
* Hacer una revisión de código de al menos un pull request de otro microservicio.

## 4. Proyecto asociado al enunciado común



