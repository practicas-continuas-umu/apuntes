---
title: "Práctica 3: Docker"
---

# Práctica 3: Docker

## Objetivos

El objetivo principal de esta tarea es que aprendáis a trabajar con **Docker** y **Docker Compose** para eliminar el clásico problema de "en mi máquina funcionaba".

Al terminar la práctica sabréis:

- Escribir un `Dockerfile` para empaquetar una aplicación propia.
- Construir, etiquetar y ejecutar imágenes Docker.
- Gestionar persistencia de datos con volúmenes.
- Orquestar una aplicación multicontenedor con Docker Compose.

## Relación con el temario

Esta práctica se apoya directamente en el **[Tema 4: Virtualización y contenedorización](../slides/tema4-virtualizacion-contenedores.html)**.

## Contexto

Partiréis de una aplicación web sencilla (por ejemplo, una API REST) que necesita conectarse a una base de datos. Actualmente, para ejecutarla, hay que instalar manualmente el lenguaje/*runtime*, las dependencias y la base de datos en cada máquina. El objetivo es dockerizar toda la aplicación para que se ejecute igual en cualquier equipo con un solo comando.

## Tareas

1. **Escribir el `Dockerfile` de la aplicación**
   - Elegir una imagen base adecuada (p. ej. `eclipse-temurin`, `python:3.12-slim`, `node:20-alpine`, según el lenguaje de la app).
   - Copiar el código, instalar dependencias y definir el `CMD`/`ENTRYPOINT` de arranque.
   - Minimizar el tamaño de la imagen (usar imágenes `slim`/`alpine`, evitar copiar ficheros innecesarios con un `.dockerignore`).

2. **Construir y probar la imagen**
   - Construir la imagen: `docker build -t <usuario>/miapp:1.0 .`
   - Ejecutarla y comprobar que responde: `docker run --rm -p 8080:8080 <usuario>/miapp:1.0`.

3. **Añadir persistencia**
   - Crear un volumen para los datos de la base de datos (o de la aplicación) y montarlo en el contenedor correspondiente.
   - Comprobar que los datos sobreviven a `docker stop` + `docker rm` + volver a arrancar el contenedor usando el mismo volumen.

4. **Definir una red propia**
   - Crear una red Docker personalizada y conectar a ella el contenedor de la aplicación y el de la base de datos.
   - Comprobar que la aplicación puede resolver el contenedor de la base de datos por nombre (no por IP).

5. **Escribir `docker-compose.yml`**
   - Definir en un único fichero los servicios de la aplicación y de la base de datos, sus variables de entorno, puertos, red y volumen.
   - Añadir `depends_on` para que la base de datos arranque antes que la aplicación.
   - Levantar todo con un único comando: `docker compose up`.

6. **Publicar la imagen (opcional pero recomendado)**
   - Crear una cuenta en Docker Hub (o usar el *registry* de GitHub) y publicar la imagen: `docker login`, `docker tag`, `docker push`.

## Entregables

- `Dockerfile` y `.dockerignore`.
- `docker-compose.yml` funcional (`docker compose up` levanta toda la aplicación sin pasos manuales adicionales).
- Breve documento (o sección del README) explicando cómo ejecutar el proyecto con Docker.

## Criterios de evaluación orientativos

| Criterio | Peso orientativo |
|---|---|
| `docker compose up` levanta la aplicación completa sin errores | 35% |
| `Dockerfile` bien construido (imagen base adecuada, tamaño razonable, capas ordenadas) | 25% |
| Persistencia de datos correctamente configurada con volúmenes | 20% |
| Red personalizada y comunicación entre contenedores por nombre | 10% |
| Documentación clara de cómo ejecutar el proyecto | 10% |

> Estos pesos son orientativos; el profesorado puede ajustarlos y añadir criterios específicos del enunciado concreto de cada curso.
