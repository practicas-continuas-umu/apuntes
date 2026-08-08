---
title: "Boletín 7: Despliegue con Ansible: cerrar el ciclo"
---

# Boletín 7: Despliegue con Ansible: cerrar el ciclo

> **OBJETIVO**
>
> Hasta ahora el pipeline construye, valida y publica una imagen Docker en ghcr, pero nadie la ejecuta en un servidor. En esta sesión usarás Ansible para desplegar automáticamente esa imagen en una máquina y dejar la aplicación corriendo, verificada y con posibilidad de vuelta atrás. Cerrarás el ciclo completo: código → imagen publicada → aplicación desplegada y comprobada.

## 1. Objetivos de la sesión

- **Entender qué es Ansible** y el concepto de configuración e infraestructura como código.
- **Escribir un playbook** que instale Docker, descargue la imagen de ghcr y arranque la aplicación junto a su base de datos.
- **Desplegar sobre un servidor** (un contenedor que hará de máquina destino) vía SSH.
- **Verificar el despliegue** con un smoke test y saber **volver atrás** si falla.
- **Disparar el despliegue desde GitHub Actions**, logrando Continuous Deployment de punta a punta.

## 2. Conceptos clave

### 2.1 Qué es Ansible

Ansible es una herramienta de **automatización de configuración y despliegue**. Describes en archivos YAML el **estado deseado** de una máquina (qué paquetes, qué servicios, qué contenedores), y Ansible se encarga de que la máquina llegue a ese estado. En lugar de configurar servidores a mano (y olvidar lo que hiciste), tienes el despliegue **versionado y reproducible** en el repositorio.

### 2.2 Por qué "agentless"

Ansible no necesita instalar nada permanente en la máquina destino: se conecta por **SSH** y ejecuta las acciones de forma remota. Solo necesitas Ansible en tu máquina (el "controlador") y acceso SSH al servidor.

### 2.3 Vocabulario esencial

| Término | Qué es |
|---|---|
| inventory | Lista de las máquinas que gestionas y cómo conectarte a ellas. |
| playbook | Archivo YAML con la secuencia de tareas a aplicar. |
| task | Una acción concreta (instalar un paquete, arrancar un contenedor…). |
| module | El componente que ejecuta cada tarea (p. ej. el módulo docker_container). |
| role | Un conjunto de tareas, plantillas y variables reutilizable y con estructura fija. |
| collection | Paquete distribuible de módulos y roles (p. ej. community.docker). |

> **CONSEJO**
>
> **Idempotencia**: la propiedad central de Ansible. Ejecutar el mismo playbook varias veces deja la máquina en el mismo estado, sin repetir efectos. Si el contenedor ya está corriendo con la versión correcta, Ansible no hace nada; si no, lo corrige. Puedes relanzar sin miedo.

### 2.4 Nunca despliegues por "latest"

Es el error más común y el más caro. Si el playbook despliega `:latest` no puedes responder a la pregunta *"¿qué versión está corriendo?"*, no puedes reproducir un despliegue pasado y no puedes volver atrás. Además destruye la idempotencia real: cada ejecución tiene que ir al registro a comprobar si `latest` cambió. Desplegaremos siempre por un **tag inmutable** (`1.2.0` o `sha-abc1234`), que es exactamente para lo que los creaste en el [Boletín 5](boletin5-cd-github-actions.html).

## 3. Trabajo práctico — Núcleo (obligatorio)

### Parte A — Instalar Ansible y sus dependencias

- Instala Ansible en tu máquina (el controlador):

```bash
sudo apt update && sudo apt install -y ansible
ansible --version
```

- Instala la **collection** que aporta los módulos de Docker. Sin esto, todas las tareas `community.docker.*` fallan:

```bash
ansible-galaxy collection install community.docker
```

- Declara la dependencia en el repositorio para que sea reproducible, en `deploy/requirements.yml`:

```yaml
collections:
  - name: community.docker
    version: ">=3.4.0"
# se instala con:  ansible-galaxy collection install -r deploy/requirements.yml
```

> **OJO**
>
> Los módulos `community.docker.*` se ejecutan **en la máquina destino** y necesitan el SDK de Python de Docker allí. Es el fallo número uno de esta sesión (`Failed to import the required Python library (Docker SDK for Python)`): la Parte D lo instala explícitamente como primera tarea.

### Parte B — Preparar un "servidor" destino

En lugar de pagar un servidor en la nube, usarás un contenedor Linux con SSH que hará de máquina destino. Así todo el despliegue ocurre en tu portátil, pero el flujo es idéntico al real.

- Levanta un contenedor que actúe como servidor con SSH habilitado (una imagen Ubuntu con `openssh-server`, accesible en el puerto 2222). Anota IP, puerto, usuario y clave.
- Como el playbook va a manejar Docker dentro de ese servidor, arráncalo con `--privileged` o monta el socket del anfitrión; documenta qué opción elegiste.

> **CONSEJO**
>
> El objetivo didáctico es tener una máquina Linux a la que Ansible pueda entrar por SSH. Cómo la consigas (contenedor, VM con Vagrant o multipass, una Raspberry, una VM del free tier de cualquier nube) es secundario; el playbook será el mismo.

- Comprueba que puedes entrar por SSH manualmente antes de usar Ansible:

```bash
ssh usuario@localhost -p 2222
# si entras tú, Ansible también podrá
```

### Parte C — El inventario

Crea una carpeta `deploy/` en tu repositorio y dentro un archivo `inventory.ini` que describa el servidor:

```json
[servidores]
destino ansible_host=localhost ansible_port=2222 ansible_user=usuario

[servidores:vars]
ansible_python_interpreter=/usr/bin/python3
```

- Verifica la conexión con un "ping" de Ansible (comprueba que llega y puede ejecutar):

```bash
ansible -i deploy/inventory.ini servidores -m ping
```

Si responde `pong`, Ansible ya controla el servidor.

### Parte D — El playbook de despliegue

Crea `deploy/deploy.yml`. Instala Docker y sus dependencias, hace login en ghcr, despliega la base de datos y arranca la aplicación **por su tag inmutable**:

```yaml
---
- name: Desplegar la API de tareas
  hosts: servidores
  become: true

  vars:
    version_app: "1.0.0"                                   # se sobreescribe desde el CI
    imagen: "ghcr.io/TU_USUARIO/tareas-api:{{ version_app }}"

  tasks:
    - name: Instalar Docker y el SDK de Python
      apt:
        name: [ docker.io, python3-docker ]
        state: present
        update_cache: true

    - name: Asegurar que el servicio Docker está arrancado
      service: { name: docker, state: started, enabled: true }

    - name: Login en GHCR
      community.docker.docker_login:
        registry_url: ghcr.io
        username: "{{ ghcr_user }}"
        password: "{{ ghcr_token }}"

    - name: Red interna de la aplicación
      community.docker.docker_network: { name: tareas-net }

    - name: Base de datos PostgreSQL
      community.docker.docker_container:
        name: tareas-db
        image: postgres:16
        state: started
        restart_policy: always
        networks: [ { name: tareas-net } ]
        volumes: [ "tareas-db-data:/var/lib/postgresql/data" ]
        env:
          POSTGRES_DB: tareas
          POSTGRES_USER: "{{ db_user }}"
          POSTGRES_PASSWORD: "{{ db_pass }}"
        healthcheck:
          test: [ "CMD-SHELL", "pg_isready -U {{ db_user }}" ]
          interval: 5s
          retries: 10

    - name: Descargar la imagen de la aplicación
      community.docker.docker_image:
        name: "{{ imagen }}"
        source: pull

    - name: Arrancar el contenedor de la API
      community.docker.docker_container:
        name: tareas-api
        image: "{{ imagen }}"
        state: started
        recreate: false          # idempotencia: no lo toca si ya es esta versión
        restart_policy: always
        networks: [ { name: tareas-net } ]
        ports: [ "8080:8080" ]
        env:
          SPRING_DATASOURCE_URL: "jdbc:postgresql://tareas-db:5432/tareas"
          SPRING_DATASOURCE_USERNAME: "{{ db_user }}"
          SPRING_DATASOURCE_PASSWORD: "{{ db_pass }}"

    - name: Smoke test — esperar a que la API esté sana
      uri:
        url: "http://localhost:8080/actuator/health"
        status_code: 200
      register: salud
      retries: 20
      delay: 5
      until: salud.json.status is defined and salud.json.status == "UP"
```

> **OJO**
>
> Las credenciales (`ghcr_token`, `db_pass`…) **nunca** se escriben en el playbook ni se pasan por `--extra-vars` en la línea de comandos (quedan en el historial de tu shell y en la tabla de procesos). Usa **Ansible Vault** en local y **secrets** desde el CI. Ver Parte E y Parte G.

La última tarea es la más importante de todo el boletín: sin ella, "el despliegue ha terminado" solo significa que el contenedor arrancó, no que la aplicación funcione. Un despliegue que no se verifica no es un despliegue, es una esperanza.

### Parte E — Proteger las credenciales con Ansible Vault

```yaml
# Crea el archivo cifrado (te pedirá una contraseña maestra)
ansible-vault create deploy/group_vars/servidores/vault.yml

# Contenido (queda cifrado en el repositorio):
ghcr_user: TU_USUARIO
ghcr_token: ghp_xxxxxxxxxxxx
db_user: app
db_pass: una_clave_larga

# Para editarlo después:
ansible-vault edit deploy/group_vars/servidores/vault.yml
```

- Comprueba con `cat` que el archivo versionado es ilegible.
- Explica en el `AI_LOG.md` dónde guardarías la contraseña del Vault y por qué eso no es "el mismo problema otra vez".

### Parte F — Ejecutar el despliegue a mano

- Lanza el playbook contra el servidor:

```bash
ansible-playbook -i deploy/inventory.ini deploy/deploy.yml \
  --ask-vault-pass --extra-vars "version_app=1.0.0"
```

- Comprueba que la aplicación quedó corriendo en el servidor:

```bash
curl http://localhost:8080/api/tasks
# debe responder la API desplegada por Ansible
```

- Vuelve a ejecutar el mismo playbook y observa la **idempotencia**: Ansible informará de `changed=0` (todo ya está en el estado deseado). Guarda la salida de las dos ejecuciones.
- **Despliega una versión nueva**: publica un `v1.1.0` en el [Boletín 5](boletin5-cd-github-actions.html) y relanza con `--extra-vars "version_app=1.1.0"`. Comprueba que ahora sí hay cambios y que la API responde con lo nuevo.
- **Vuelve atrás**: relanza con `version_app=1.0.0` y verifica que el rollback funciona en menos de un minuto. Esto solo es posible porque los tags son inmutables.

### Parte G — Disparar el despliegue desde GitHub Actions (cierre CD)

Ahora automatizas el despliegue: tras publicar y aprobar la imagen, un job ejecuta Ansible solo.

```yaml
name: Deploy

on:
  workflow_run:
    workflows: [ "Release" ]
    types: [ completed ]

permissions:
  contents: read

jobs:
  deploy:
    # SIN esta condición, el despliegue se lanzaría también cuando Release FALLA
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: produccion          # reutiliza la puerta de aprobación del Boletín 5
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Instalar Ansible y la collection
        run: |
          pipx install ansible-core
          ansible-galaxy collection install -r deploy/requirements.yml

      - name: Configurar clave SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -p 2222 -H ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts

      - name: Desplegar con Ansible
        env:
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.VAULT_PASS }}
        run: |
          echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass
          ansible-playbook -i deploy/inventory.ini deploy/deploy.yml \
            --vault-password-file /tmp/vault_pass \
            --extra-vars "version_app=${{ github.event.workflow_run.head_sha }}"
```

- Fíjate en dos detalles que suelen faltar: la condición `conclusion == success` y el `ssh-keyscan` (sin él, la conexión falla por *host key verification*).
- El despliegue usa el **SHA del commit** como versión, que es exactamente uno de los tags que publicaste en el [Boletín 5](boletin5-cd-github-actions.html). Trazabilidad completa: de la aplicación corriendo al commit que la produjo.

> **CONSEJO**
>
> Para que el CI alcance tu servidor, este debe ser accesible desde Internet. En clase, esta parte puede quedarse como **demostración conceptual** (mostrar el workflow, explicar el flujo y ejecutar el playbook a mano) si no disponéis de un servidor público. Alternativas si quieres que funcione de verdad: un túnel (Tailscale, ngrok, Cloudflare Tunnel), una VM del free tier de una nube, o un *self-hosted runner* en tu propia red.

### Parte H — Versionar y documentar

- Añade la carpeta `deploy/` al repositorio vía Pull Request revisado por tu pareja.
- Documenta en el README cómo desplegar a mano, cómo se dispara el despliegue automático y **cómo hacer rollback**.
- Dibuja el flujo completo (Mermaid): *PR → CI valida → merge → Release construye, escanea y publica → aprobación → Deploy ejecuta Ansible → smoke test → app corriendo*.

## 4. Ampliación (para nota alta)

- **Estructura en roles**: refactoriza el playbook a `deploy/roles/api/` con `tasks/`, `defaults/`, `handlers/` y `templates/`. Explica qué gana el proyecto.
- **ansible-lint** como job del pipeline, y `ansible-playbook --check --diff` (modo simulación) como paso previo obligatorio al despliegue real.
- **Rollback automático**: si el smoke test falla, que el playbook (con `block`/`rescue`) vuelva a desplegar la versión anterior y marque el job como fallido.
- **Plantillas Jinja2**: genera el `docker-compose.yml` del servidor con `template:` y un `handler` que reinicie solo si el archivo cambió.
- **Verificación de la firma** de la imagen con cosign antes de arrancarla, si hiciste esa ampliación en el [Boletín 6](boletin6-pipeline-robusto.html).
- **Compara Ansible con las alternativas** en media página: Docker Compose por SSH, Kubernetes, o un PaaS. ¿Cuándo elegirías cada uno?

## 5. Cierre de la sesión

### Reto de depuración

- **`Failed to import the required Python library (Docker SDK for Python)`.** Es el error clásico. ¿En qué máquina falta la librería, en el controlador o en el destino? Explica por qué la respuesta no es obvia.
- **El playbook dice `changed=0` pero la aplicación sigue con la versión antigua.** Estabas desplegando `:latest`. Explica exactamente por qué Ansible cree que no hay nada que hacer y cómo lo resuelve el tag inmutable.
- **El workflow Deploy se ejecuta aunque Release haya fallado.** Identifica la línea que falta y razona qué consecuencia tendría en producción desplegar una imagen que nunca se llegó a publicar.
- **La API arranca y muere en bucle.** El contenedor de la base de datos existe pero la API no la encuentra. Revisa la red de Docker y el nombre de host del `SPRING_DATASOURCE_URL`.

### Antes de terminar

- Actualiza `docs/AI_LOG.md` con al menos dos entradas.
- Checkpoint final: sabrás explicar qué es la idempotencia y demostrarla, por qué no se despliega `latest`, y recorrer entero el camino de un commit hasta la aplicación corriendo.

## 6. Entrega del boletín

> **ENTREGA**
>
> El repositorio en GitHub, con:

- Carpeta `deploy/` con `inventory.ini`, `deploy.yml` y `requirements.yml`.
- Evidencia de un despliegue **ejecutado a mano** con Ansible (la app responde en el servidor).
- Demostración de **idempotencia**: salida de dos ejecuciones seguidas, la segunda con `changed=0`.
- Evidencia de un **despliegue de versión nueva** y de un **rollback** a la anterior.
- Smoke test dentro del playbook que verifica `/actuator/health`.
- Workflow de despliegue automático desde GitHub Actions (funcional o como demostración documentada), con la condición de éxito y el entorno de aprobación.
- Credenciales gestionadas con Ansible Vault y secrets, nunca en el playbook ni en la línea de comandos.
- README con el flujo completo de punta a punta documentado y `docs/AI_LOG.md` actualizado.

## 7. Criterios de evaluación

| Aspecto | Peso |
|---|---|
| Playbook correcto: instala dependencias, despliega BD y API y arranca el contenedor | 25% |
| Despliegue por tag inmutable, con actualización de versión y rollback demostrados | 20% |
| Idempotencia demostrada y smoke test que verifica el despliegue | 15% |
| Integración del despliegue con GitHub Actions (condición de éxito y aprobación) | 15% |
| Gestión segura de credenciales con Vault y secrets | 10% |
| Diario de IA (docs/AI_LOG.md) y documentación del flujo completo | 15% |
| Bonus — Ampliación: roles, ansible-lint, rollback automático, plantillas, cosign | hasta +1,5 |

## 8. Resultado final del curso

> **OBJETIVO**
>
> Con este boletín cierras el ciclo completo de prácticas continuas: una API REST en Maven con migraciones versionadas, contenerizada con Docker, validada y construida por un pipeline de CI/CD que controla la calidad y la seguridad de la cadena de suministro, publicada como imagen versionada y trazable y, finalmente, desplegada automáticamente en un servidor mediante Ansible, con verificación y vuelta atrás. Desde un commit hasta la aplicación corriendo: todo automatizado, versionado y reproducible.

Y algo que no aparece en ninguna rúbrica: sabes qué hace cada pieza y por qué está ahí. Eso es lo que distingue a quien monta un pipeline de quien lo mantiene cuando se rompe a las tres de la madrugada.
