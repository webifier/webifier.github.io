---
title: Extension & Customization Guide
header:
  title: Extension & Customization Guide
  description: Named extensions, templates, renderers, resolvers, assets, and site features.
---

# Extension & Customization Guide

Webifier extensions are installable Python packages that contribute rendering
behavior to a site. An extension can provide renderers, templates, assets,
themes, resolvers, content handlers, and build hooks.

The public config shape is a named mapping:

```yaml
webifier:
  extensions:
    site:
      uses: webifier.standard

    search:
      uses: webifier.search
      content: true
      links: true

    theme:
      uses: webifier.theme
      default: system
      switcher: true

    resume:
      uses: webifier.resume
```

Each key is a local instance name. `uses` points to the installed extension id.
This lets one extension be used more than once:

```yaml
webifier:
  extensions:
    publications:
      uses: my.collection
      source: papers/

    projects:
      uses: my.collection
      source: projects/
```

YAML order is extension load order. A later extension can replace a registration
from an earlier one only when the instance says `override: true`.

## First-Party Extensions

| Extension | Provides |
|---|---|
| `webifier.standard` | Default page, section, content page, links, freeform renderers, templates, and base assets |
| `webifier.markdown` | Markdown renderer and `.md` / `.markdown` content pages |
| `webifier.notebook` | `.ipynb` content pages |
| `webifier.search` | Search config and `search.json` generation |
| `webifier.theme` | Light/dark/system theme plumbing and theme assets |
| `webifier.analytics.google` | Google tag head injection |
| `webifier.comments` | Utterances comments renderer |
| `webifier.people` | People/profile renderer |
| `webifier.chapters` | Accordion/chapter renderer |
| `webifier.resume` | Resume experience renderer, inline detail toggles, and assets |

## Template Overrides

The template search path starts with your site root, then enabled extension
template directories in config order.

To override a template, put a file with the same relative path in your site:

```text
my-site/
  page.html
  templates/
    publications.html
```

Template-only renderers still work:

```text
my-site/
  renderers/
    gallery.html
```

```yaml
photos:
  kind: gallery
```

## Extension Package Contract

Expose an entry point:

```toml
[project.entry-points."webifier.extensions"]
"my.resume" = "my_resume.extension:ResumeExtension"
```

Expose an `Extension` subclass:

```python
from webifier.core.extensions import AssetMount, Extension


class ResumeExtension(Extension):
    id = "my.resume"
    template_dirs = ["/absolute/path/to/templates"]
    assets = [AssetMount("/absolute/path/to/assets", "assets/webifier/resume")]
    renderers = {
        "resume.experience": "my_resume.renderers.ExperienceRenderer",
    }
    content_renderers = {
        ".bib": "my_resume.content.render_bibliography_page",
    }
    resolvers = {
        "resume_files": "my_resume.resolvers.resume_files",
    }
    hooks = {
        "head": ["my_resume.hooks.render_head"],
        "after_build": ["my_resume.hooks.after_build"],
    }
```

## Extension Fields

| Field | Purpose |
|---|---|
| `id` | Stable installed extension id used by `uses` |
| `dependencies` | Extension ids that must already be enabled |
| `renderers` | `kind` aliases to `RendererModule` classes |
| `content_renderers` | File suffixes or aliases to content-page builders |
| `resolvers` | `${resolver:...}` functions |
| `formats` | Patch/load handlers for file extensions |
| `template_dirs` | Jinja2 template directories |
| `assets` | Asset directories copied into output |
| `hooks` | Optional build or HTML injection hooks |
| `config_key` | Export instance config into `config.<key>` |
| `default_config` | Defaults for that extension instance |
| `config_defaults` | Defaults merged into the site config |

## Useful Hooks

| Hook | Purpose |
|---|---|
| `head` | Return HTML for the page `<head>` |
| `before_build` | Run before the root page is rendered |
| `after_build` | Run after all pages are rendered |

Hook functions receive the builder plus lifecycle keyword arguments. The `head`
hook is page-aware: it runs while that page's `<head>` is being rendered.

Useful `head` hook arguments:

| Argument | Purpose |
|---|---|
| `hook_context` | Stable object with area, builder, page, ctx, config, extension id, instance name, and instance config |
| `page` | The processed page data currently being rendered |
| `ctx` | The current `NodeContext`, including page URL |
| `config` | Global config merged with page-local `config` and Markdown front matter `config` |
| `instance_config` | Config for this named extension instance |
| `baseurl` | Base URL for building asset links |

That means an extension can inject assets only on pages that actually use it:

```python
from markupsafe import Markup


def render_head(builder, *, page=None, baseurl="", instance_config=None, **_):
    if not page_uses_widget(page):
        return ""
    return Markup(f'<script defer src="{baseurl}/assets/widget/widget.js"></script>')
```

Or it can let individual pages opt in through page config:

```markdown
---
title: Interactive notebook
config:
  widget:
    enabled: true
---
```

```python
def render_head(builder, *, config=None, baseurl="", **_):
    widget = (config or {}).get("widget", {})
    if not widget.get("enabled"):
        return ""
    return f'<script defer src="{baseurl}/assets/widget/widget.js"></script>'
```

Head hooks usually return a string; build hooks usually return nothing.

## Content Renderers

Content renderers turn linked files into generated pages. The markdown extension
registers `.md`, `.markdown`, `md`, and `markdown`. The notebook extension
registers `.ipynb` and `notebook`.

```python
def render_report(builder, src, ctx):
    html = convert_report_to_html(src)
    return wrap_in_content_page(builder, html, ctx)
```

Then use a YAML link with `src`:

```yaml
webifier:
  extensions:
    reports:
      uses: my.reports
```

```yaml
- text: Open report
  src: reports/run-001.report
```

## Resume Example

The first-party resume extension registers `kind: resume.experience`:

```yaml
webifier:
  extensions:
    site:
      uses: webifier.standard
    markdown:
      uses: webifier.markdown
    resume:
      uses: webifier.resume
```

```yaml
experience:
  label: Professional Experience
  kind: resume.experience
  inline: true
  defaults:
    compact: true
  stability:
    heading:
      institution: Stability AI
      role: Senior Machine Learning Scientist
      date: Mar. 2025 - Present
      location: Toronto, ON, Canada
    expanded_heading:
      institution: Stability AI
      role: Senior Machine Learning Scientist
      date: Mar. 2025 - Present
      location: Toronto, ON, Canada
    content: |
      - Led model training work.
  earlier_role:
    compact: false
    heading:
      institution: Earlier Company
      role: ML Engineer
      date: 2021 - 2022
      location: Toronto, ON, Canada
    content: |
      - This entry renders inline instead of using the detail toggle.
```

If `content` is missing, the compact toggle is not shown.
Set `defaults.compact: false` to render entries inline by default, or override
individual entries with `compact: true` / `compact: false`.
Compact entries render as short summaries first; the left-side toggle switches
that entry into the full non-compact layout and back again.
Set `inline: true` on the section for a dense divider-free stack where desktop
rows read as `role - institution` with `location • date` aligned to the right.
