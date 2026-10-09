#!/bin/bash
# Upload guide PDFs to the shared "user guide" Drive folder. Never overwrites:
# if a file with the same name is already there, the new copy gets a
# "-YYYY-MM-DD" suffix and the old one is left for a human to remove.
#
#   bash .claude/skills/user-guide/scripts/publish-drive.sh docs/huong-dan-x.pdf [more.pdf ...]
#
# Env: GDRIVE_REMOTE (default: first rclone remote of type drive)
#      GUIDE_FOLDER_ID (default: the shop's user-guide folder)
set -eu -o pipefail
FOLDER="${GUIDE_FOLDER_ID:-1dGpAmJ6Q-vaY033GTUQ2oY_bDqC_NtPZ}"
REMOTE="${GDRIVE_REMOTE:-$(rclone listremotes --long | awk '$2 == "drive" { sub(/:$/, "", $1); print $1; exit }')}"
[ -n "$REMOTE" ] || { echo "error: no rclone Drive remote configured" >&2; exit 3; }
[ $# -ge 1 ] || { echo "usage: $0 <file.pdf> [...]" >&2; exit 2; }

existing="$(rclone -q lsf "$REMOTE:" --drive-root-folder-id "$FOLDER" --files-only)"
for f in "$@"; do
    [ -f "$f" ] || { echo "error: no such file: $f" >&2; exit 2; }
    name="$(basename "$f")"
    if printf '%s\n' "$existing" | grep -qxF "$name"; then
        name="${name%.pdf}-$(date +%F).pdf"
        printf '%s\n' "$existing" | grep -qxF "$name" && { echo "error: $name already in Drive; rename and retry" >&2; exit 4; }
        echo "note: $(basename "$f") already in Drive, uploading as $name"
    fi
    timeout 600 rclone -q copyto "$f" "$REMOTE:$name" --drive-root-folder-id "$FOLDER" --ignore-existing
done

rclone -q lsjson "$REMOTE:" --drive-root-folder-id "$FOLDER" --files-only | python3 -c '
import json, sys
for e in sorted(json.load(sys.stdin), key=lambda e: e["Path"]):
    print("%s  %s  https://drive.google.com/file/d/%s" % (e["ModTime"][:10], e["Path"], e["ID"]))'
