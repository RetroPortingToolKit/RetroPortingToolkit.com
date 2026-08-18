# retroportingtoolkit.com

A generic content-driven site template: a React + TypeScript + Vite SPA with a
markdown content pipeline, a tabbed home with a live page-turn pager, and a
stacked-modal detail layer.

Everything shipped here is placeholder content. Nothing in this repo is
specific to a person or a product yet.

## Getting started

```sh
npm install
npm run dev      # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server, bound to `0.0.0.0` for device testing |
| `npm run build` | Typecheck (`tsc -b`) then a production build into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |

## First things to change

1. **`src/lib/site.ts`**: name, wordmark, canonical URL, description, byline.
   Nothing else hardcodes the brand.
2. **`index.html`**: `<title>`, description, canonical, and Open Graph tags.
3. **`data/`**: all the content. See below.
4. **`src/lib/topics.ts`**: the cross-cutting topic groupings.

## Content model

Content is plain files under `data/`, read at build time by
`src/lib/content.ts` via Vite's `import.meta.glob`. There is no CMS and no
database.

```
data/
  about.md          frontmatter + body -> the About block and footer
  home.json         proof paragraphs, recognition groups, philosophy lines
  projects/<nn>_<slug>/index.md
  talks/<nn>_<slug>/index.md
  writing/<nn>_<slug>/index.md
  blog/<nn>_<slug>/index.md
```

The folder name carries both ordering and identity: `03_third-project` sorts
third and is served at `/projects/third-project`. Media referenced as `./file`
in frontmatter resolves relative to that item's folder, so an entry's images
and video live beside its markdown.

Item frontmatter fields are typed in `src/lib/types.ts`: `title`, `kicker`,
`desc`, `cover`, `gallery`, `links`, `tags`, `year`, `venue`, `date`,
`featured`, `group`, `demo`, and more.

## Architecture

- **`src/App.tsx`**: routing plus the stacked-modal layer. Opening an item
  from a page pushes a route carrying the current location as `background`
  state, so the page underneath stays mounted and closing walks back one layer
  at a time.
- **`src/pages/Home.tsx`**: the tabbed home (Home / Work / Blog) and
  the live pager: wheel and touch gestures drag the neighbouring tab in
  proportionally, committing past a threshold or springing back.
- **`src/lab/labContent.ts`**: adapts parsed `Item`s into the `LabMedia` view
  model every card renders from, so grids, tabs, and collection overlays share
  one card component (`src/components/SpatialCard.tsx`).
- **`src/styles/`**: ordered CSS partials; the cascade depends on the import
  order in `src/main.tsx`. Light and dark are both driven by tokens in
  `01-base.css`.

## Deployment

`vercel.json` configures clean URLs and an SPA rewrite. The build is fully
static, so any static host works.
