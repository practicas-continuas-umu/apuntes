(function () {
  'use strict'

  var sidebarEl = document.getElementById('sidebar')
  var sidebarToggle = document.getElementById('sidebar-toggle')
  var homeLink = document.getElementById('home-link')
  var navTemas = document.getElementById('nav-temas')
  var navPracticas = document.getElementById('nav-practicas')
  var homeTemas = document.getElementById('home-temas')
  var homePracticas = document.getElementById('home-practicas')
  var homeView = document.getElementById('home-view')
  var viewer = document.getElementById('viewer')
  var viewerTitle = document.getElementById('viewer-title')
  var presentBtn = document.getElementById('present-btn')

  var itemsById = {}

  function renderNavList(container, items) {
    container.innerHTML = ''
    if (!items.length) {
      var li = document.createElement('li')
      li.className = 'empty'
      li.textContent = 'Nada por aquí todavía.'
      container.appendChild(li)
      return
    }
    items.forEach(function (item) {
      var li = document.createElement('li')
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = item.title
      btn.dataset.id = item.id
      btn.addEventListener('click', function () {
        location.hash = item.id
        if (window.matchMedia('(max-width: 820px)').matches) {
          closeSidebar()
        }
      })
      li.appendChild(btn)
      container.appendChild(li)
    })
  }

  function renderHomeGrid(container, items, extraClass) {
    container.innerHTML = ''
    if (!items.length) {
      var p = document.createElement('p')
      p.className = 'home-empty'
      p.textContent = 'Nada por aquí todavía.'
      container.appendChild(p)
      return
    }
    items.forEach(function (item) {
      var card = document.createElement('button')
      card.type = 'button'
      card.className = 'home-card' + (extraClass ? ' ' + extraClass : '')
      card.textContent = item.title
      card.dataset.id = item.id
      card.addEventListener('click', function () {
        location.hash = item.id
      })
      container.appendChild(card)
    })
  }

  function setActiveButton(id) {
    var buttons = document.querySelectorAll('.nav-list button')
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.id === id)
    })
  }

  function openSidebar() {
    sidebarEl.classList.add('open')
    sidebarToggle.setAttribute('aria-expanded', 'true')
  }

  function closeSidebar() {
    sidebarEl.classList.remove('open')
    sidebarToggle.setAttribute('aria-expanded', 'false')
  }

  sidebarToggle.addEventListener('click', function () {
    if (sidebarEl.classList.contains('open')) {
      closeSidebar()
    } else {
      openSidebar()
    }
  })

  function showHome() {
    viewerTitle.textContent = 'Inicio'
    presentBtn.hidden = true
    viewer.hidden = true
    viewer.src = 'about:blank'
    homeView.hidden = false
    setActiveButton(null)
  }

  function loadItem(id) {
    var item = itemsById[id]
    if (!item) return

    homeView.hidden = true
    viewerTitle.textContent = item.title
    viewer.hidden = false
    viewer.src = item.file
    presentBtn.hidden = item.type !== 'slides'
    setActiveButton(id)

    // Da el foco al documento cargado en el iframe para que las flechas
    // del teclado naveguen las diapositivas sin tener que hacer clic antes.
    viewer.onload = function () {
      try {
        viewer.contentWindow.focus()
      } catch (e) {
        // Silenciar: puede fallar si el navegador bloquea el foco cross-origin.
      }
    }
  }

  function handleHashChange() {
    var id = decodeURIComponent(location.hash.replace(/^#/, ''))
    if (!id) {
      showHome()
    } else if (itemsById[id]) {
      loadItem(id)
    } else {
      showHome()
    }
  }

  homeLink.addEventListener('click', function () {
    location.hash = ''
    showHome()
    if (window.matchMedia('(max-width: 820px)').matches) {
      closeSidebar()
    }
  })

  presentBtn.addEventListener('click', function () {
    if (viewer.requestFullscreen) {
      viewer.requestFullscreen()
    } else if (viewer.webkitRequestFullscreen) {
      viewer.webkitRequestFullscreen()
    }
    try {
      viewer.contentWindow.focus()
    } catch (e) {
      // ver comentario anterior
    }
  })

  fetch('manifest.json')
    .then(function (res) {
      if (!res.ok) throw new Error('No se pudo cargar manifest.json')
      return res.json()
    })
    .then(function (data) {
      var temas = data.temas || []
      var practicas = data.practicas || []

      temas.concat(practicas).forEach(function (item) {
        itemsById[item.id] = item
      })

      renderNavList(navTemas, temas)
      renderNavList(navPracticas, practicas)
      renderHomeGrid(homeTemas, temas)
      renderHomeGrid(homePracticas, practicas, 'practica')

      window.addEventListener('hashchange', handleHashChange)
      handleHashChange()
    })
    .catch(function (err) {
      viewerTitle.textContent = 'Error cargando el contenido'
      homeView.hidden = false
      homeTemas.innerHTML = ''
      homePracticas.innerHTML = ''
      var p = document.createElement('p')
      p.className = 'home-empty'
      p.textContent = '⚠️ No se pudo cargar manifest.json: ' + err.message
      homeTemas.appendChild(p)
      console.error(err)
    })
})()
