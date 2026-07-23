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

    manifest.push({
      id: slug,
      title,
      type: 'slides',
      file: `slides/${slug}.html`,
      order: orderOf(slug),
    })
  }

  manifest.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return manifest
}

function practicaTemplate({ title, contentHtml }) {
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
</style>
</head>
<body>
  <article class="markdown-body">
    ${contentHtml}
  </article>
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

    manifest.push({
      id: slug,
      title,
      type: 'practica',
      file: `practicas/${slug}.html`,
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
