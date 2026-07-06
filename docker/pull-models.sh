#!/bin/sh
set -eu

OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"

echo "Waiting for Ollama at $OLLAMA_HOST..."
until curl -sf "$OLLAMA_HOST/" >/dev/null; do
  sleep 2
done

pull_model() {
  name="$1"
  echo "Pulling $name..."
  curl -sfN "$OLLAMA_HOST/api/pull" -d "{\"name\":\"$name\",\"stream\":true}" >/dev/null
  echo "Ready: $name"
}

pull_model "llama3.2"
pull_model "llava"
pull_model "nomic-embed-text"

echo "All Ollama models ready."
