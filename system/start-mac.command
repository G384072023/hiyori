#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
node_path="$(command -v node || true)"
if [[ -n "$node_path" ]] && ! "$node_path" -e "require('node:sqlite')" 2>/dev/null; then node_path=""; fi
for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
  if [[ -z "$node_path" && -x "$candidate" ]] && "$candidate" -e "require('node:sqlite')" 2>/dev/null; then node_path="$candidate"; fi
done
if [[ -z "$node_path" ]] || ! "$node_path" -e "require('node:sqlite')" 2>/dev/null; then
  printf 'Node.js 22.13 以降をインストールしてから、再実行してください。\n'
  read -r -p 'Enter キーで終了: ' _
  exit 1
fi
# デモ用ログイン。変更する場合は下記の値、または環境変数を指定してください。
export HIYORI_ADMIN_PASSWORD="${HIYORI_ADMIN_PASSWORD:-123456}"
export HIYORI_EMPLOYEE_NAME="${HIYORI_EMPLOYEE_NAME:-a}"
export HIYORI_EMPLOYEE_PASSWORD="${HIYORI_EMPLOYEE_PASSWORD:-abcdef}"
if [[ -z "${HIYORI_OLLAMA_MODEL:-}" ]]; then
  read -r -p 'インストール済み Ollama モデル名（Enter でルール抽出デモ）: ' HIYORI_OLLAMA_MODEL
  export HIYORI_OLLAMA_MODEL
fi
printf '管理者ユーザー名: admin / スタッフユーザー名: employee。この画面は開いたままにしてください。\n'
exec "$node_path" scripts/preview.mjs
