#!/usr/bin/env bash
#
# Serve the visual-regression fixture with a chosen theme, for Playwright.
#
#   THEME_TEMPLATE   theme under test — either a local theme *build* directory
#                    (`make build-theme` writes .deploy/quantecon-theme-report)
#                    or a released zip URL such as
#                      https://github.com/QuantEcon/quantecon-theme-report.mystmd/releases/download/vX.Y.Z/quantecon-theme-report.zip
#   PORT             port to serve on (default 3111, matching playwright.config.ts)
#
# Used as Playwright's `webServer.command`, and by preview.yml when the
# compliance content branch does not exist yet.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# FIXTURE_DIR selects which fixture project to serve. There is only one today;
# the option is kept so Phase 3 (#9) can add variants without re-plumbing.
cd "$here/${FIXTURE_DIR:-fixture}"

: "${THEME_TEMPLATE:?set THEME_TEMPLATE to a local theme build dir or a zip URL}"

# Substitute the chosen theme into myst.yml, escaping sed replacement
# specials: backslash, ampersand (whole-match), and the `|` delimiter.
esc=$(printf '%s' "$THEME_TEMPLATE" | sed 's/[\\&|]/\\&/g')
sed "s|__THEME__|${esc}|" myst.yml.in > myst.yml

echo "[serve] fixture:  ${FIXTURE_DIR:-fixture}"
echo "[serve] template: $THEME_TEMPLATE"
echo "[serve] port:     ${PORT:-3111}"
exec myst start --port "${PORT:-3111}"
