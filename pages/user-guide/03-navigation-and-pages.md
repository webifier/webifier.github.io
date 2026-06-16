---
title: Navigation and Pages
header:
  title: Navigation and Pages
  description: Wire the site together with navigation links and content-page links.
---

# Navigation and Pages

Webifier separates two ideas:

- The navigation bar is a site-level map.
- Content links decide which Markdown, notebook, HTML, or PDF files become pages.

## Navigation

A common pattern is to keep navigation in a separate file and patch it into
`index.yml`:

```yaml
# index.yml
nav:
  patch: configurations/nav.yml
```

```yaml
# configurations/nav.yml
brand:
  text: My Project
  link: /

content:
  - text: Docs
    link: /pages/user-guide/
  - text: GitHub
    link: https://github.com/me/project
```

The brand link usually takes people home, so you do not need a separate Home
item unless your site wants one.

## Bottom Page Navigation

The standard page templates can also render a bottom previous/home/next block.
This is useful for documentation, tutorials, course notes, and any content that
has a preferred reading order.

Set the default sequence in site config:

```yaml
config:
  page_navigation:
    home:
      title: User Guide
      href: /pages/user-guide/
    items:
      - title: Start
        href: /pages/user-guide/
      - title: Installation
        src: pages/user-guide/tutorials/00-installation-and-github-actions.yml
      - title: YAML Pages
        src: pages/user-guide/tutorials/01-yaml-pages-and-sections.yml
      - title: Section Controls
        src: pages/user-guide/tutorials/02-section-controls.yml
```

`items` can be nested for organization. Webifier flattens the readable entries,
matches the current page by `href` or `src`, then renders the previous and next
neighbors. `src` entries are resolved to the generated `.html` URL, which keeps
the config close to the source files.

Each page can override or hide this block from its own `config`:

```markdown
---
title: One-off Page
config:
  page_navigation: false
---
```

Or override individual slots:

```yaml
config:
  page_navigation:
    previous: false
    home:
      title: Docs
      href: /pages/user-guide/
    next:
      title: Extension Overview
      href: /pages/user-guide/extensions/
```

Slot values can be:

- `false`: hide that slot.
- a string: use it as the link URL.
- an object with `title` or `text` plus `href`, `link`, or `src`.

Page-local navigation config is merged over the site-level sequence for that
page only. Linked child pages use the site default unless they define their own
page config.

## Generated Content Pages

Use `md=...` links when you want Webifier to render a source file as a page:

```markdown
- [Project Notes](md=pages/notes.md)
- [Notebook](md=pages/notebook.ipynb)
- [Reference](md=pages/reference.md)
```

Those links are rewritten to generated `.html` pages in the output. This keeps
the source easy to read while still producing a complete static website.

## Plain Links

Use normal links when the target already exists or should not be rendered by
Webifier:

```markdown
- [GitHub](https://github.com/me/project)
- [Raw PDF](/assets/report.pdf)
```

For the detailed page and link behavior, see [YAML Syntax Specification](reference/01-yaml-syntax.html)
and [Processing Pipeline](reference/05-processing-pipeline.html).
