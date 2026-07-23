---
title: "Práctica 6: Ansible"
---

# Práctica 6: Ansible

## Objetivos

El objetivo de esta práctica es familiarizarse con la automatización de la configuración de sistemas mediante **Ansible**, aprendiendo a escribir y ejecutar *playbooks* básicos para su administración.

Al terminar la práctica sabréis:

- Definir un inventario de hosts gestionados.
- Ejecutar comandos *ad hoc* para tareas puntuales.
- Escribir *playbooks* que instalen y configuren software de forma reproducible.
- Organizar la automatización en *roles* reutilizables.

## Relación con el temario

Esta práctica se apoya directamente en el **[Tema 6: Infraestructura como Código](../slides/tema6-infraestructura-como-codigo.html)**.

## Contexto

Dispondréis de una o varias máquinas gestionadas (máquinas virtuales o contenedores accesibles por SSH, según indique el profesorado) sobre las que automatizaréis, con Ansible, el despliegue de un servidor web y, opcionalmente, una base de datos — evitando la configuración manual "a mano" de cada máquina.

## Tareas

1. **Preparar el nodo de control**
   - Instalar Ansible en vuestra máquina (nodo de control).
   - Comprobar que tenéis acceso SSH (con clave, sin contraseña) a las máquinas gestionadas.

2. **Definir el inventario**
   - Crear un fichero `inventory.ini` con al menos dos grupos de hosts, por ejemplo `[web]` y `[db]`.
   - Comprobar la conectividad con un comando *ad hoc*: `ansible all -i inventory.ini -m ping`.

3. **Comandos ad hoc**
   - Ejecutar al menos dos comandos *ad hoc* adicionales sobre el inventario (por ejemplo, comprobar la versión del sistema operativo con el módulo `command`, o copiar un archivo con el módulo `copy`).

4. **Escribir un playbook para el servidor web**
   - Crear `site.yml` con un *play* dirigido al grupo `web` que:
     - Instale un servidor web (por ejemplo, Nginx o Apache) con el módulo `apt`/`yum`.
     - Copie un fichero `index.html` propio a la ruta servida por el servidor web.
     - Asegure que el servicio está iniciado y habilitado en el arranque (módulo `service`).
   - Ejecutar `ansible-playbook -i inventory.ini site.yml` y comprobar desde el navegador (o `curl`) que el contenido se sirve correctamente.

5. **Añadir un segundo play para la base de datos (opcional)**
   - Añadir a `site.yml` un *play* dirigido al grupo `db` que instale y arranque un motor de base de datos.
   - Comprobar que ambos *plays* se ejecutan correctamente con una única invocación de `ansible-playbook`.

6. **Refactorizar a roles**
   - Reorganizar la automatización anterior en *roles* (`roles/webserver/tasks/main.yml`, `roles/dbserver/tasks/main.yml`...).
   - Adaptar `site.yml` para que cada *play* simplemente incluya el rol correspondiente.

7. **Usar un rol de Ansible Galaxy (opcional)**
   - Buscar en [Ansible Galaxy](https://galaxy.ansible.com/ui/) un rol de la comunidad que resuelva (total o parcialmente) una de las tareas anteriores.
   - Instalarlo (`ansible-galaxy install ...`) y referenciarlo desde vuestro `site.yml`, comparando el esfuerzo frente a escribir el rol desde cero.

## Entregables

- `inventory.ini`, `site.yml` y la carpeta `roles/` con la automatización organizada en roles.
- Evidencia de una ejecución exitosa de `ansible-playbook` (salida de la terminal o capturas) y del resultado (por ejemplo, captura del sitio web servido).

## Criterios de evaluación orientativos

| Criterio | Peso orientativo |
|---|---|
| El playbook se ejecuta sin errores y el servicio queda correctamente configurado | 40% |
| Inventario y comandos *ad hoc* usados correctamente | 15% |
| Automatización organizada en *roles* reutilizables | 25% |
| Playbooks idempotentes (ejecutarlos varias veces no produce errores ni cambios innecesarios) | 20% |

> Estos pesos son orientativos; el profesorado puede ajustarlos y añadir criterios específicos del enunciado concreto de cada curso.
