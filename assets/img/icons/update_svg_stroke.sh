#!/bin/sh

# update-svg-stroke.sh
# Usage:
#   ./update-svg-stroke.sh "#1f5faa"
#   ./update-svg-stroke.sh "#ff6600"
#
# Updates stroke="..." in all .svg files in the icon directory.

set -eu

ICON_DIR="/srv/hello_world/public/assets/img/icons"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <stroke-color>"
  echo "Example: $0 '#1f5faa'"
  exit 1
fi

NEW_STROKE="$1"

if [ ! -d "$ICON_DIR" ]; then
  echo "Icon directory not found: $ICON_DIR"
  exit 1
fi

cd "$ICON_DIR"

found=0

for file in *.svg; do
  if [ ! -f "$file" ]; then
    continue
  fi

  found=1
  echo "Updating $file"

  cp "$file" "$file.bak"

  sed -i "s/stroke=\"[^\"]*\"/stroke=\"$NEW_STROKE\"/g" "$file"
done

if [ "$found" -eq 0 ]; then
  echo "No SVG files found in $ICON_DIR"
  exit 0
fi

echo "Done."
echo "Backups created as *.svg.bak"
