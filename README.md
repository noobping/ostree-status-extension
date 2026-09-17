[![License: MIT](https://img.shields.io/badge/License-MIT-default.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/noobping/ostree-status-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/noobping/ostree-status-extension/actions/workflows/ci.yml)

# OSTree Status extension
Display the rpm-ostree status in GNOME. Click to refresh manually or wait 10
seconds for an automatic refresh. Supports GNOME Shell 47 through 51.

![screenshot](screenshot.png)

## Development

Just contains the project tasks and Pipeline connects them into parallel checks
and dependent builds:

```sh
pipeline check
pipeline lint
pipeline build
pipeline test
pipeline ci
```

`pipeline test` runs the headless GNOME Shell extension test locally when the
test tool is available, or in a Fedora 45 container otherwise. CI tests Fedora
44 with GNOME 50 and Fedora 45 with GNOME 51 in separate jobs.

The extension archive is written to `dist/ostree-status@noobping.dev.zip`.
Install it into the current user profile with `pipeline install-local`. The
recipes are also available directly through Just.

Install the configured Git hooks with:

```sh
pipeline add --managed --link
```
