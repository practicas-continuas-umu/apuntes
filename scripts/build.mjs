// Genera el sitio estático en _site/ a partir de content/ y web/.
// Uso: node scripts/build.mjs
import { marpCli } from '@marp-team/marp-cli'
import frontMatter from 'front-matter'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SITE = path.join(ROOT, '_site')
const SLIDES_SRC = path.join(ROOT, 'content', 'slides')
const PRACTICAS_SRC = path.join(ROOT, 'content', 'practicas')
const THEME = path.join(SLIDES_SRC, 'theme', 'umu.css')
const WEB_SRC = path.join(ROOT, 'web')

// Favicon compartido (emoji de infinito ♾️) para las diapositivas y las prácticas.
// web/index.html define el suyo aparte, directamente en el HTML.
const FAVICON_LINK =
  "<link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♾️</text></svg>\">"

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {
        // fall through to default escaping
      }
    }
    return md.utils.escapeHtml(str)
  },
})

// Los bloques ```mermaid no se resaltan como código: se renderizan como
// diagrama en el navegador (mermaid.js los busca por su clase "mermaid").
const defaultFenceRenderer =
  md.renderer.rules.fence ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const lang = token.info.trim()
  if (lang === 'mermaid') {
    return `<pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre>\n`
  }
  return defaultFenceRenderer(tokens, idx, options, env, self)
}

// Slug al estilo GitHub, para que los enlaces manuales de un Índice
// (p.ej. "[Tema](#1-mi-titulo)") apunten de verdad a su cabecera.
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
}

function headingText(tokens, idx) {
  const inline = tokens[idx + 1]
  if (!inline || !inline.children) return ''
  return inline.children
    .filter((t) => t.type === 'text' || t.type === 'code_inline')
    .map((t) => t.content)
    .join('')
}

// Asigna un id a cada cabecera (h1-h6) a partir de su texto, gestionando
// duplicados igual que GitHub (segunda aparición de "x" -> "x-1", etc.).
md.core.ruler.push('heading_ids', (state) => {
  const slugCounts = new Map()
  for (let i = 0; i < state.tokens.length; i++) {
    const token = state.tokens[i]
    if (token.type !== 'heading_open') continue
    let slug = slugify(headingText(state.tokens, i))
    const count = slugCounts.get(slug) || 0
    slugCounts.set(slug, count + 1)
    if (count > 0) slug = `${slug}-${count}`
    token.attrSet('id', slug)
  }
})

async function rmrf(target) {
  await fs.rm(target, { recursive: true, force: true })
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(s, d)
    } else {
      await fs.copyFile(s, d)
    }
  }
}

// Extrae el número inicial del nombre de fichero para ordenar (tema3-x.md -> 3).
// Ficheros sin número (p.ej. proyecto.md) van al final, por orden alfabético.
function orderOf(filename) {
  const match = filename.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
}

function titleFromMarkdown(body, fallback) {
  const heading = body.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : fallback
}

async function buildSlides() {
  const files = (await fs.readdir(SLIDES_SRC)).filter((f) => f.endsWith('.md'))
  const outDir = path.join(SITE, 'slides')
  await fs.mkdir(outDir, { recursive: true })

  // Las diapositivas referencian imágenes con rutas relativas (assets/temaN/...).
  // Marp CLI no las embebe en el HTML, así que copiamos la carpeta de assets
  // conservando la misma estructura relativa que en content/slides/.
  const assetsSrc = path.join(SLIDES_SRC, 'assets')
  if (existsSync(assetsSrc)) {
    await copyDir(assetsSrc, path.join(outDir, 'assets'))
  }

  const manifest = []
  for (const file of files) {
    const slug = file.replace(/\.md$/, '')
    const srcPath = path.join(SLIDES_SRC, file)
    const outPath = path.join(outDir, `${slug}.html`)
    const raw = await fs.readFile(srcPath, 'utf-8')
    const { attributes, body } = frontMatter(raw)
    const title = attributes.title || titleFromMarkdown(body, slug)

    const exitCode = await marpCli([
      srcPath,
      '--html',
      '--allow-local-files',
      '--theme-set',
      THEME,
      '-o',
      outPath,
    ])
    if (exitCode !== 0) {
      throw new Error(`Marp CLI falló al generar ${file} (código ${exitCode})`)
    }

    // Marp CLI no tiene una opción para fijar el favicon: lo inyectamos
    // después, a mano, en el <head> del HTML ya generado.
    const generatedHtml = await fs.readFile(outPath, 'utf-8')
    await fs.writeFile(outPath, generatedHtml.replace('<head>', `<head>${FAVICON_LINK}`), 'utf-8')

    // Copia el .md original para el botón "Descargar MD" del visor.
    await fs.copyFile(srcPath, path.join(outDir, file))

    manifest.push({
      id: slug,
      title,
      type: 'slides',
      file: `slides/${slug}.html`,
      source: `slides/${file}`,
      order: orderOf(slug),
    })
  }

  manifest.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return manifest
}

// Tras renderizar cada diagrama Mermaid, lo envuelve con zoom (rueda del
// ratón, centrado en el cursor) y paneo (arrastrar), más una mini barra de
// botones +/-/reset para quien no tenga ratón con rueda.
const MERMAID_PAN_ZOOM_SCRIPT = `<script src="../vendor/mermaid.min.js"></script>
<script>
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })
mermaid.run({ querySelector: '.mermaid' }).then(function () {
  document.querySelectorAll('pre.mermaid').forEach(setupPanZoom)
})

function setupPanZoom(container) {
  var svg = container.querySelector('svg')
  if (!svg) return

  var state = { scale: 1, x: 0, y: 0 }
  var MIN_SCALE = 0.4
  var MAX_SCALE = 6

  container.classList.add('mz-wrap')
  svg.classList.add('mz-svg')

  function apply() {
    svg.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) scale(' + state.scale + ')'
  }

  function zoomBy(factor, cx, cy) {
    var newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.scale * factor))
    var ratio = newScale / state.scale
    state.x = cx - (cx - state.x) * ratio
    state.y = cy - (cy - state.y) * ratio
    state.scale = newScale
    apply()
  }

  container.addEventListener('wheel', function (e) {
    e.preventDefault()
    var rect = container.getBoundingClientRect()
    var cx = e.clientX - rect.left - rect.width / 2
    var cy = e.clientY - rect.top - rect.height / 2
    zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, cx, cy)
  }, { passive: false })

  var dragging = false
  var startX, startY, origX, origY

  container.addEventListener('pointerdown', function (e) {
    // No empieces un arrastre si el clic viene de la barra de zoom: si no,
    // capturar el puntero aquí interfiere con el click del propio botón.
    if (e.target.closest('.mz-toolbar')) return
    dragging = true
    startX = e.clientX
    startY = e.clientY
    origX = state.x
    origY = state.y
    container.setPointerCapture(e.pointerId)
    container.classList.add('mz-dragging')
  })
  container.addEventListener('pointermove', function (e) {
    if (!dragging) return
    state.x = origX + (e.clientX - startX)
    state.y = origY + (e.clientY - startY)
    apply()
  })
  function endDrag(e) {
    dragging = false
    container.classList.remove('mz-dragging')
    // Sin esto, los clics posteriores en la barra de zoom se redirigen al
    // contenedor (que sigue "capturando" el puntero) en vez de al botón.
    if (container.hasPointerCapture(e.pointerId)) {
      container.releasePointerCapture(e.pointerId)
    }
  }
  container.addEventListener('pointerup', endDrag)
  container.addEventListener('pointercancel', endDrag)
  container.addEventListener('dblclick', function () {
    state = { scale: 1, x: 0, y: 0 }
    apply()
  })

  var toolbar = document.createElement('div')
  toolbar.className = 'mz-toolbar'
  toolbar.innerHTML =
    '<button type="button" data-act="in" title="Acercar">+</button>' +
    '<button type="button" data-act="out" title="Alejar">\\u2212</button>' +
    '<button type="button" data-act="reset" title="Restablecer">\\u27f2</button>'
  toolbar.addEventListener('click', function (e) {
    var act = e.target.getAttribute('data-act')
    if (act === 'in') zoomBy(1.2, 0, 0)
    else if (act === 'out') zoomBy(1 / 1.2, 0, 0)
    else if (act === 'reset') {
      state = { scale: 1, x: 0, y: 0 }
      apply()
    }
  })
  container.appendChild(toolbar)
}
</script>`

function practicaTemplate({ title, contentHtml }) {
  const hasMermaid = contentHtml.includes('class="mermaid"')
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${FAVICON_LINK}
<link rel="stylesheet" href="../vendor/github-markdown.css">
<link rel="stylesheet" href="../vendor/highlight.css">
<style>
  body {
    margin: 0;
    padding: 2.5rem 1.5rem 4rem;
    background: #ffffff;
  }
  .markdown-body {
    box-sizing: border-box;
    max-width: 860px;
    margin: 0 auto;
  }
  .markdown-body pre code.hljs { padding: 0; }
  .markdown-body pre.mermaid {
    background: none;
    border: none;
    text-align: center;
  }
  .markdown-body pre.mermaid.mz-wrap {
    position: relative;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
  }
  .markdown-body pre.mermaid.mz-wrap.mz-dragging {
    cursor: grabbing;
  }
  .markdown-body pre.mermaid .mz-svg {
    transform-origin: center center;
    display: block;
    margin: 0 auto;
  }
  .mz-toolbar {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    display: flex;
    gap: 0.25rem;
  }
  .mz-toolbar button {
    width: 1.6rem;
    height: 1.6rem;
    border: 1px solid #d7dde3;
    background: #ffffff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    padding: 0;
  }
  .mz-toolbar button:hover {
    background: #f0f2f4;
  }
</style>
</head>
<body>
  <article class="markdown-body">
    ${contentHtml}
  </article>
  ${hasMermaid ? MERMAID_PAN_ZOOM_SCRIPT : ''}
</body>
</html>
`
}

async function buildPracticas() {
  const files = (await fs.readdir(PRACTICAS_SRC)).filter((f) => f.endsWith('.md'))
  const outDir = path.join(SITE, 'practicas')
  await fs.mkdir(outDir, { recursive: true })

  const manifest = []
  for (const file of files) {
    const slug = file.replace(/\.md$/, '')
    const srcPath = path.join(PRACTICAS_SRC, file)
    const outPath = path.join(outDir, `${slug}.html`)
    const raw = await fs.readFile(srcPath, 'utf-8')
    const { attributes, body } = frontMatter(raw)
    const title = attributes.title || titleFromMarkdown(body, slug)
    const contentHtml = md.render(body)

    await fs.writeFile(outPath, practicaTemplate({ title, contentHtml }), 'utf-8')

    // Copia el .md original para el botón "Descargar MD" del visor.
    await fs.copyFile(srcPath, path.join(outDir, file))

    manifest.push({
      id: slug,
      title,
      type: 'practica',
      file: `practicas/${slug}.html`,
      source: `practicas/${file}`,
      order: orderOf(slug),
    })
  }

  manifest.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return manifest
}

async function copyVendorAssets() {
  const vendorDir = path.join(SITE, 'vendor')
  await fs.mkdir(vendorDir, { recursive: true })
  await fs.copyFile(
    path.join(ROOT, 'node_modules', 'github-markdown-css', 'github-markdown.css'),
    path.join(vendorDir, 'github-markdown.css'),
  )
  await fs.copyFile(
    path.join(ROOT, 'node_modules', 'highlight.js', 'styles', 'github.css'),
    path.join(vendorDir, 'highlight.css'),
  )
  await fs.copyFile(
    path.join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    path.join(vendorDir, 'mermaid.min.js'),
  )
}

async function main() {
  console.log('Limpiando _site/ ...')
  await rmrf(SITE)
  await fs.mkdir(SITE, { recursive: true })

  console.log('Copiando shell web (web/) ...')
  if (!existsSync(WEB_SRC)) throw new Error('No existe la carpeta web/')
  await copyDir(WEB_SRC, SITE)

  console.log('Copiando dependencias de estilo (github-markdown-css, highlight.js) ...')
  await copyVendorAssets()

  console.log('Generando diapositivas con Marp CLI ...')
  const temas = await buildSlides()

  console.log('Generando boletines de prácticas ...')
  const practicas = await buildPracticas()

  console.log('Escribiendo manifest.json ...')
  await fs.writeFile(
    path.join(SITE, 'manifest.json'),
    JSON.stringify({ temas, practicas }, null, 2),
    'utf-8',
  )

  console.log(`Listo: ${temas.length} temas, ${practicas.length} prácticas en _site/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
