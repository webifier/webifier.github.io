---
title: YAML Syntax Specification
header:
  title: YAML Syntax Specification
  description: The complete source format for Webifier sites.
---

# YAML Syntax Specification

This document defines the complete YAML syntax for Webifier sites.

---

## Table of Contents

- [Minimal Example](#minimal-example)
- [Document Structure](#document-structure)
- [Framework Directives](#framework-directives)
  - [`kind` — Renderer Dispatch](#kind--renderer-dispatch)
  - [`patch` — Structural Merge](#patch--structural-merge-hydra-inspired)
    - [`@location` — Target Placement](#location--target-placement)
    - [`!modifier` — Interpretation Control](#modifier--interpretation-control)
  - [`defaults` — Sibling Defaults](#defaults--sibling-defaults)
  - [`${}` — Value Interpolation](#--value-interpolation)
- [Node Types and Inference](#node-types-and-inference)
- [Links](#links)
- [Content Files](#content-files)
  - [Markdown Files](#markdown-files)
  - [Notebook Files](#notebook-files)
- [Built-in Renderer Keys](#built-in-renderer-keys)
  - [Page Renderer](#page-renderer)
  - [Section Renderer](#section-renderer)
  - [Links Renderer](#links-renderer)
  - [Experience Renderer](#experience-renderer)
  - [Publications Renderer](#publications-renderer)
  - [People Renderer](#people-renderer)
  - [Chapters Renderer](#chapters-renderer)
  - [Comments Renderer](#comments-renderer)
  - [Freeform Renderer](#freeform-renderer)

---

## Minimal Example

```yaml
# index.yml — the simplest possible site
title: My Site

hello:
  content: |
    # Hello World
    This is my site.
```

This produces a single-page site with one section containing rendered markdown.
No `kind`, no `${}`, no configuration required.

---

## Document Structure

A webifier site starts from a root `index.yml`. The root document is rendered by
the **page** renderer, which expects page-level keys (`title`, `nav`, `header`,
etc.) and treats all other keys as **sections**.

```yaml
# index.yml
title: My Site                    # page renderer key
nav: ...                         # page renderer key
header: ...                      # page renderer key
config: ...                      # page renderer key

bio:                             # section (key = id, rendered by section renderer)
  label: About
  content: Hello world

work:                            # another section
  kind: experience               # explicit renderer
  label: Experience
  ...
```

Each section value is dispatched to a renderer based on its `kind` (or inferred
from its data type). Sections are rendered in YAML source order.

---

## Framework Directives

The framework recognizes exactly five mechanisms. Everything else is
renderer-specific data.

### `kind` — Renderer Dispatch

```yaml
kind: <name>
```

Determines which renderer processes and renders this node. Resolution order:

1. **Registry** — Is `<name>` a registered built-in or plugin renderer?
2. **Template** — Does `renderers/<name>.html` exist in the Jinja2 search path?
3. **Python import** — Is `<name>` a dotted Python path to a `RendererModule`?

If `kind` is omitted, the framework infers the renderer from the data type,
using the configurable defaults from `config.defaults` (with built-in
fallbacks):

| Data type | Config key | Built-in fallback |
|-----------|------------|-------------------|
| Root document / sub-page | `config.defaults.page` | `page` |
| `dict` | `config.defaults.section` | `section` |
| `list` | `config.defaults.links` | `links` |
| `str` | `config.defaults.markdown` | `markdown` |

This means a user can change the default rendering for the entire site
without annotating every YAML file:

```yaml
# config.yml — all pages use "my-page" renderer, all sections use "card-section"
config:
  defaults:
    page: my-page
    section: card-section
```

Explicit `kind:` in any YAML file always overrides the configured default.

Examples:

```yaml
# Explicit kind
publications:
  kind: publications
  items: ...

# Template-only kind (resolved via renderers/gallery.html)
photos:
  kind: gallery
  items: ...

# Python class kind (fully qualified import path)
analytics:
  kind: mypackage.renderers.AnalyticsRenderer
  data: ...

# Inferred kind — no annotation needed
bio: |
  # About Me                              # str → markdown renderer
  I am a researcher.

links:                                     # list → links renderer
  - src: page1.md
    text: Page 1

about:                                     # dict → section renderer
  label: About
  content: Hello
```

### `template` — Inline Template Override

```yaml
template: <path-to-template-file>
```

Points directly to a Jinja2 template file for this node. No registration,
no naming convention — just a file path. This is the escape hatch for
one-off custom rendering.

```yaml
# A page with its own template
template: templates/landing.html
title: Welcome
hero:
  image: hero.jpg

# A section with a custom template
work:
  template: templates/experience-timeline.html
  label: Experiences
  huawei:
    heading: Huawei
    content: ...
```

`template` takes precedence over `kind` and over config defaults. It uses a
`GenericTemplateRenderer` wrapping the specified file — the template receives
the same variables as any renderer template (`data`, `ctx`, `process`,
`markdown`).

The path is relative to the site root (where `webify` is run).

**Precedence:**

```
1. template: path          ← most specific, uses this exact file
2. kind: name              ← named renderer lookup
3. config.defaults.<type>  ← site-wide default
4. Built-in fallback       ← page / section / markdown / links
```

### `patch` — Structural Merge (Hydra-inspired)

```yaml
patch[@LOCATION][!MODIFIER]: <value>
```

Loads content and merges it into the data tree. Uses Hydra-inspired `@`
syntax for target placement and `!` syntax for interpretation control.

**Full grammar:**

```
patch                     # merge loaded dict here (auto-detect format)
patch@KEY                 # place content under KEY
patch@KEY.SUB             # place content under KEY → SUB (nested)
patch!MODIFIER            # override format detection
patch@KEY!MODIFIER        # both location and modifier
```

**Basic — merge here:**

```yaml
config:
  patch: config.yml                # loads config.yml, merges keys here
  analytics_id: OVERRIDE           # this wins over config.yml's value
```

**Multiple files (merged in order):**

```yaml
nav:
  patch:
    - base-nav.yml                 # loaded first
    - extra-nav.yml                # merged on top (wins on conflict)
  brand:
    text: My Site                  # explicit key wins over both files
```

**`@location` — target placement:**

```yaml
patch: config.yml                  # merge config dict here
patch@nav: nav.yml                 # merge nav dict under "nav" key
patch@nav.links: links.yml         # merge under nav → links (nested)
patch@content: bio.md              # text → sets "content" key
```

**Multiple patches at one level:**

```yaml
patch: config.yml                  # merge config dict here
patch@nav: nav.yml                 # merge into "nav" key
patch@content: bio.md              # text → "content" key
title: My Site                     # explicit key, wins over patched values
```

**`!modifier` — interpretation control:**

By default, the file extension determines how a value is loaded. The format
is auto-detected via an extensible registry (see ``register_format``).
Append `!modifier` to override:

| Modifier | Meaning |
|----------|---------|
| *(omitted)* / `!auto` | Auto-detect from extension (default) |
| `!yaml` | Force-load as YAML regardless of extension |
| `!text` | Force-load as plain text regardless of extension |
| `!value` | Use value literally — **no** file loading |

Examples:

```yaml
# Force a .txt file to be parsed as YAML
patch!yaml: data.txt

# Read a .yml file as raw text (don't parse)
patch@content!text: template.yml

# Literal value — no file loading
patch@title!value: My Website
patch@debug!value: true
patch@items!value:
  - one
  - two
  - three

# Combining location + modifier
patch@nav!yaml: navigation.txt     # force-load nav from non-.yml file

# Deep nesting with literal value
patch@a.b.c!value: 42              # creates a → b → c = 42
```

**Extensible format registry:**

The auto-detection is backed by an extensible registry. Extensions can register
new file formats:

```python
from webifier.core.loader import register_format

def load_toml(path):
    import tomllib
    with open(path, "rb") as f:
        return tomllib.load(f)

register_format(".toml", load_toml)
```

Built-in registered extensions: `.yml`, `.yaml` (YAML), `.md`, `.markdown`,
`.txt`, `.html`, `.css`, `.js`, `.json` (text).

**Rules:**

- Patch directives are resolved depth-first during the load phase.
- YAML → dict merge (explicit keys win).
- Non-dict content (text, scalars, lists via `!value`) is placed at
  the `@location` or merged at the current level.
- All `patch` keys are removed from the dict after resolution.
- Multiple `patch` entries are merged left-to-right in YAML order;
  later patches override earlier ones.
- Explicit (non-patch) keys always win over patched values.

### `defaults` — Sibling Defaults

```yaml
parent:
  defaults:
    key: value
  child_a: { ... }                 # gets key: value if not already present
  child_b: { ... }                 # same
```

Applies default key-value pairs to every sibling dict that doesn't already
define them.

```yaml
education:
  label: Education
  defaults:
    kind: experience
    label: false

  sharif:                          # gets kind: experience, label: false
    content: ${load:sharif.md}

  uoft:                            # gets kind: experience, label: false
    content: ${load:uoft.md}

  cambridge:
    label: Cambridge               # explicit label wins, kind: experience still applied
    content: ${load:cambridge.md}
```

**Rules:**

- `defaults` is resolved after `patch` and before `${}`.
- Only applied to sibling values that are dicts.
- Explicit keys in the child always win.
- `defaults` is removed from the dict after application.
- Non-dict siblings are left untouched.

### `${}` — Value Interpolation

```yaml
key: ${resolver:arg}
key: ${resolver:arg | transform:arg | transform:arg}
key: "Text with ${interpolation} inside"
```

OmegaConf-style value resolution. See [02-resolvers.md](02-resolvers.html) for
the complete resolver reference.

**Full-value resolution** — the entire value is `${...}`:

```yaml
items: ${glob:publications/*.yml | sort:-year}
# → items becomes the sorted list of loaded dicts
```

**String interpolation** — `${...}` embedded in a larger string:

```yaml
footer: "© 2026 ${title}"
# → footer becomes "© 2026 John Doe"
```

**Pipes** — chain resolvers with `|`:

```yaml
items: ${glob:posts/*.yml | filter:draft!=true | sort:-git | limit:10}
# → load all posts, exclude drafts, sort by git date, take first 10
```

**Nesting not supported** — keep it flat and readable.

---

## Node Types and Inference

The framework recognizes four node types. When `kind` is omitted, the type is
inferred from the YAML data shape.

### String → Markdown

```yaml
bio: |
  # About Me
  I am a researcher at **UofT**.
```

Strings are rendered to HTML via the markdown pipeline.

### List → Links

```yaml
resources:
  - src: paper.pdf
    text: Download Paper
  - href: https://github.com/user/repo
    text: Source Code
    icon: fab fa-github
```

Lists are rendered as collections of link items. See [Links](#links).

### Dict → Section

```yaml
about:
  label: About Me
  content: |
    Hello world
```

Dicts without an explicit `kind` are rendered as labeled sections. Child values
are recursively dispatched.

### Root Document → Page

The document loaded from the CLI entry point is always rendered as a page.
Sub-pages (loaded via `src: subdir/` in links) are also rendered as pages.

---

## Links

Links are the leaf items in a list. Each link has a **source** and optional
decoration.

### Local Resources — `src`

The `src` key points to a local file or directory. The file extension determines
processing:

```yaml
- src: courses.md                  # .md → render markdown page, link to it
  text: Course List

- src: analysis.ipynb              # .ipynb → render notebook page, link to it
  text: Analysis

- src: papers/                     # directory → load papers/index.yml as sub-page
  text: Papers

- src: cv.pdf                      # .pdf → copy to output, link to it
  text: Download CV
```

| Extension | Processing |
|-----------|------------|
| `.md` | Render to HTML content page |
| `.ipynb` | Convert notebook to HTML content page |
| `.yml`, `.yaml`, or directory `/` | Build as sub-page (recursive) |
| `.pdf` | Copy to output assets |
| Other | Copy to output assets |

### External URLs — `href`

```yaml
- href: https://github.com/user/repo
  text: GitHub
  icon: fab fa-github
```

### Decoration Keys

These are all optional:

| Key | Type | Purpose |
|-----|------|---------|
| `text` | `str` | Display text for the link |
| `description` | `str` | Description (rendered as markdown) |
| `image` | `str` or `{src, alt, ...}` | Thumbnail image |
| `icon` | `str` | FontAwesome icon class |
| `kind` | `str` | Display label for search/UI (e.g., "PDF", "Course") |

### Person Links

```yaml
- kind: person
  name: Jane Doe
  image: team/jane.jpg
  bio: Professor of Computer Science
  contact:
    - href: mailto:jane@example.com
      icon: fas fa-envelope
    - href: https://github.com/janedoe
      icon: fab fa-github
```

---

## Content Files

### Markdown Files

Markdown files (`.md`) can optionally include a YAML page preface:

```markdown
---
title: Course List
nav:
  content:
    - src: ../
      text: Back to Education
header:
  title: Course List
---

# Undergraduate Courses

- **CS 101** — Introduction to Programming
- **CS 201** — Data Structures
```

The page preface keys use the same shape as a normal YAML page. Reserved keys
such as `title`, `header`, `nav`, `footer`, `meta`, `style`, and `config`
control the generated page. Any other keys render as sections after the
Markdown body.

If no page preface is present, the file is rendered as a simple content page
with default page data.

### Notebook Files

Jupyter notebooks (`.ipynb`) are converted to HTML via nbconvert. Page data can
be provided as a YAML page preface in the first Markdown cell:

```markdown
---
title: Notebook Report
header:
  title: Notebook Report
nav: false
config:
  theme:
    default: light
---

# Visible notebook content starts here
```

If the first Markdown cell contains only the YAML preface, the cell is removed
from the rendered notebook. If it contains content after the closing `---`, that
content remains visible.

---

## Built-in Renderer Keys

Each built-in renderer defines which keys it understands. These are not
framework concepts — they are renderer-specific. Users can override any
renderer and define different keys.

### Page Renderer

**Kind:** `page` (implicit for root documents and sub-pages)

| Key | Type | Purpose |
|-----|------|---------|
| `title` | `str` | Page title (used in `<title>` tag) |
| `nav` | `dict` or `false` | Navigation bar configuration |
| `header` | `dict` | Hero header block |
| `footer` | `dict` | Footer block |
| `config` | `dict` | Site-wide configuration |
| `meta` | `list` | HTML `<meta>` tags |
| `search` | `bool` or `dict` | Search indexing configuration |

All other keys are treated as **sections**, rendered in source order.

**`nav` structure:**

```yaml
nav:
  brand:                           # optional brand/logo link
    text: Site Name
    href: /
    image: logo.png
  content:                         # main nav links
    - src: about/
      text: About
    - src: blog/
      text: Blog
  fixed:                           # always-visible links (e.g., social)
    - href: https://github.com/user
      icon: fab fa-github
    - href: mailto:user@example.com
      icon: fas fa-envelope
```

**`header` structure:**

```yaml
header:
  title: Welcome
  description: A short tagline
  background: images/hero.jpg      # optional background image
```

**`footer` structure:**

```yaml
footer:
  text: "© 2026 John Doe"
  background: images/footer.jpg    # optional background image
```

**`config` structure:**

```yaml
config:
  webifier:
    extensions:
      site:
        uses: webifier.standard
      search:
        uses: webifier.search
        content: true              # index page content for search
        links: true                # index links for search
      analytics:
        uses: webifier.analytics.google
        measurement_id: G-XXXXXXXXXX
  defaults:                        # override inferred kind defaults
    page: my-page                  # default renderer for pages (default: "page")
    section: my-section            # default renderer for dicts (default: "section")
    markdown: my-markdown          # default renderer for strings (default: "markdown")
    links: my-links                # default renderer for lists (default: "links")
```

The `defaults` key lets you change the renderer used when `kind` is **not**
explicitly specified. This applies site-wide — every page, section, string,
and list uses the configured default unless overridden with an explicit `kind`.
Omitted entries fall back to the built-in names.

### Section Renderer

**Kind:** `section` (default for dicts)

| Key | Type | Purpose |
|-----|------|---------|
| `label` | `str`, `false`, or `{text, position}` | Section heading |
| `background` | `str` | Background image URL |
| `style` | `str` | Inline CSS for the section wrapper |

All other keys are treated as **child content**, recursively dispatched.

**`label` variants:**

```yaml
# Simple string
label: Education

# Disabled
label: false

# Positioned
label:
  text: Education
  position: top                    # left (default), top, bottom
```

### Links Renderer

**Kind:** `links` (default for lists)

Renders a list of link items. See [Links](#links) for item syntax.

### Resume Experience Renderer

**Kind:** `resume.experience`

First-party renderer for timeline/CV entries. Each entry uses a semantic
`heading` object. `expanded_heading` is optional and defaults to `heading`.

| Key (section) | Type | Purpose |
|-----|------|---------|
| `defaults.compact` | `bool` | Default compact/full-layout toggle behavior for entries |
| `horizontal` | `bool` | Render entries as horizontally scrollable cards |
| `inline` | `bool` | Render a dense divider-free stack; desktop uses `role - institution` with `location • date` on the right |

| Key (per entry) | Type | Purpose |
|-----|------|---------|
| `heading.institution` | `str` | Organization, school, event, or course name |
| `heading.role` | `str` | Role, position, degree, or short subtitle |
| `heading.details` | `str` | Optional extra heading context |
| `heading.date` | `str` | Date or term |
| `heading.location` | `str` | Optional location |
| `expanded_heading` | `dict` | Optional detail-context override; `details` is shown above expanded content |
| `compact` | `bool` | Per-entry override; `true` shows a summary that can toggle into the full entry layout, `false` renders the full layout inline |
| `content` | `str` | Markdown body |
| `no_line` | `bool` | Suppress divider line after entry |

```yaml
work:
  kind: resume.experience
  label: Experiences
  inline: true
  defaults:
    compact: true
  huawei:
    heading:
      institution: Huawei Technologies
      role: Research Intern
      date: Summer 2021
      location: Shanghai, China
    content: |
      Worked on neural architecture search.
  samsung:
    compact: false
    heading:
      institution: Samsung Research
      role: AI Engineer
      date: 2020–2021
    content: |
      Developed on-device ML models.
```

### Publications Renderer

**Kind:** `publications`

| Key (per entry) | Type | Purpose |
|-----|------|---------|
| `title` | `str` | Publication title |
| `authors` | `list` | Author list (see below) |
| `authors_notes` | `str` | Note after author list (e.g., "equal contribution") |
| `tags` | `str` | Markdown-rendered action buttons (links to paper, code, etc.) |
| `content` | `str` | Additional description |

**Author format:**

```yaml
authors:
  - me: John Doe                   # highlighted as "me"
    link: https://johndoe.com
  - name: Jane Smith               # regular co-author
    link: https://janesmith.com
  - Some Person                    # plain string (no link)
```

### People Renderer

**Kind:** `people`

Renders a grid of person cards.

| Key | Type | Purpose |
|-----|------|---------|
| `content` | `list` | List of person dicts |

Each person dict:

| Key | Type | Purpose |
|-----|------|---------|
| `name` | `str` | Person's name |
| `image` | `str` | Profile photo path |
| `bio` | `str` | Short bio (markdown) |
| `contact` | `list` | List of contact links |

### Chapters Renderer

**Kind:** `chapters`

Renders content as a Bootstrap accordion.

| Key | Type | Purpose |
|-----|------|---------|
| `content` | `list` | List of chapter dicts, each with `title` and child content |

### Comments Renderer

**Kind:** `comments`

Embeds a comment system (e.g., Disqus, utterances).

### Freeform Renderer

**Kind:** `freeform`

Passes content through without any section wrapper (no label div, no
background, no padding). Useful for full-width custom HTML.

| Key | Type | Purpose |
|-----|------|---------|
| `content` | `str` | Raw HTML content (rendered as-is) |

---

## Key Conventions

### Structural Keys

Some keys are structural transforms that run while YAML is loaded:

- `patch` (with optional `@location` and `!modifier`) — structural merge
- `defaults` — sibling defaults
- `_source` — injected by `glob` resolver (file path data, stripped before rendering)

### Renderer And Extension Keys

After loading, keys are passed to renderers and extensions. The active syntax is
therefore controlled by the extensions you enabled:

- `webifier.standard` defines page controls such as `title`, `header`, `nav`,
  `footer`, `meta`, `style`, and `config`.
- Renderers define their own reserved keys such as section `label`,
  `background`, `kind`, or `template`.
- Extensions can consume page-level keys before ordinary section rendering, so a
  future `weather` or `change_log` key can belong to an extension instead of
  becoming visible content.
- Everything not consumed by an extension or reserved by the active renderer is
  normal renderer data.

### `kind` and `template`

`kind` and `template` are the common renderer dispatch controls. `kind` chooses
a registered renderer, while `template` selects a Jinja template for the current
page or section.
