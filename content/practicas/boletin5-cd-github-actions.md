---
title: "Boletín 5: Entrega Continua: construir, versionar y publicar la imagen"
---

# Boletín 5: Entrega Continua: construir, versionar y publicar la imagen

> **OBJETIVO**
>
> Extender el pipeline para que, además de testear, construya la imagen Docker, la etiquete de forma trazable y la publique automáticamente en un registro (GitHub Container Registry). 

## 1. Objetivos de la sesión


- **Construir y publicar la imagen Docker** desde el pipeline hacia `ghcr.io`.
- **Versionar con SemVer**: etiquetas Git, releases y tags de imagen trazables.

## 2. Conceptos clave

### 2.1 CI vs CD

| Término | Significado |
|---|---|
| Continuous Integration | Integrar y validar cada cambio automáticamente (lo del [Boletín 4](boletin4-ci-github-actions.html)). |
| Continuous Delivery | Dejar SIEMPRE un artefacto listo para desplegar, con un paso manual final de aprobación. |
| Continuous Deployment | Desplegar automáticamente a producción sin intervención humana. |

En este boletín llegamos hasta **Continuous Delivery**: publicamos automáticamente una imagen lista para desplegar.

### 2.2 Versionado semántico y trazabilidad

Cada imagen debe llevar al menos:

| Tag | Para qué sirve |
|---|---|
| sha-<commit> | Trazabilidad absoluta: de la imagen al commit exacto que la produjo. Inmutable. |
| 1.4.2 / 1.4 / 1 | Versión legible para las personas, según SemVer. |
| latest | Comodidad para probar en local. Nunca para desplegar. |

**SemVer** (`MAYOR.MENOR.PARCHE`): sube el parche al corregir un fallo, la menor al añadir funcionalidad compatible, y la mayor cuando rompes la compatibilidad de la API. Que los commits sigan Conventional Commits ([Boletín 1](boletin1-git-maven.html)) hace que esta decisión sea casi automática.

### 2.3 El modelo de permisos del pipeline

GitHub Actions inyecta un token temporal, `GITHUB_TOKEN`, en cada ejecución. Por seguridad se debe conceder el **mínimo privilegio necesario** mediante el bloque `permissions`. Para publicar imágenes en `ghcr` necesitas permiso de escritura de `packages`.

## 3. Trabajo práctico 

### Parte A — Pipeline de publicación

Crea un nuevo workflow `.github/workflows/release.yml` que se ejecute al fusionar a `main` y también al publicar una etiqueta de versión:

```yaml
name: Release

on:
  push:
    branches: [ main ]
    tags: [ "v*.*.*" ]

permissions:
  contents: read
  packages: write

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - name: Login en GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Metadatos (tags)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Construir y publicar
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

- Explica qué ocurre en estas dos ocasiones: 1) al fusionar un PR a `main` y 2) al publicar una etiqueta `vX.Y.Z`. ¿Qué tags de imagen se generan en cada caso y por qué?
- Comprueba que la imagen aparece en la pestaña **Packages** del repositorio, etiquetada con el SHA del commit y con `latest`.

### Parte B — Publicar una versión de verdad

- Crea una etiqueta anotada y súbela:

```bash
git tag -a v1.0.0 -m "Primera versión publicable de la API de tareas"
git push origin v1.0.0
```

- Comprueba que el workflow se dispara de nuevo y que la imagen aparece ahora también como `1.0.0`, `1.0` y `1`.
- Crea la **Release** en GitHub a partir de esa etiqueta, con notas describiendo los cambios (puedes usar "Generate release notes").


### Parte C — Verificar la imagen publicada

- Descarga y ejecuta tu imagen recién publicada desde el registro, **por su tag inmutable**. Desde el [Boletín 3](boletin3-docker.html) la app necesita una PostgreSQL real (ya no hay datasource embebida), así que levanta también la base de datos y conecta ambos contenedores por red, igual que hace tu `docker-compose.yml`:

```bash
docker network create tareas-net

docker run -d --name db --network tareas-net \
  -e POSTGRES_DB=tareas -e POSTGRES_USER=app -e POSTGRES_PASSWORD=secret_local_dev \
  postgres:16

docker pull ghcr.io/TU_USUARIO/TU_REPO:1.0.0
docker run -d --name api --network tareas-net -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/tareas \
  -e SPRING_DATASOURCE_USERNAME=app \
  -e SPRING_DATASOURCE_PASSWORD=secret_local_dev \
  ghcr.io/TU_USUARIO/TU_REPO:1.0.0

curl http://localhost:8080/actuator/health   # debe responder UP
```

- Al terminar, limpia lo creado: `docker rm -f db api && docker network rm tareas-net`.

> **CONSEJO**
>
> Si el package se crea como privado, puedes hacerlo público desde su configuración para probar el pull sin autenticarte. También puedes logearte en el registro con `docker login ghcr.io` y luego hacer el pull. El usuario es tu nombre de GitHub y la contraseña es un **Personal Access Token**.


### Parte D — GitHub Pages de la documentación

Como dice el [Boletín 0](boletin0-guia-del-curso.html), has ido guardando la memoria de cada sesión (`boletinX.md`) en un repositorio/carpeta aparte. Toca traerla al repositorio de la API y publicarla como una web navegable.

- Copia (o mueve) tus `boletinX.md` desde el repositorio donde los tenías a una carpeta `docs/` en la raíz del repositorio de la API, uno por sesión entregada hasta ahora (`docs/boletin1.md` … `docs/boletin5.md`).
- Dentro de `docs/`, escribe un script (node o python) que lea todos los `.md` de `docs/` y genere, para cada uno, un `.html` equivalente más un `index.html` que enlace a todos.  Deben guardarse en `docs/site/`. Recomiendo usar la IA para esto.
- Prueba el script en local y revisa el resultado abriendo el HTML en el navegador.
- Automatízalo con un workflow `.github/workflows/pages.yml` que, en cada push a `main`, ejecute el script y publique `site/` en GitHub Pages con las acciones oficiales.
- Para tener GitHub Pages funcionando, el repositorio debe ser público.
- En **Settings → Pages**, cambia **Source** a **GitHub Actions**.
- Añade `docs/site/` en el `.gitignore` para que no se suba al repositorio.
- Comprueba que la web se publica correctamete (es la documentación que vas a entregar).

