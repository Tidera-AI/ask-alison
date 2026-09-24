#!/usr/bin/env bash
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
found=0
self=':!.github/payload-guard.sh'
flag() { echo "::error file=$1::$2"; found=1; }
while IFS= read -r f; do flag "$f" "PolinRider payload marker found"; done < <(git grep -lIE "global\[['\"](!|_V)['\"]\] *=|global\.i *=|_\\\$_1e42|rmcej%otb%|Cot%3t=shtP|193\.247\.144\.38|166\.88\.134\.75" -- . "$self")
while IFS= read -r f; do flag "$f" "Code hidden after a long whitespace run"; done < <(git grep -lIE "[^[:space:]][ \t]{100,}[^[:space:]]" -- '*.js' '*.cjs' '*.mjs' '*.ts' '*.tsx' '*.jsx' '*.py' ':!**/*.min.js' ':!dist/**' ':!build/**')
while IFS= read -r f; do
  grep -q "createRequire" "$f" && flag "$f" "createRequire shim injected into build config"
  awk 'length($0) > 1500 { found = 1; exit } END { exit !found }' "$f" && flag "$f" "Build config has a line over 1,500 characters"
done < <(git ls-files -- '*.config.js' '*.config.cjs' '*.config.mjs' '*.config.ts' '**/.eslintrc*' '.eslintrc*')
while IFS= read -r f; do flag "$f" "Editor config auto-runs a task on folder open"; done < <(git grep -lE '"runOn" *: *"folderOpen"|"task\.allowAutomaticTasks" *: *(true|"on")' -- '*.json' '*.code-workspace')
while IFS= read -r f; do grep -qI . "$f" 2>/dev/null && flag "$f" "Font file is plain text, not a font"; done < <(git ls-files -- '*.woff' '*.woff2' '*.ttf' '*.otf' '*.eot')
while IFS= read -r f; do flag "$f" "config.bat entry in .gitignore"; done < <(git grep -lE '^[[:space:]]*/?config\.bat([[:space:]]|$)' -- '.gitignore' '**/.gitignore')
if [ "$found" -ne 0 ]; then echo "Payload guard failed - do NOT run npm on this checkout."; exit 1; fi
echo "Payload guard passed."