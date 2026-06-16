---
title: Python Renderers and Resolvers
header:
  title: Python Renderers and Resolvers
  description: Add processing logic when templates alone are not enough.
---

# Python Renderers and Resolvers

Templates are best for presentation. Python extension points are useful when a
site format needs logic: normalizing resume entries, grouping publications,
fetching page data, or turning a folder into a structured page.

## Custom Renderers

```python
from webifier.core.base import RendererModule


class ResumeRenderer(RendererModule):
    template = "renderers/resume.html"
    META_KEYS = frozenset({"kind", "template", "profile", "experience"})
```

Package the renderer inside an extension:

```python
from webifier.core.extensions import Extension


class ResumeExtension(Extension):
    id = "my.resume"
    renderers = {
        "resume": "my_resume.renderers.ResumeRenderer",
    }
    template_dirs = ["/path/to/my_resume/templates"]
```

Expose it through package entry points:

```toml
[project.entry-points."webifier.extensions"]
"my.resume" = "my_resume.extension:ResumeExtension"
```

Then enable it in a site:

```yaml
webifier:
  extensions:
    resume:
      uses: my.resume
```

```yaml
profile:
  kind: resume
```

## Custom Resolvers

Resolvers compute values inside YAML:

```python
def year(value, ctx):
    return value[:4]
```

Register them through an extension:

```python
from webifier.core.extensions import Extension


class DatesExtension(Extension):
    id = "my.dates"
    resolvers = {
        "year": "my_dates.resolvers.year",
    }
```

```yaml
published: ${year:2026-06-13}
```

Extensions are configured before interpolation, so custom resolvers can be used
in the same site file that enables them.

For full details, see [Resolver System](reference/02-resolvers.html) and
[Extension and Customization Guide](reference/04-extension-guide.html).
