---
title: Using the Default Site
header:
  title: Using the Default Site
  description: Create a useful Webifier site before writing custom templates or Python.
---

# Using the Default Site

The fastest way to use Webifier is to enable the bundled extensions and let the
default renderers do the work. You create an `index.yml`, point it at content,
and let Webifier build the page, copy assets, and generate linked content pages.

Webifier core does not try to own a giant website syntax. The syntax becomes
useful when extensions are enabled. In the default setup:

| Extension | What it teaches Webifier |
|---|---|
| `webifier.standard` | Page controls such as `header`, `nav`, `meta`, `footer`, sections, links, and the base page shell |
| `webifier.markdown` | Markdown blocks and linked Markdown pages |
| `webifier.notebook` | Linked notebook pages and notebook page config |
| `webifier.pdf` | Linked PDF pages with site navigation and optional controls |
| `webifier.theme` | Light/dark/system theme behavior |

For the first-principles version of this idea, start with
[YAML Pages and Sections](index=pages/user-guide/tutorials/01-yaml-pages-and-sections.yml).

## Minimal Shape

```yaml
title: My Project

config:
  webifier:
    extensions:
      site:
        uses: webifier.standard
      markdown:
        uses: webifier.markdown
      notebook:
        uses: webifier.notebook
      pdf:
        uses: webifier.pdf

header:
  title: My Project
  description: Notes, notebooks, and results from the project.

intro:
  label: Overview
  body: |
    # Welcome

    This site is generated from files already in the repository.

docs:
  label: Pages
  body: |
    - [Project Notes](md=pages/notes.md)
    - [Experiment Notebook](md=pages/experiment.ipynb)
    - [Final Report](pdf=reports/final.pdf)
```

The root YAML file becomes the home page. With `webifier.standard` enabled,
page-level keys such as `title`, `header`, `nav`, `footer`, `meta`, `style`, and
`config` are controls. Other top-level keys become sections rendered in source
order.

That distinction is extension-defined. A custom extension can claim another
page key, consume it, and remove it before section rendering. If no extension
claims a key, the standard renderer treats it as content.

## What You Get By Default

- A homepage assembled from YAML sections
- Markdown rendering for text blocks
- Generated pages for linked Markdown and notebook files
- Embedded PDF pages when the PDF extension is enabled
- Asset copying for local images and files
- Search index generation
- Navigation, comments, analytics, and theme support when configured

## The Default Contract

Use this split when you are deciding where something belongs:

| Put it here | When |
|---|---|
| `config.webifier.extensions` | You are enabling or configuring site behavior |
| `config.<instance-name>` | You are overriding one extension for one page |
| reserved page keys | You are changing page chrome, such as title, header, nav, or footer |
| ordinary page keys | You are adding visible sections |
| linked content files | You already have Markdown, notebooks, PDFs, HTML, or assets in the repo |

For example:

```yaml
config:
  markdown:
    toc: false

summary:
  label: Summary
  content: This is visible.
```

`config.markdown` changes Markdown behavior for this page. `summary` renders as
content.

## When To Stay With Defaults

Stay with the default renderer when the goal is to publish clearly, not design a
bespoke frontend. It is a good fit for personal notes, project documentation,
course pages, experiment logs, small reports, and notebook collections.

Next: [Render and Automate](02-render-and-automate.html).

For the complete syntax reference, see [YAML Syntax Specification](reference/01-yaml-syntax.html).
