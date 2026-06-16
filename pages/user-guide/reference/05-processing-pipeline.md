---
title: Processing Pipeline
header:
  title: Processing Pipeline
  description: The full path from YAML source to generated HTML.
---

# Processing Pipeline

This document describes the complete processing pipeline from YAML source to
HTML output. Each phase is independent, composable, and has clear inputs and
outputs.

---

## Table of Contents

- [Pipeline Overview](#pipeline-overview)
- [Phase 1 — Parse](#phase-1--parse)
- [Phase 2 — Patch](#phase-2--patch)
- [Phase 3 — Defaults](#phase-3--defaults)
- [Phase 4 — Interpolate](#phase-4--interpolate)
- [Phase 5 — Consume Page Keys](#phase-5--consume-page-keys)
- [Phase 6 — Dispatch & Render](#phase-6--dispatch--render)
- [Phase 7 — Output](#phase-7--output)
- [Builder — The Orchestrator](#builder--the-orchestrator)
- [Recursion & Sub-Pages](#recursion--sub-pages)
- [Search Indexing](#search-indexing)
- [Asset Pipeline](#asset-pipeline)
- [Error Handling](#error-handling)

---

## Pipeline Overview

```
                     ┌──────────────┐
  index.yml ────────▶│  1. Parse    │──▶ raw YAML dict
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  2. Patch    │──▶ all patch directives resolved (files loaded, merged)
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  3. Defaults │──▶ all defaults applied
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  4. Interp.  │──▶ all ${} resolved (refs, env, glob, pipes)
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  5. Consume  │──▶ extension-owned page keys removed
                     │  Page Keys   │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  6. Dispatch │──▶ kind → renderer.process() → renderer.render()
                     │  & Render    │    produces HTML fragments, triggers sub-pages
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  7. Output   │──▶ .html files, search.json, copied assets
                     └──────────────┘
```

Phases 1–4 are **pure data transforms** — no rendering, no side effects, no
file output. Extension configuration happens before rendering, then page-key
consumers remove extension-owned controls before normal section rendering.

---

## Phase 1 — Parse

**Input:** YAML file path
**Output:** Raw Python dict/list

```python
data = yaml.safe_load(open(path))
```

Standard YAML parsing. No custom tags, no constructors. The YAML file is
a plain document — all webifier-specific syntax (`${}`, `patch`, `defaults`,
`kind`) is handled in subsequent phases.

### Page Prefaces in Markdown

Markdown files may have a YAML page preface delimited by `---`:

```markdown
---
title: My Page
nav: ...
---

# Content here
```

The parser splits the page preface from the body.

The same page-data contract is used by Markdown pages, notebook first-cell YAML
prefaces, PDF sibling `page.yml` files, and normal YAML pages:

```yaml
title: My Page
header:
  title: My Page
  description: Page header text.
config:
  content_pages:
    toc: true
  markdown:
    toc: true

authors:
  kind: people
  content:
    - name: Ada Lovelace
      role: Author
```

Reserved keys such as `title`, `header`, `nav`, `footer`, `meta`, `style`, and
`config` control the generated page and are not rendered as ordinary content.
Other keys are treated like regular Webifier sections and are rendered after the
content body.

`config` is the page-local override layer. During rendering, Webifier deep-merges
extension defaults, root site config, and page-local config, then passes that
merged object to renderers and hooks.

---

## Phase 2 — Patch

**Input:** Raw dict with potential `patch` keys
**Output:** Dict with all `patch` directives resolved and removed

The patch phase walks the entire data tree **depth-first** and resolves
`patch` directives.  Patch keys follow the grammar:

```
patch[@LOCATION][!MODIFIER]
```

### Algorithm

```
function resolve_patches(data, base_dir):
    if data is dict:
        patch_keys = [k for k in data if is_patch_key(k)]
        for pkey in patch_keys:
            location, modifier = parse_patch_key(pkey)
            loaded = load_patch(data[pkey], modifier)
            if location:
                place_at_path(merged, location, loaded)
            else:
                merge_here(merged, loaded)
        # explicit keys always win over patched values
        for key in non_patch_keys:
            merged[key] = resolve_patches(data[key])
    return merged
```

### Patch Spec Variants

```yaml
# Single YAML file — loads and deep-merges
patch: config.yml

# Single non-YAML file — becomes string content
patch@content: bio.md

# Multiple files — merged left-to-right
patch:
  - base.yml
  - overrides.yml

# @location — nested placement
patch@nav: nav.yml
patch@nav.links: links.yml

# !modifier — interpretation control
patch!yaml: data.txt               # force YAML
patch@title!value: My Site          # literal value
```

### Merge Rules

| Patch type | Explicit keys in parent | Result |
|---|---|---|
| YAML dict | Present | Explicit keys win (shallow merge) |
| YAML dict | Absent | Patch keys used |
| Non-YAML (string) | — | Value becomes the string |
| Glob (list) | — | Value becomes the list |

### Depth-First Order

Children are resolved before parents. This means a patched file can itself
contain `patch` directives:

```yaml
# index.yml
education:
  patch: education/section.yml

# education/section.yml
patch: defaults.yml              # resolved first
label: Education
sharif:
  patch: sharif.yml              # resolved second
```

---

## Phase 3 — Defaults

**Input:** Dict with potential `defaults` keys
**Output:** Dict with `defaults` applied and removed

### Algorithm

```
function apply_defaults(data):
    if data is dict and "defaults" in data:
        defaults = data.pop("defaults")
        for key, value in data:
            if value is dict and defaults is dict:
                data[key] = {**defaults, **value}     # explicit wins
    # recurse into children
    for key, value in data:
        data[key] = apply_defaults(value)
    return data
```

### Example

```yaml
# Before defaults
education:
  defaults:
    kind: experience
    label: false
  sharif:
    content: "..."
  uoft:
    label: UofT
    content: "..."

# After defaults
education:
  sharif:
    kind: experience              # from defaults
    label: false                  # from defaults
    content: "..."
  uoft:
    kind: experience              # from defaults
    label: UofT                   # explicit wins
    content: "..."
```

### Rules

- `defaults` only applies to **sibling** values that are dicts.
- Non-dict siblings (strings, lists) are left untouched.
- Explicit keys in the child always win over defaults.
- `defaults` is removed from the dict after application.
- Applied **after** `patch` so patched-in children also receive defaults.

---

## Phase 4 — Interpolate

**Input:** Dict with potential `${...}` values
**Output:** Fully resolved dict (all `${...}` expanded)

### Algorithm

```
function resolve_interpolations(data, root, base_dir):
    if data is str:
        if data matches /^\$\{.+\}$/:
            return resolve_expression(data, root, base_dir)     # full value
        elif data contains "${":
            return data.replace_each("${...}", resolve_and_stringify)  # inline
    if data is dict:
        return {k: resolve_interpolations(v, root, base_dir) for k, v in data}
    if data is list:
        return [resolve_interpolations(item, root, base_dir) for item in data]
    return data
```

### Expression Parsing

```
${resolver:arg | transform:arg | transform:arg}

Split on " | " (space-pipe-space):
  → ["resolver:arg", "transform:arg", "transform:arg"]

For each segment, split on first ":":
  → (name, arg)

Execute in sequence, threading output as input to next.
```

### Resolution Order

Interpolation happens **after** `patch` and `defaults`, so:

- Values brought in via `patch` are available for `${ref:...}`.
- Default values from `defaults` are available for `${...}`.
- Cross-references resolve against the fully patched and defaulted document.

### Circular Reference Detection

The resolver tracks which paths are currently being resolved. If a path is
encountered again during its own resolution, a `CircularReferenceError` is
raised:

```
CircularReferenceError: Circular reference detected:
  header.title → nav.brand.text → header.title
```

---

## Phase 5 — Consume Page Keys

**Input:** Resolved page dict plus enabled extension instances
**Output:** Page dict with extension-owned keys removed

Before top-level page rendering, Webifier lets extensions consume page keys
they explicitly registered. This keeps the page syntax extensible without
making every renderer know about every possible extension.

```python
for key in page.keys():
    if extension_manager.has_page_key_consumer(key):
        consumer = extension_manager.consumer_for(key)
        value = page.pop(key)
        consumer(builder, key=key, value=value, page=page, config=page_config)
```

For example:

```yaml
title: Field Notes
weather: cloudy
summary:
  content: This still renders as a section.
```

If an enabled extension registered `weather`, that key is consumed and removed.
If no extension registered it, `weather` remains ordinary content and the
standard renderer treats it as a section.

Markdown front matter, notebook first-cell prefaces, and PDF `page.yml` files
use the same content-page contract. Their preface keys are consumed before
after-content sections such as `authors` or `comments` are rendered.

## Phase 6 — Dispatch & Render

**Input:** Fully resolved data dict
**Output:** HTML fragments

This is the only phase that produces HTML. The builder dispatches each node
to a renderer based on its `kind` (explicit or inferred).

### Builder Dispatch

```python
class Builder:
    def process_node(self, data, ctx: NodeContext) -> str | dict | list:
        """Universal dispatch — the core loop."""
        if isinstance(data, str):
            kind = self.config_defaults.get("markdown", "markdown")
            return self.render_with(kind, {"content": data}, ctx)
        if isinstance(data, list):
            kind = self.config_defaults.get("links", "links")
            return self.render_with(kind, {"items": data}, ctx)
        if isinstance(data, dict):
            # template (inline file) takes precedence over kind
            if "template" in data:
                tmpl = data.pop("template")
                return self.render_with_template(tmpl, data, ctx)
            kind = data.get("kind", self.config_defaults.get("section", "section"))
            return self.render_with(kind, data, ctx)
        return str(data)

    def render_with(self, kind: str, data: dict, ctx: NodeContext) -> str:
        """Resolve kind → renderer, process, render."""
        renderer_cls = resolve(kind)
        renderer = renderer_cls(self)
        processed = renderer.process(data, ctx)
        return renderer.render(processed, ctx)
```

The `config_defaults` dict comes from `config.defaults` in the root
`config.yml`. If not set, the built-in names are used. This means every
inference point is user-configurable — users can swap out the entire
rendering stack without touching content YAML.

### Dispatch Flow

```
process_node(data)
    │
    ├── str → MarkdownRenderer
    │          process: no-op
    │          render: markdown → HTML
    │
    ├── list → LinksRenderer
    │          process: resolve each link (src/href dispatch)
    │          render: link list template
    │
    └── dict → resolve kind
               │
               ├── kind: page → PageRenderer
               │     process: handle nav, header, footer, process sections
               │     render: full HTML page (page.html)
               │
               ├── kind: section (default) → SectionRenderer
               │     process: recurse into children
               │     render: section with label + children
               │
               ├── kind: experience → GenericTemplateRenderer
               │     process: recurse into children (default)
               │     render: renderers/experience.html
               │
               ├── kind: publications → GenericTemplateRenderer
               │     process: recurse into children (default)
               │     render: renderers/publications.html
               │
               ├── kind: chapters → ChaptersRenderer
               │     process: build each chapter as sub-index
               │     render: accordion template
               │
               ├── kind: people → PeopleRenderer
               │     process: resolve person images, contacts
               │     render: people grid template
               │
               ├── kind: freeform → FreeformRenderer
               │     process: no-op
               │     render: raw content passthrough
               │
               └── kind: <custom> → user renderer or template
```

### Page Rendering

The page renderer is special — it's the top-level orchestrator for a single
HTML page:

1. Extract page data (`title`, `nav`, `header`, `footer`, `config`, `meta`).
2. Process each remaining key as a section.
3. For each section:
   a. Dispatch to the section's renderer → get inner HTML.
   b. Wrap in section chrome (label, background, style) via `section-wrapper.html`.
4. Assemble all wrapped sections into the page template.
5. Write the final HTML file.

### Link Processing

Links in a list are processed based on their keys:

```
link item
    │
    ├── src: *.md → build markdown content page, return link to it
    ├── src: *.ipynb → build notebook content page, return link to it
    ├── src: */ or *.yml → build sub-page (recursive), return link to it
    ├── src: *.pdf → copy to output, return link to it
    ├── src: * → copy to output, return link to it
    ├── href: * → external link (no processing)
    └── kind: person → process as person card
```

---

## Phase 7 — Output

**Input:** Rendered HTML, collected assets, search index
**Output:** Files on disk

### Files Written

| File | Source |
|------|--------|
| `*.html` | Rendered pages (one per index.yml + one per .md/.ipynb link) |
| `search.json` | Aggregated search index |
| `assets/css/*.css` | Core + module CSS files |
| `assets/images/*` | Copied image assets |
| `assets/**` | Any files referenced via `${asset:...}` or `src:` |

### Directory Structure

```
output/
  index.html                    ← root page
  search.json                   ← search index
  assets/
    css/
      main.css
      codehilite.css
      jupyter.css
    images/
      ...
  education/
    index.html                  ← sub-page
    courses.html                ← content page (from .md)
    ta/
      index.html                ← sub-sub-page
  publications/
    ...
```

---

## Builder — The Orchestrator

The `Builder` is a thin dataclass that orchestrates the pipeline and provides
services to renderers:

```python
@dataclass
class Builder:
    base_url: str
    repo_full_name: str
    output_dir: str = ""
    assets_dir: str = "assets"
    templates_dir: str | None = None
    markdown_extensions: tuple = (...)

    # Initialized in __post_init__
    env: jinja2.Environment           # Jinja2 environment (template search path)
    search_index: SearchIndex         # Accumulates search entries
    checked_pages: set                # Prevents duplicate page processing

    def build_site(self, index_path: str):
        """Entry point — builds the entire site from a root index.yml."""
        data = self.load_and_resolve(index_path)
        self.render_with("page", data, NodeContext(base_dir=...))
        self.search_index.save(...)

    def load_and_resolve(self, path: str) -> dict:
        """Phases 1–4: parse, patch, defaults, interpolate."""
        data = parse_yaml(path)
        data = resolve_patches(data, base_dir=dirname(path))
        data = apply_defaults(data)
        data = resolve_interpolations(data, root=data, base_dir=dirname(path))
        return data

    def process_node(self, data, ctx: NodeContext) -> str:
        """Phase 5: dispatch to renderer."""
        ...

    def render_with(self, kind: str, data: dict, ctx: NodeContext) -> str:
        """Phase 5: resolve kind, process, render."""
        ...

    # ── Services for renderers ─────────────────────────

    def render_markdown(self, raw: str, **kwargs) -> str:
        """Render markdown string to HTML."""
        ...

    def resolve_asset(self, path: str, ctx: NodeContext) -> str:
        """Copy asset to output, return resolved URL."""
        ...

    def add_search_content(self, slug, content, **kwargs):
        """Index content for search."""
        ...

    def build_content_page(self, link: dict, ctx: NodeContext) -> dict:
        """Build a content page from a .md or .ipynb link."""
        ...

    def build_subpage(self, link: dict, ctx: NodeContext) -> dict:
        """Build a sub-page from a directory or .yml link."""
        ...
```

### Builder Services

Renderers access the builder for shared functionality:

| Method | Purpose |
|--------|---------|
| `process_node(data, ctx)` | Recursively process a child node |
| `render_with(kind, data, ctx)` | Process + render with a specific kind |
| `render_markdown(raw)` | Convert markdown string to HTML |
| `resolve_asset(path, ctx)` | Copy asset file, return output URL |
| `add_search_content(...)` | Add content to search index |
| `add_search_item(...)` | Add a link item to search index |
| `build_content_page(link, ctx)` | Generate a .md/.ipynb content page |
| `build_subpage(link, ctx)` | Generate a sub-page from index.yml |

---

## Recursion & Sub-Pages

The system is recursive — pages can contain links to sub-pages, which are
themselves full pages:

```
index.yml (root page)
  └─ education/ (sub-page)
       ├─ courses.md (content page)
       └─ ta/ (sub-sub-page)
            └─ ...
```

Each sub-page goes through the full pipeline (load → patch → defaults →
interpolate → dispatch → output) independently. The builder tracks processed
pages to prevent infinite loops.

### Global Context

Sub-pages inherit certain global context from the root:

| Context | Inherited? |
|---------|-----------|
| Base URL | Yes |
| Config (search, analytics) | Yes |
| Global nav | Yes (for consistent navigation) |
| Global footer | Yes |
| Search index | Yes (shared, accumulated) |
| Templates environment | Yes (shared) |

---

## Search Indexing

Search indexing is a **side effect of rendering**, not a separate phase.
Renderers call `builder.add_search_content()` and `builder.add_search_item()`
during their `process()` step.

```python
class LinksRenderer(RendererModule):
    def process(self, data, ctx):
        for link in data["items"]:
            if ctx.search_links and "href" in link:
                self.builder.add_search_item(
                    slug=link["href"],
                    url=link["href"],
                    title=link.get("text", "Link"),
                )
        return data
```

After all rendering is complete, the builder writes `search.json`.

---

## Asset Pipeline

Assets (images, PDFs, custom files) are copied to the output directory on
demand. When a renderer or resolver encounters a local file reference:

1. **Copy** the file to `output/assets/...` (preserving relative path).
2. **Return** the base-URL-prepended path for use in HTML.

This happens via `builder.resolve_asset()` or the `${asset:...}` resolver.

Enabled extension assets are copied at startup:

```
extension asset mounts → output/assets/...
```

---

## Error Handling

### Phase Errors

Each phase produces clear, actionable errors:

| Phase | Error type | Example |
|-------|-----------|---------|
| Parse | `YAMLParseError` | Malformed YAML syntax |
| Patch | `PatchError` | File not found, merge conflict |
| Defaults | `DefaultsError` | `defaults` value is not a dict |
| Interpolate | `ResolverError` | Unknown resolver, circular reference |
| Dispatch | `KindError` | Unknown kind, no template found |
| Render | `RenderError` | Jinja2 template error |

### Error Context

All errors include:

- **Source file** — which YAML file the error originates from
- **Key path** — dotted path to the problematic value (e.g., `education.sharif.content`)
- **Expression** — the `${}`, `patch`, or `kind` value that failed
- **Suggestion** — when possible, a hint (e.g., "Did you mean 'experience'?")

```
KindError: in index.yml at "work":
  kind: "experiance"
  No renderer found for "experiance".
  Did you mean: experience, inline-experience?
  Available renderers: section, freeform, chapters, people, experience, ...
```
