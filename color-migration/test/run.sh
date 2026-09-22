#!/bin/bash
# Runs the matching-core tests against the code that ships in code.js.
# Uses node if installed, otherwise the JavaScriptCore shell built into macOS.
set -u
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
if command -v node >/dev/null 2>&1; then
  echo "runtime: node $(node --version)"; node test/verify.js
elif [ -x "$JSC" ]; then
  echo "runtime: JavaScriptCore (macOS built-in)"; "$JSC" test/verify.js
else
  echo "no JS runtime found (install node, or run on macOS for jsc)"; exit 1
fi
