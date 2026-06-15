---
title: Publishing Content Files
header:
  title: Publishing Content Files
  description: Publish Markdown, notebooks, HTML, PDFs, images, and static assets from the repository.
---

# Publishing Content Files

Webifier is useful because it starts from the files you already have. The site
does not need to become a separate app. Your content can stay close to the code,
data, notes, and outputs that produced it.

## Markdown

Markdown is the most natural format for notes, reports, tutorials, and docs.
Link to a Markdown file with `md=...` to generate a page:

```markdown
[Read the notes](md=pages/notes.md)
```

Markdown front matter can provide page metadata:

```markdown
---
title: Notes
header:
  title: Notes
  description: Project notes rendered as a Webifier page.
---

# Notes
```

Front matter can set page controls such as `title`, `header`, `nav`, `footer`,
`meta`, `style`, and page-local `config`.

## Notebooks

Notebook files can be linked the same way:

```markdown
[Open the analysis](md=notebooks/analysis.ipynb)
```

This makes Webifier a good fit for research projects, experiments, and small
technical reports where the notebook is the work and the website is the sharing
surface.

Notebook pages can use the same page metadata shape in the first Markdown cell:

```markdown
---
title: Analysis
header:
  title: Analysis
nav: false
---

# Analysis
```

## HTML, PDFs, And Assets

Local HTML and PDF links can be copied or rendered depending on how they are
referenced. Local images and assets used by Markdown or HTML are copied into the
output so the generated site remains self-contained.

For more detail, see [Processing Pipeline](reference/05-processing-pipeline.html).
