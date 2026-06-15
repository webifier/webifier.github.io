# Webifier Website

[![Deploy](https://github.com/webifier/webifier.github.io/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/webifier/webifier.github.io/actions/workflows/main.yml)

This repository contains the source content for [webifier.github.io](https://webifier.github.io/), the documentation website for Webifier.

The site is built with Webifier itself. The root `index.yml` defines the landing page, shared configuration lives under `configurations/`, and documentation pages live under `pages/`. The generated static website is written to `webified/`, which is intentionally ignored by Git.

## Local Development

From this repository, rebuild the site with the adjacent local Webifier checkout:

```shell
../build/.venv/bin/webify --index index.yml --output webified --baseurl ""
```

Serve the generated site locally:

```shell
../build/.venv/bin/python -m http.server 4175 --bind 127.0.0.1 --directory webified
```

Then open:

```text
http://127.0.0.1:4175/
```

If you are not using the sibling `build/` checkout, install Webifier and run:

```shell
pip install webifier
webify --index index.yml --output webified --baseurl ""
python -m http.server 4175 --bind 127.0.0.1 --directory webified
```

## Deployment

Pushes to `master` run `.github/workflows/main.yml`. The workflow builds the site with `webifier/build` and publishes `webified/` to GitHub Pages.
