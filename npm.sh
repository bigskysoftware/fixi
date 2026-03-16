#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./npm.sh <version>"
  echo "Example: ./npm.sh 0.9.4"
  exit 1
fi

VERSION="$1"

echo "Releasing fixi-js v${VERSION}..."

# Generate package.json
cat > package.json <<EOF
{
  "name": "fixi-js",
  "version": "${VERSION}",
  "description": "fixi.js - A Small Generalized Hypermedia Controls Tool",
  "main": "fixi.js",
  "files": [
    "fixi.js",
    "README.md"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/bigskysoftware/fixi.git"
  },
  "author": "1cg",
  "license": "BSD-0",
  "keywords": [
    "fixi",
    "htmx",
    "hypermedia",
    "fetch",
    "html"
  ],
  "bugs": {
    "url": "https://github.com/bigskysoftware/fixi/issues"
  }
}
EOF

echo "Generated package.json for v${VERSION}"

# Publish to npm
npm publish --access public

# Clean up
rm package.json

echo "Published fixi-js@${VERSION} to npm"