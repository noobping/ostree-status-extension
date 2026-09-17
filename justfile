set shell := ["bash", "-ec"]

archive := "dist/ostree-status@noobping.dev.zip"

default: check

[parallel]
check: check-assets check-javascript check-just check-metadata check-shell check-whitespace

check-assets:
    test -s software-update-available-symbolic.svg
    test -s verified-checkmark-symbolic.svg
    grep -Fq "const BUSY_ICON = 'software-update-available-symbolic.svg';" extension.js
    grep -Fq "const IDLE_ICON = 'verified-checkmark-symbolic.svg';" extension.js

check-javascript:
    test -s extension.js
    test -s tests/test-extension.js
    if command -v node >/dev/null 2>&1; then node --check --input-type=module < extension.js; fi
    if command -v node >/dev/null 2>&1; then node --check --input-type=module < tests/test-extension.js; fi
    grep -Fq "export default class RpmOstreeStateExtension extends Extension" extension.js
    grep -Fq "this._button.connect('clicked'" extension.js

check-just:
    {{ quote(just_executable()) }} --fmt --check

check-metadata:
    test -s metadata.json
    if command -v python3 >/dev/null 2>&1; then python3 -m json.tool metadata.json >/dev/null; fi
    grep -Eq '"uuid"[[:space:]]*:[[:space:]]*"ostree-status@noobping\.dev"' metadata.json
    grep -Eq '"shell-version"[[:space:]]*:[[:space:]]*\[[^]]*"51"' metadata.json

check-shell:
    bash -n tests/check-shexli tests/install-ci-tools tests/test-gnome-shell

check-whitespace:
    git diff --check
    git diff --cached --check
    git log -1 --check --format=

shexli:
    tests/check-shexli

lint: check shexli

package:
    mkdir -p dist
    rm -f {{ quote(archive) }}
    empty_tree=$(git hash-object -t tree /dev/null); \
        git archive --format=zip --output={{ quote(archive) }} \
        --add-file=extension.js --add-file=metadata.json --add-file=LICENSE \
        --add-file=software-update-available-symbolic.svg \
        --add-file=verified-checkmark-symbolic.svg "$empty_tree"
    test -s {{ quote(archive) }}

build: check package

container-test:
    tests/test-gnome-shell

native-test:
    tests/test-gnome-shell --native

test: build container-test

install-files:
    #!/usr/bin/env bash
    set -euo pipefail
    uuid=$(sed -n 's/.*"uuid"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' metadata.json)
    test "$uuid" = 'ostree-status@noobping.dev'
    target="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$uuid"
    rm -rf -- "$target"
    install -d -m0755 "$target"
    install -m0644 extension.js metadata.json \
        software-update-available-symbolic.svg verified-checkmark-symbolic.svg \
        "$target/"
    if command -v gnome-extensions >/dev/null 2>&1; then
        gnome-extensions enable "$uuid" || true
    fi
    printf 'Installed %s to %s\n' "$uuid" "$target"

install-local: check install-files

ci: lint test

clean:
    rm -rf -- dist
