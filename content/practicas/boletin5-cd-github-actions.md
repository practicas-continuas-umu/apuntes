---
title: "Práctica 5: Entrega continua con GitHub Actions"
---

# Práctica 5: Entrega continua con GitHub Actions

## Objetivos

El objetivo principal de esta tarea es que aprendáis a construir *pipelines* utilizando **GitHub Actions** para automatizar la **entrega continua** de proyectos software.

Al terminar la práctica sabréis:

- Encadenar *jobs* con `needs` para construir un *pipeline* completo (build → package → deploy).
- Construir y publicar una imagen Docker desde un workflow.
- Gestionar credenciales de forma segura con *secrets*.
- Configurar *environments* de GitHub con aprobación manual, y pasar de entrega continua a despliegue continuo.

## Relación con el temario

Esta práctica se apoya directamente en el **[Tema 5: Integración y Entrega Continuas](../slides/tema5-integracion-entrega-continua.html)**.

## Contexto

Partiréis del repositorio dockerizado de la Práctica 3, con el workflow de CI de la Práctica 4 ya funcionando. Ahora vais a extender ese *pipeline* para que, tras pasar la CI, la aplicación se empaquete como imagen Docker, se publique en un registro y se despliegue automáticamente en un entorno de *staging* (y, con aprobación, en producción).

## Tareas

1. **Añadir el job de empaquetado Docker**
   - Crear un job `docker` que dependa del job de CI (`needs: build`).
   - Usar `docker/login-action` con credenciales guardadas como *secrets* del repositorio (`Settings → Secrets and variables → Actions`).
   - Usar `docker/build-push-action` para construir y publicar la imagen, etiquetada con el SHA del commit (`${{ github.sha }}`).

2. **Configurar entornos (*environments*)**
   - Crear dos *environments* en GitHub: `staging` y `production`.
   - Configurar `production` para que **requiera aprobación manual** de al menos una persona del equipo.
   - Asociar a cada *environment* las variables/*secrets* que necesite (por ejemplo, la URL del servidor correspondiente).

3. **Desplegar a staging automáticamente**
   - Añadir un job `deploy-staging` (`needs: docker`, `environment: staging`) que despliegue la imagen recién construida (mediante un script, `ssh`, o la herramienta de despliegue que se indique).
   - Comprobar que cada `push` a `main` despliega automáticamente a *staging* sin intervención manual.

4. **Desplegar a producción con aprobación manual**
   - Añadir un job `deploy-production` (`needs: deploy-staging`, `environment: production`).
   - Comprobar que el workflow se **detiene** en ese job hasta que una persona autorizada lo aprueba desde la pestaña *Actions*.
   - Aprobar el despliegue y verificar que se ejecuta correctamente.

5. **(Opcional) Pasar a despliegue continuo**
   - Eliminar el requisito de aprobación manual en `production` (o sustituirlo por una condición automática, como que todos los tests de aceptación pasen).
   - Añadir una condición `if: github.ref == 'refs/heads/main'` para que el despliegue a producción solo ocurra desde `main`.
   - Documentar en el README qué estrategia de despliegue se ha adoptado (básico, rolling, blue-green...) y por qué.

6. **Verificación post-despliegue**
   - Añadir un último *step* que compruebe que el servicio desplegado responde correctamente (por ejemplo, una petición HTTP a un *endpoint* de salud `/health`).

## Entregables

- Workflow completo (`.github/workflows/cd.yml` o extensión del de CI) con los jobs `docker`, `deploy-staging` y `deploy-production` encadenados con `needs`.
- Los dos *environments* configurados en GitHub, con `production` protegido por aprobación manual (salvo que se haya optado por despliegue continuo).
- Evidencia de al menos una ejecución completa del *pipeline*, incluyendo la aprobación manual del despliegue a producción.

## Criterios de evaluación orientativos

| Criterio | Peso orientativo |
|---|---|
| Pipeline completo y encadenado correctamente con `needs` | 30% |
| Construcción y publicación correcta de la imagen Docker | 20% |
| Uso correcto de *secrets* (ninguna credencial en texto plano en el repositorio) | 20% |
| *Environments* configurados con aprobación manual en producción | 20% |
| Verificación post-despliegue y documentación de la estrategia elegida | 10% |

> Estos pesos son orientativos; el profesorado puede ajustarlos y añadir criterios específicos del enunciado concreto de cada curso.
