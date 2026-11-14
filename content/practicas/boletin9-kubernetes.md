---
title: "Boletín 9: Desplegando una aplicación desde Kubernetes en AWS"
---

# Boletín 9: Desplegando una aplicación desde Kubernetes en AWS

## Objetivos

El objetivo principal de este laboratorio es desplegar una aplicación mediante Kubernetes y explorar los diferentes elementos que componen la arquitectura Kubernetes. Para ello llevaremos a cabo una serie de actividades prácticas sobre un sandbox de AWS Academy.

Después de completar este laboratorio, deberías ser capaz de:

- Instalar kubeadm para desplegar Kubernetes en un conjunto de nodos.
- Crear un deployment y un service en Kubernetes mediante kubectl.
- Desplegar un servicio nginx en Kubernetes.
- Actualizar un deployment en Kubernetes.
- Llevar a cabo toda la instalación y despliegue de Kubernetes en instancias AWS.

## Requerimientos

1. Disponer de acceso a los recursos de AWS a través de un sandbox de AWS Academy.

## Procedimiento

### Actividad 1. Creamos el conjunto de nodos para Kubernetes

En esta tarea inicial, crearás dos instancias EC2 para dar soporte al clúster de Kubernetes. Un nodo actuará de máster y otro de nodo worker.

- Desde la consola de servicios EC2 crea y lanza las siguientes instancias:
  - Un nodo con nombre `master`, sistema operativo Ubuntu 26.04, tipo de instancia t3.large y 16GB de disco EBS.
  - Un nodo con nombre `worker`, sistema operativo Ubuntu 26.04, tipo de instancia t3.large y 16GB de disco EBS.
- Configura la red de ambas instancias para poder conectarte mediante SSH.

### Actividad 2. Instalamos Kubernetes en el nodo master

En esta tarea, instalarás Kubernetes 1.37 en el nodo master creado en la actividad anterior usando la distribución de kubeadm.

- Instala kubeadm, kubelet y kubectl.
  - Conéctate mediante SSH a la instancia master. Debes usar el usuario `ubuntu` en lugar del usuario "ec2-user" usado en las prácticas anteriores.
  - Actualiza apt e instala los paquetes necesarios para usar el repositorio de Kubernetes:

    ```bash
    sudo apt update
    sudo apt install -y ca-certificates curl gpg
    ```

  - Descarga la clave de firma pública para los repositorios de paquetes de Kubernetes. Se utiliza la misma clave de firma para todos los repositorios, por lo que puedes ignorar la versión en la URL:

    ```bash
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.37/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    ```

  - Agrega el repositorio de Kubernetes apropiado. Este repositorio tiene paquetes solo para Kubernetes 1.37.

    ```bash
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.37/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
    ```

  - Actualiza el índice de paquetes, instala kubelet, kubeadm y kubectl y fija su versión.

    ```bash
    sudo apt update
    sudo apt install -y kubelet kubeadm kubectl
    sudo apt-mark hold kubelet kubeadm kubectl
    ```

  - El kubelet ahora se reinicia cada pocos segundos, mientras espera en un crashloop a que kubeadm le diga qué hacer.

- Debemos desactivar la memoria de intercambio en ambos nodos, ya que por defecto el kubelet no arranca si detecta swap en el nodo.
  - Desactiva el swap en la sesión actual:

    ```bash
    sudo swapoff -a
    ```

  - Haz el cambio persistente comentando cualquier entrada de swap en `/etc/fstab`, para que no se vuelva a activar al reiniciar:

    ```bash
    sudo sed -i '/\sswap\s/ s/^/#/' /etc/fstab
    ```

  - Comprueba que no se hace uso de memoria de intercambio con el comando:

    ```bash
    free -h
    ```

- Configura el nodo adecuadamente a nivel de red para funcionar con Kubernetes:
  - Configura de manera persistente la carga de los módulos overlay y br_netfilter:

    ```bash
    sudo tee /etc/modules-load.d/k8s.conf <<EOF
    overlay
    br_netfilter
    EOF
    ```

  - Carga en tiempo de ejecución los módulos overlay y br_netfilter:

    ```bash
    sudo modprobe overlay
    sudo modprobe br_netfilter
    ```

  - Permite que la instancia pueda encaminar tráfico a otros nodos:

    ```bash
    echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/k8s.conf
    sudo sysctl --system
    ```

  - Comprueba que el valor es 1:

    ```bash
    sysctl net.ipv4.ip_forward
    ```

- Instala un motor de contenedores en el nodo master.
  - Añade la clave de firma del repositorio de Docker, que distribuye el paquete `containerd.io`:

    ```bash
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    ```

  - Añade el repositorio de Docker:

    ```bash
    sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
    Types: deb
    URIs: https://download.docker.com/linux/ubuntu
    Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
    Components: stable
    Architectures: $(dpkg --print-architecture)
    Signed-By: /etc/apt/keyrings/docker.asc
    EOF
    ```

  - Instala containerd:

    ```bash
    sudo apt update
    sudo apt install -y containerd.io
    ```

  - Genera la configuración por defecto de containerd:

    ```bash
    sudo mkdir -p /etc/containerd
    containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
    ```

  - Configura el uso del driver cgroup en containerd. Edita el fichero `/etc/containerd/config.toml` y establece `SystemdCgroup` a `true`:

    ```bash
    sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
    ```

  - Reinicia containerd con la nueva configuración:

    ```bash
    sudo systemctl restart containerd
    sudo systemctl enable containerd
    systemctl status containerd
    ```

- Establece el hostname como `master-node`.
  - Ejecuta el siguiente comando:

    ```bash
    sudo hostnamectl set-hostname master-node
    ```

### Actividad 3. Instalamos Kubernetes en el nodo worker

En esta tarea, instalarás Kubernetes 1.37 en el nodo worker creado en la primera actividad usando la distribución de kubeadm.

Repite todos los pasos de la actividad anterior sobre la instancia worker. En el último paso, establece el hostname `worker-node`.

### Actividad 4. Inicializamos el plano de control en el nodo master

En esta tarea, inicializarás el plano de control de Kubernetes mediante kubeadm en el nodo master.

- Asegúrate de que el módulo br_netfilter está cargado:

  ```bash
  lsmod | grep br_netfilter
  ```

- Activa e inicia el servicio kubelet:

  ```bash
  sudo systemctl enable --now kubelet
  ```

- Descarga todas las imágenes de los componentes del plano de control:

  ```bash
  sudo kubeadm config images pull
  ```

- Lanzamos el clúster Kubernetes:

  ```bash
  sudo kubeadm init --pod-network-cidr=10.244.0.0/16
  ```

- La salida de este comando es muy importante, por lo que debes anotarla: contiene la IP y el token del endpoint.

  > **Nota:** es posible que `kubeadm` avise de que la imagen _sandbox_ (pause) configurada en containerd no coincide con la que recomienda. Es solo un aviso y no impide crear el clúster.

- Actualiza la configuración de Kubernetes:

  ```bash
  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config
  ```

- Comprueba el estado del clúster con el siguiente comando. Si obtienes algún error, reinicia la máquina virtual para que los servicios se reinicien:

  ```bash
  kubectl cluster-info
  ```

### Actividad 5. Instalamos el plugin de red de Kubernetes en el nodo máster

En esta tarea, configurarás el funcionamiento interno de la red de Pods. Existen varias alternativas (https://kubernetes.io/docs/concepts/cluster-administration/addons/), nosotros haremos uso de la red Flannel en nuestro clúster.

- Descarga el fichero YAML del plugin:

  ```bash
  wget https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
  ```

- Verifica que el fichero YAML tiene indicada la red `10.244.0.0/16` en la entrada `net-conf.json`. Para ello abre el fichero YAML usando vi o nano, y busca `net-conf.json`.

- Instala los recursos de la red Flannel:

  ```bash
  kubectl apply -f kube-flannel.yml
  ```

- Confirma que todo ha sido instalado correctamente:

  ```bash
  kubectl get pods -n kube-flannel
  ```

- Confirma que el nodo master tiene un estado Ready:

  ```bash
  kubectl get nodes -o wide
  ```

### Actividad 6. Añadimos el nodo worker al clúster

Una vez creado el plano de control y listo para su uso, en esta tarea añadirás el nodo worker creado anteriormente al clúster.

- En el nodo worker debes ejecutar el comando `kubeadm join` que nos indicó la salida del comando `kubeadm init`. Tendrás que utilizar `sudo` si no estás trabajando como _root_. El comando se parece al siguiente:

  ```bash
  sudo kubeadm join 172.X.X.X:6443 --token xxxx.xxxxxx --discovery-token-ca-cert-hash sha256:xxxxx...
  ```

- La salida del comando anterior podría no ser satisfactoria, ya que el grupo de seguridad del nodo master no permite tráfico de entrada proveniente del nodo worker. Modifica el grupo de seguridad para el nodo master y repite el comando anterior.

- Confirma que el nodo worker se ha añadido al clúster usando el siguiente comando en **el plano de control**:

  ```bash
  kubectl get nodes
  ```

### Actividad 7. Desplegamos una aplicación en Kubernetes

En esta tarea, desplegarás una aplicación web en el clúster de Kubernetes que acabas de crear en los pasos anteriores.

#### Actividad 7.1. Creamos un deployment basado en un fichero YAML

- Crea el fichero `deployment.yaml` con este contenido:

  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: nginx-deployment
  spec:
    selector:
      matchLabels:
        app: nginx
    replicas: 1 # tells deployment to run 2 pods matching the template
    template:
      metadata:
        labels:
          app: nginx
      spec:
        containers:
          - name: nginx
            image: nginx:1.31.8
            ports:
              - containerPort: 80
  ```

- Crea un deployment basado en el fichero `deployment.yaml`:

  ```bash
  kubectl apply -f deployment.yaml
  ```

- Muestra la información sobre este deployment con el siguiente comando:

  ```bash
  kubectl describe deployment nginx-deployment
  ```

- Muestra la lista de pods creados para el deployment:

  ```bash
  kubectl get pods -l app=nginx
  ```

- Muestra información sobre el pod (pon en `<pod-name>` el nombre de tu pod):

  ```bash
  kubectl describe pod <pod-name>
  ```

#### Actividad 7.2. Creamos un service para la aplicación

- Crea un service NodePort para poder ver el servidor nginx desde el navegador:

  ```bash
  kubectl create service nodeport nginx --tcp=80:80
  ```

- Lista todos los servicios en ejecución:

  ```bash
  kubectl get service
  ```

- En la salida del comando anterior puedes ver el puerto en el que queda accesible el servicio. Puedes acceder a este servicio usando la IP pública del nodo worker, pero debes modificar su grupo de seguridad para permitirlo. Hazlo y accede desde tu navegador al servicio nginx.

### Actividad 8. Limpieza de la práctica

Para eliminar la práctica y que no consuma recursos de AWS, simplemente procedemos a terminar todas las instancias EC2 que hemos creado.

Recuerda también que, para hacer un uso responsable de los recursos en la nube, el laboratorio de AWS Academy debe cerrarse presionando el botón **End Lab** desde la plataforma.

## Entregable

El informe escrito de cada equipo debe presentarse en formato PDF e incluir los elementos listados a continuación:

- Título y autores.
- Realización y explicación de las actividades anteriores.
- Capturas de pantalla y salida de los comandos más significativos que muestren la realización de las actividades anteriores.
- Preguntas cortas:
  - En la Actividad 1, tras lanzar las instancias, ¿qué reglas de entrada y salida tiene el grupo de seguridad de cada una?
  - En la Actividad 2, ¿qué es containerd? ¿Qué es el driver cgroup?
  - En la Actividad 4, ¿qué significa el parámetro `--pod-network-cidr`?
  - En la Actividad 5, ¿qué otras alternativas has encontrado para Flannel?
  - En la Actividad 6, ¿qué significa cada parámetro usado en el comando `kubeadm join`?
  - En la Actividad 7.1, ¿qué significa cada campo del fichero `deployment.yaml`?
  - En la Actividad 7.2, ¿qué significa que el servicio sea de tipo NodePort?
- Actividades adicionales:
  - Amplía el clúster de Kubernetes con un segundo nodo worker. Indica los pasos seguidos e incluye evidencias.
  - Escala el deployment de nginx aumentando el número de réplicas a 2. Indica los pasos seguidos e incluye evidencias.
  - Indica cómo acceder al servicio NodePort a través de los nodos worker del clúster.
- Preguntas que requieren razonamiento:
  - Tras terminar las actividades adicionales, ¿desde cuántos nodos está accesible el servicio nginx? ¿Crees que esta es la forma más adecuada de desplegar el servicio o faltaría algún componente en la instalación final?
  - ¿Qué otros componentes crees que podrían facilitar la gestión de un clúster Kubernetes y no están incluidos en esta práctica?
- Declaración del uso de IA (cuáles y para qué).
- Bibliografía (si se utilizaron recursos externos).
