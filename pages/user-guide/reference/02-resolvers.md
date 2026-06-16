---
title: Resolver System
header:
  title: Resolver System
  description: Value interpolation, source resolvers, and pipe transforms.
---

# Resolver System

The resolver system provides OmegaConf-style `${...}` value interpolation with
pipe-based chaining. It is the primary mechanism for loading external data,
referencing values, and transforming collections.

---

## Table of Contents

- [Syntax](#syntax)
- [Resolution Modes](#resolution-modes)
- [Pipe Chaining](#pipe-chaining)
- [Built-in Source Resolvers](#built-in-source-resolvers)
- [Built-in Transform Resolvers](#built-in-transform-resolvers)
- [Sort Keys](#sort-keys)
- [Filter Syntax](#filter-syntax)
- [Custom Resolvers](#custom-resolvers)
- [Implementation Notes](#implementation-notes)

---

## Syntax

```
${resolver:argument}
${resolver:arg1,arg2}
${path.to.key}
${resolver:arg | transform:arg | transform:arg}
"Text with ${interpolation} inside"
```

The syntax is modeled after OmegaConf custom resolvers.

---

## Resolution Modes

### Full-Value Resolution

When the **entire** YAML value is a `${...}` expression, the result can be
**any type** — string, dict, list, number, etc.

```yaml
config: ${load:config.yml}
# → config becomes the dict loaded from config.yml

items: ${glob:posts/*.yml | sort:-year}
# → items becomes a sorted list of dicts
```

### String Interpolation

When `${...}` appears **inside** a larger string, each `${...}` is resolved
and converted to a string via `str()`.

```yaml
footer: "© 2026 ${title}"
# → "© 2026 John Doe"

meta_description: "${title} — ${header.description}"
# → "John Doe — PhD Candidate at UofT"
```

Multiple interpolations in one string are supported. The result is always a
string.

---

## Pipe Chaining

Resolvers can be chained with `|`. The output of each resolver becomes the
`input` of the next:

```
${source:arg | transform1:arg | transform2:arg}
      │              │                │
      ▼              ▼                ▼
 produce value → transform it → transform again
```

**Source resolvers** (first in chain): produce a value from nothing.
**Transform resolvers** (subsequent): receive the previous output and transform it.

```yaml
# Load all .yml files, exclude drafts, sort by git commit date, take 10
items: ${glob:posts/**/*.yml | filter:draft!=true | sort:-git | limit:10}
```

Pipes are parsed by splitting on ` | ` (space-pipe-space) to avoid conflicts
with YAML values containing `|`.

---

## Built-in Source Resolvers

### `load` — Load a File

```yaml
config: ${load:config.yml}
bio: ${load:sections/bio.md}
```

Loads a file relative to the current YAML file's directory.

- `.yml` / `.yaml` → parsed as YAML dict/list, recursively resolved
- `.md`, `.html`, `.txt`, other → loaded as string content

If no resolver name is given and the argument contains a `.` with a file
extension or `/`, `load` is assumed:

```yaml
# These are equivalent:
config: ${load:config.yml}
config: ${config.yml}              # shorthand — no resolver name, looks like a path
```

### `glob` — Load Multiple Files

```yaml
items: ${glob:publications/*.yml}
items: ${glob:posts/**/*.yml}      # recursive glob
```

Loads all files matching a glob pattern. Returns a list.

- Each YAML file is loaded as a dict.
- Each non-YAML file is loaded as a string.
- Each loaded dict gets a `_source` source-data key with the file path (stripped
  before rendering).
- Results are sorted by filename by default.

Supports `**` for recursive matching.

### `env` — Environment Variable

```yaml
analytics: ${env:GOOGLE_ANALYTICS_ID}
port: ${env:PORT,8080}             # with default value
debug: ${env:DEBUG,false}
```

Returns the value of an environment variable. An optional second argument
(after comma) provides a default if the variable is unset.

Raises an error if the variable is unset and no default is provided.

### `ref` — Explicit Cross-Reference

```yaml
header:
  title: John Doe

nav:
  brand:
    text: ${ref:header.title}      # → "John Doe"
```

Explicit cross-reference by dotted path. Equivalent to bare path syntax
(`${header.title}`) but unambiguous when the path could be confused with
a filename.

### Bare Path — Cross-Reference (Default)

```yaml
header:
  title: John Doe

footer:
  text: "© 2026 ${header.title}"
```

When `${...}` contains a dotted path with no resolver prefix and it doesn't
look like a file path, it's treated as a cross-reference into the root document.

**Disambiguation rule:**
- Contains `/` or ends with a file extension (`.yml`, `.md`, etc.) → `load`
- Otherwise → cross-reference

```yaml
${header.title}          # cross-reference (no slash, no file extension)
${config.yml}            # load (has .yml extension)
${data/items.yml}        # load (has slash)
${ref:config.yml}        # explicit ref (forces cross-reference even with extension)
${load:header.title}     # explicit load (forces file load even without extension)
```

### `now` — Current Date/Time

```yaml
footer: "Built on ${now:%B %d, %Y}"   # → "Built on March 11, 2026"
year: ${now:%Y}                        # → "2026"
```

Format string follows Python's `strftime` syntax.

### `baseurl` — Prepend Base URL

```yaml
logo: ${baseurl:assets/images/logo.png}
# → "/my-site/assets/images/logo.png" (if base_url is "/my-site")
```

### `asset` — Copy and Resolve Asset

```yaml
photo: ${asset:images/profile.jpg}
```

Copies the file to the output assets directory and returns the resolved URL
(with base URL prepended). Combines file copying with URL generation.

### `md` — Inline Markdown

```yaml
bio_html: ${md:This is **bold** and _italic_}
```

Renders a short markdown string to HTML inline. Useful when a renderer expects
HTML but the source data is markdown.

---

## Built-in Transform Resolvers

Transform resolvers receive the output of the previous resolver in the pipe
chain and return a transformed value.

### `sort` — Sort a List

```yaml
${glob:*.yml | sort:year}          # ascending by field
${glob:*.yml | sort:-year}         # descending (prefix with -)
${glob:*.yml | sort:-year,title}   # multi-key: year desc, then title asc
${glob:*.yml | sort:-git}          # by last git commit date, newest first
```

See [Sort Keys](#sort-keys) for all available sort keys.

### `reverse` — Reverse a List

```yaml
${glob:*.yml | sort:year | reverse}
```

### `limit` — Take First N Items

```yaml
${glob:*.yml | sort:-year | limit:5}
```

### `offset` — Skip First N Items

```yaml
${glob:*.yml | sort:-year | offset:10 | limit:10}   # "page 2"
```

### `filter` — Keep Matching Items

```yaml
${glob:*.yml | filter:status=published}
${glob:*.yml | filter:lang=en,status=published}      # AND conditions
${glob:*.yml | filter:image}                          # key exists
```

See [Filter Syntax](#filter-syntax) for details.

### `exclude` — Remove Matching Items

```yaml
${glob:*.yml | exclude:draft=true}
${glob:*.yml | exclude:draft}                         # key exists → remove
```

Inverse of `filter`.

### `group` — Group by Field

```yaml
${glob:*.yml | group:year}
# → {"2024": [...], "2025": [...], "2026": [...]}
```

Returns a dict of lists, keyed by the field value. Useful with custom
renderers that display grouped content.

### `flatten` — Flatten Nested Lists

```yaml
${glob:**/*.yml | flatten}
```

### `unique` — Deduplicate by Field

```yaml
${glob:*.yml | unique:title}
```

Keeps the first occurrence of each unique field value.

### `map` — Extract Fields

```yaml
${glob:*.yml | map:title}
# → ["Title 1", "Title 2", ...]

${glob:*.yml | map:title,src}
# → [{"title": "T1", "src": "..."}, ...]
```

Single field: returns a list of values.
Multiple fields: returns a list of dicts with only those fields.

### `count` — Return Length

```yaml
total: ${glob:posts/*.yml | count}
# → 42
```

---

## Sort Keys

The `sort` transform supports these sort keys:

### Data Field Keys

Any key name refers to a field in the loaded data:

```yaml
${glob:*.yml | sort:year}          # sort by the "year" field
${glob:*.yml | sort:title}         # sort by the "title" field
${glob:*.yml | sort:meta.order}    # sort by nested field (dotted path)
```

### File Metadata Keys

| Key | Meaning |
|-----|---------|
| `name` | Source filename (alphabetical) |
| `modified` | File modification time (OS stat) |

### Git Sort Keys

| Key | Meaning |
|-----|---------|
| `git` | Last git commit date (committer date) — default |
| `git:committed` | Last git committer date (same as `git`) |
| `git:authored` | Last git author date |
| `git:created` | First git commit date (file creation in git history) |

```yaml
# Blog posts sorted by last update
${glob:posts/*.yml | sort:-git}

# Projects sorted by when they were first added
${glob:projects/*.yml | sort:-git:created}

# Posts sorted by author date (ignores rebases)
${glob:posts/*.yml | sort:-git:authored}
```

### Descending Order

Prefix any key with `-`:

```yaml
${glob:*.yml | sort:-year}         # newest first
${glob:*.yml | sort:-git}          # most recently committed first
${glob:*.yml | sort:-name}         # reverse alphabetical
```

### Multi-Key Sort

Comma-separated keys for tie-breaking:

```yaml
${glob:*.yml | sort:-year,title}   # year desc, then title asc
${glob:*.yml | sort:category,-date}  # category asc, then date desc
```

---

## Filter Syntax

### Equality

```yaml
${glob:*.yml | filter:status=published}
```

### Inequality

```yaml
${glob:*.yml | filter:status!=draft}
```

### Existence (Key Present)

```yaml
${glob:*.yml | filter:image}       # keep items that have an "image" key
```

### Non-Existence (Key Absent)

```yaml
${glob:*.yml | exclude:draft}      # remove items that have a "draft" key
```

### Multiple Conditions (AND)

```yaml
${glob:*.yml | filter:status=published,lang=en}
```

All conditions must match (AND logic). For OR logic, use multiple pipes:

```yaml
# No built-in OR — use separate globs and flatten
items:
  - ${glob:en/*.yml}
  - ${glob:fr/*.yml}
```

### Nested Field Access

```yaml
${glob:*.yml | filter:meta.featured=true}
```

---

## Custom Resolvers

Users can register custom resolvers via Python:

```python
# my_resolvers.py
from webifier.core.resolvers import register_resolver

@register_resolver("icon")
def icon_resolver(arg, ctx, input=None):
    """Turn icon names into FontAwesome HTML."""
    return f'<i class="fas fa-{arg}"></i>'

@register_resolver("date")
def date_resolver(arg, ctx, input=None):
    """Format a date string."""
    from datetime import datetime
    return datetime.now().strftime(arg or "%Y-%m-%d")

@register_resolver("shuffle")
def shuffle_resolver(arg, ctx, input=None):
    """Randomly shuffle a list — useful for testimonials."""
    import random
    items = list(input)
    random.shuffle(items)
    return items
```

Expose the resolver from an extension:

```yaml
webifier:
  extensions:
    helpers:
      uses: my.helpers
```

Then use in YAML:

```yaml
footer: "Last updated ${date:%B %Y}"
cta_icon: ${icon:rocket}
testimonials: ${glob:testimonials/*.yml | shuffle | limit:3}
```

### Resolver Function Signature

```python
def my_resolver(arg: str, ctx: ResolveContext, input: Any = None) -> Any:
    """
    Parameters
    ----------
    arg : str
        The argument string after the colon (e.g., "*.yml" in "glob:*.yml").
    ctx : ResolveContext
        Context object with:
        - ctx.base_dir: directory of the current YAML file
        - ctx.root: the root document dict (for cross-references)
        - ctx.builder: the Builder instance (for asset resolution, etc.)
    input : Any
        Output from the previous resolver in a pipe chain.
        None for source resolvers (first in chain).

    Returns
    -------
    Any
        The resolved value. Can be any type for full-value resolution.
        Will be converted to str for string interpolation.
    """
```

---

## Implementation Notes

### Resolution Order

`${}` is resolved **after** `patch` and `defaults`:

```
1. Parse YAML
2. Resolve patch (load files, merge)
3. Apply defaults (spread to siblings)
4. Resolve ${} (interpolation, references, transforms)
5. Dispatch to renderers
```

This means `${}` can reference values that were brought in via `patch`.

### Circular Reference Detection

The resolver detects circular `${ref:...}` references and raises a clear error:

```
ResolverError: Circular reference detected: header.title → nav.brand.text → header.title
```

### Error Messages

All resolver errors include the source file, key path, and resolver expression:

```
ResolverError: in index.yml at "publications.items":
  ${glob:publications/*.yml | sort:-year}
  Unknown sort key: "year" — no "year" field found in any loaded item.
  Available fields: title, authors, tags, date
```

### Escaping

To use a literal `${` in a value, escape with `\`:

```yaml
code_example: "Use \${variable} for interpolation"
# → "Use ${variable} for interpolation" (literal, not resolved)
```
