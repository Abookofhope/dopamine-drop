#!/bin/bash
# batch.sh <port> <site> <logprefix> probe1 probe2 ...  — each probe alone, in order
. /tmp/claude-0/-home-user-General-Knowledge/3c29311d-8e40-5546-bd63-3fb852b23790/scratchpad/env.sh
PORT=$1; SITE=$2; P=$3; shift 3
export PORT SITE
curl -s -o /dev/null --max-time 2 http://127.0.0.1:$PORT/index.html || { echo "SERVER DOWN on $PORT" >> ${P}_done.log; exit 1; }
# the server must be serving this build: a reused port once served a stale one (2026-11-11)
want=$(grep -o 'app.js?v=[0-9a-f]*' "$SITE/index.html" | head -1); got=$(curl -s --max-time 3 http://127.0.0.1:$PORT/index.html | grep -o 'app.js?v=[0-9a-f]*' | head -1)
if [ -n "$want" ] && [ "$want" != "$got" ]; then echo "WRONG BUILD on $PORT: serving $got, expected $want" >> ${P}_done.log; echo BATCHDONE >> ${P}_done.log; exit 1; fi
cd $REPO
for f in "$@"; do
  t0=$(date +%s); timeout 1500 node tools/probe/$f.mjs > ${P}_$f.log 2>&1; echo "$f exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
done
echo BATCHDONE >> ${P}_done.log
