#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
dist_root="$project_root/dist"

rm -rf "$dist_root"
mkdir -p "$dist_root/server" "$dist_root/.openai"
"${HIYORI_NODE_BIN:-node}" "$project_root/scripts/embed-ui.mjs"
if [[ -f "$project_root/.openai/hosting.json" ]]; then
  cp "$project_root/.openai/hosting.json" "$dist_root/.openai/hosting.json"
fi

echo "Built $dist_root"
cp -R "$project_root/drizzle" "$dist_root/drizzle"
