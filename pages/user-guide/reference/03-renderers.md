---
title: Renderer / Kind System
header:
  title: Renderer / Kind System
  description: How Webifier dispatches YAML nodes to renderers and templates.
---

# Renderer / Kind System

The renderer system is the node-level extension mechanism. Every YAML block is
processed and rendered by a **renderer** selected via the `kind` key. Renderers
are Python classes, Jinja2 templates, or both.

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [Kind Resolution](#kind-resolution)
- [RendererModule Base Class](#renderermodule-base-class)
- [GenericTemplateRenderer](#generictemplaterenderer)
- [Built-in Renderers](#built-in-renderers)
- [Two-Phase Rendering](#two-phase-rendering)
- [Template Search Path](#template-search-path)
- [META_KEYS — Renderer-Specific Metadata](#meta_keys--renderer-specific-metadata)
- [Registry API](#registry-api)
- [Module File Layout](#module-file-layout)

---

## Core Concepts

A renderer does two things:

1. **Process** — Transform raw YAML data: resolve children, copy assets,
   index for search, etc.
2. **Render** — Produce an HTML fragment from the processed data.

```
YAML data ──▶ renderer.process() ──▶ processed data ──▶ renderer.render() ──▶ HTML
```

Most renderers only need a **Jinja2 template** for the render step. The process
step has a sensible default (recursively process children). Only renderers with
custom data-processing logic need Python.

---

## Kind Resolution

When the framework encounters a node, it resolves the renderer in this order:

```
template: path/to/file.html           ← checked first (inline override)
      │
      └─ Wrap in GenericTemplateRenderer with that file

kind: <name>                          ← checked second (named lookup)
      │
      ├─ 1. Registry lookup
      │     Is <name> registered via @register("name")?
      │     Yes → use that RendererModule class
      │
      ├─ 2. Template lookup
      │     Does "renderers/<name>.html" exist in the Jinja2 search path?
      │     Yes → wrap in GenericTemplateRenderer
      │
      └─ 3. Python import
            Is <name> a dotted path like "mypackage.MyRenderer"?
            Yes → import and instantiate
            No → error with suggestions
```

`template` is the inline escape hatch — use a specific file without
naming or registering anything. `kind` is the named lookup. If neither is
present, config defaults or built-in inference applies.

### Inference (When `kind` Is Omitted)

When `kind` is not specified, the framework infers a default renderer based on
data type. These defaults are **configurable** via `config.defaults`:

| Data shape | Config key | Built-in fallback |
|------------|------------|-------------------|
| Root document (entry point) | `config.defaults.page` | `page` |
| `str` value | `config.defaults.markdown` | `markdown` |
| `list` value | `config.defaults.links` | `links` |
| `dict` value | `config.defaults.section` | `section` |

A user who wants every page to use a custom renderer:

```yaml
# config.yml
config:
  defaults:
    page: my-custom-page
```

Now all pages — root, sub-pages, content pages — use `my-custom-page` without
any `kind:` annotation in the content YAML.

Explicit `kind:` always overrides the configured default:

```yaml
# Most pages use the global default
# But this one is different:
kind: landing-page
title: Welcome
hero: ...
```

---

## RendererModule Base Class

```python
# webifier/core/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import ClassVar, Any
import typing as th

if th.TYPE_CHECKING:
    from webifier.core.builder import Builder


@dataclass
class NodeContext:
    """Immutable context threaded through the processing tree."""
    assets_src_dir: str | None = None
    assets_target_dir: str | None = None
    search_slug: str | None = None
    search_links: bool = False
    search_content: bool = False
    base_dir: str = ""


class RendererModule(ABC):
    """Base class for all renderers.

    Subclasses must set:
    - ``name``: registry shorthand (used with ``@register``)

    Subclasses may set:
    - ``template``: path to a Jinja2 template in the search path
    - ``META_KEYS``: keys that are metadata, not content (skipped by
      default ``process()``)

    Subclasses may override:
    - ``process()``: transform raw data before rendering
    - ``render()``: produce HTML from processed data
    """

    name: ClassVar[str]
    template: ClassVar[str | None] = None
    META_KEYS: ClassVar[frozenset[str]] = frozenset()

    def __init__(self, builder: "Builder"):
        self.builder = builder

    def process(self, data: dict, ctx: NodeContext) -> dict:
        """Transform raw YAML data before rendering.

        Default implementation: recursively process all non-meta values
        via ``builder.process_node()``.
        """
        result = {}
        for key, value in data.items():
            if key == "kind" or key in self.META_KEYS:
                result[key] = value
            else:
                result[key] = self.builder.process_node(value, ctx)
        return result

    def render(self, data: dict, ctx: NodeContext) -> str:
        """Produce an HTML fragment from processed data.

        Default implementation: render ``self.template`` with the data dict.
        Subclasses without a template must override this method.
        """
        if self.template is None:
            raise NotImplementedError(
                f"{type(self).__name__} has no template and does not override render()"
            )
        tmpl = self.builder.env.get_template(self.template)
        return tmpl.render(
            data=data,
            ctx=ctx,
            process=self.builder.process_node,
            markdown=self.builder.render_markdown,
        )
```

### Key Design Decisions

1. **`process()` is optional.** The default recursively processes children.
   Most renderers only need `render()` (or just a template).

2. **`render()` has a default.** If `template` is set, the default `render()`
   loads and renders it. Most renderers only need to set `template`.

3. **`META_KEYS` replaces hardcoded special-key lists.** Each renderer
   declares which keys it considers metadata. The framework has zero
   knowledge of `label`, `title`, `nav`, etc.

4. **Template receives `process` and `markdown` callables.** Templates can
   recursively process child nodes or render inline markdown.

---

## GenericTemplateRenderer

When a `kind` resolves to a template file (step 2 in resolution), the
framework wraps it in a `GenericTemplateRenderer`:

```python
class GenericTemplateRenderer(RendererModule):
    """Auto-created for template-only renderers (no Python class)."""

    META_KEYS = frozenset({"label", "background", "style"})

    def __init__(self, builder: "Builder", template_name: str):
        super().__init__(builder)
        self.template = template_name
```

This means creating a new renderer is as simple as creating a template file:

```
my-site/templates/renderers/gallery.html
```

```yaml
# index.yml
photos:
  kind: gallery          # → finds renderers/gallery.html → GenericTemplateRenderer
  label: Photos
  items:
    - src: img/a.jpg
    - src: img/b.jpg
```

```html
{# templates/renderers/gallery.html #}
<div class="gallery row">
  {% for item in data.items %}
  <div class="col-4">
    <img src="{{ item.src }}" alt="{{ item.alt | default('') }}" class="img-fluid">
  </div>
  {% endfor %}
</div>
```

No Python required.

---

## Built-in Renderers

### Page-Level

| Kind | Class | Template | Purpose |
|------|-------|----------|---------|
| `page` | `PageRenderer` | `page.html` | Full HTML page with head, nav, header, sections, footer |
| `content-page` | `ContentPageRenderer` | `content-page.html` | Content page (for rendered md/notebook) |

### Section-Level

| Kind | Class | Template | Purpose |
|------|-------|----------|---------|
| `section` | `SectionRenderer` | `renderers/section.html` | Default dict container with label + children |
| `freeform` | `FreeformRenderer` | `renderers/freeform.html` | Raw content passthrough (no wrapper) |
| `chapters` | `ChaptersRenderer` | `renderers/chapters.html` | Bootstrap accordion |
| `people` | `PeopleRenderer` | `people.html` | Configurable people card grid |
| `comments` | — | `renderers/comments.html` | Comment system embed (template-only) |
| `experience` | — | `renderers/experience.html` | CV timeline entries (template-only) |
| `publications` | — | `renderers/publications.html` | Publication list (template-only) |
| `inline-experience` | — | `renderers/inline-experience.html` | Compact timeline entries (template-only) |

### Leaf-Level

| Kind | Class | Template | Purpose |
|------|-------|----------|---------|
| `markdown` | `MarkdownRenderer` | — | Render string as markdown (code-only, no template) |
| `links` | `LinksRenderer` | `renderers/links.html` | Render list of link items |
### Template-only Renderers (No Python Class)

Renderers marked with — under Class are pure templates. They have no Python
class — the framework wraps them in `GenericTemplateRenderer` automatically.

To override them, a user just drops a same-named template in their
`templates/renderers/` directory.

---

## Two-Phase Rendering

Section-level renderers produce **inner content HTML**. The page renderer wraps
each section with structural chrome:

```
┌─────────────────────────────────────────────┐
│  Section Wrapper (handled by page renderer) │
│  ┌──────────┐  ┌────────────────────────┐   │
│  │  Label   │  │  Inner Content HTML    │   │
│  │  (auto)  │  │  ← renderer produces  │   │
│  └──────────┘  └────────────────────────┘   │
│  background, style → wrapper HTML           │
└─────────────────────────────────────────────┘
```

The section wrapper is itself a template (`section-wrapper.html`) that users
can override.

This separation means:
- **Section renderers** never worry about labels, backgrounds, or styling.
- **The page renderer** handles all structural layout consistently.
- **Users can override the wrapper** without touching individual renderers.

---

## Template Search Path

Templates are resolved via a Jinja2 `FileSystemLoader` with this search order:

```
1. Site template directory             ← highest priority (overrides)
2. Enabled extension template dirs     ← in config order
```

To override any template, a user creates a file with the same relative path
in their `templates/` directory. The Jinja2 loader finds it first.

### Example: Override People Cards

First-party extension template at:
```
webifier_extensions/people/templates/people.html
```

User creates:
```
my-site/templates/people.html
```

The user's version is found first in the search path. The Python processing
(`PeopleRenderer.process()`) still runs — only the HTML output changes.

---

## META_KEYS — Renderer-Specific Metadata

Each renderer declares which keys it treats as metadata (not recursively
processed as content):

```python
class SectionRenderer(RendererModule):
    name = "section"
    META_KEYS = frozenset({"label", "background", "style"})

class PageRenderer(RendererModule):
    name = "page"
    META_KEYS = frozenset({"title", "nav", "header", "footer", "config", "meta", "search"})

class ExperienceEntry(RendererModule):
    name = "experience"
    META_KEYS = frozenset({"label"})
```

The default `process()` skips `META_KEYS` and `kind` — everything else is
recursively processed. This replaces the old hardcoded
`SPECIAL_INDEX_KEYS` and `SPECIAL_OBJECT_KEYS` lists.

---

## Registry API

### Registering a Renderer

```python
from webifier.core.base import NodeContext
from webifier_extensions.standard.section import SectionRenderer

class GalleryRenderer(SectionRenderer):
    name = "gallery"
    template = "section.html"

    def process(self, data: dict, ctx: NodeContext, builder) -> dict:
        data = dict(data)
        data.setdefault("template", "gallery.html")
        for item in data.get("items", []):
            if "src" in item:
                item["src"] = builder._process_link({"link": item["src"]}, ctx)["href"]
        return super().process(data, ctx, builder)
```

The extension class maps one or more renderer names to that class:

```python
class GalleryExtension(Extension):
    id = "my.gallery"
    renderers = {
        "gallery": "my_gallery.renderer.GalleryRenderer",
        "portfolio": "my_gallery.renderer.GalleryRenderer",
    }
```

Template-only renderers are still possible: register a renderer name to a
template path when no Python preprocessing is needed.

---

## Extension Package Layout

Reusable renderers live in installed extension packages:

```
my_people_extension/
  __init__.py
  extension.py             # PeopleExtension class
  renderer.py              # PeopleRenderer class
  assets/
    people.css
  templates/
    people.html
```

The package exposes an entry point:

```toml
[project.entry-points."webifier.extensions"]
"my.people" = "my_people_extension.extension:PeopleExtension"
```

The extension class declares template directories, asset mounts, and renderer aliases.
For renderers that need no Python, a site can still add
`renderers/<name>.html` directly in its own template directory.

---

## Template Context Variables

Every renderer template receives these variables:

| Variable | Type | Description |
|----------|------|-------------|
| `data` | `dict` | The processed data dict (all children already rendered) |
| `ctx` | `NodeContext` | Processing context (assets dirs, search config, etc.) |
| `process` | `callable` | `builder.process_node()` — for manually processing child data |
| `markdown` | `callable` | `builder.render_markdown()` — for inline markdown rendering |

Additionally, the page-level template receives page-specific variables
(baseurl, global nav, etc.) passed directly by the page renderer.

### Example Template

```html
{# renderers/experience.html #}
<div class="container-fluid">
  {% for key, value in data.items() if key not in ("label", "kind") %}
  <div class="row my-0">
    <div class="col-12 col-md-4">
      {% if value.heading.institution %}
      <h5 class="mb-0 text-center">{{ value.heading.institution }}</h5>
      {% endif %}
      {% if value.heading.role %}
      <p class="text-center mb-0 fw-light">{{ value.heading.role }}</p>
      {% endif %}
      {% if value.heading.date %}
      <p class="text-muted small mb-0">{{ value.heading.date }}</p>
      {% endif %}
    </div>
    {% if value.content %}
    <div class="col-12 col-md-8">{{ value.content }}</div>
    {% endif %}
  </div>
  {% if not loop.last %}<hr class="mx-4">{% endif %}
  {% endfor %}
</div>
```
