#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Uso: $0 <arquivo.pptx> <saida.pdf> [delay_segundos]" >&2
  exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"
OPEN_DELAY="${3:-6}"

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "Arquivo PPTX não encontrado: $INPUT_FILE" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

osascript <<APPLESCRIPT
tell application "Microsoft PowerPoint"
  activate
  open POSIX file "$INPUT_FILE"
  delay $OPEN_DELAY
  try
    save active presentation in POSIX file "$OUTPUT_FILE" as save as PDF
  on error errMsg number errNum
    error "Falha ao exportar PDF (" & errNum & "): " & errMsg
  end try
  delay 2
  close active presentation saving no
end tell
APPLESCRIPT

echo "PDF exportado com sucesso para: $OUTPUT_FILE"
