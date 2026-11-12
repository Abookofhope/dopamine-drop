#!/bin/bash
# verify.sh <port> <site> <logprefix>: the full chain, every probe alone (all.mjs order), then MAX alive, soak, shots, monkey.
. /tmp/claude-0/-home-user-General-Knowledge/3c29311d-8e40-5546-bd63-3fb852b23790/scratchpad/env.sh
PORT=$1; SITE=$2; P=$3
# PIN: run the probes from a pinned checkout (a worktree at the build's commit), not the live working tree
REPO=${PIN:-$REPO}
export PORT SITE
rm -f ${P}_*.log
curl -s -o /dev/null --max-time 2 http://127.0.0.1:$PORT/index.html || { echo "SERVER DOWN on $PORT" > ${P}_done.log; exit 1; }
# the server must be serving this build: a reused port once served a stale one (2026-11-11)
want=$(grep -o 'app.js?v=[0-9a-f]*' "$SITE/index.html" | head -1); got=$(curl -s --max-time 3 http://127.0.0.1:$PORT/index.html | grep -o 'app.js?v=[0-9a-f]*' | head -1)
if [ -n "$want" ] && [ "$want" != "$got" ]; then echo "WRONG BUILD on $PORT: serving $got, expected $want" >> ${P}_done.log; echo BATCHDONE >> ${P}_done.log; exit 1; fi
cd $REPO
python3 tools/check_site.py $SITE > ${P}_gate.log 2>&1; echo "gate exit $?" >> ${P}_done.log
for f in $(node -e "const s=require('fs').readFileSync('tools/probe/all.mjs','utf8');console.log(s.match(/const probes = \[([^\]]*)\]/)[1].split(',').map(x=>x.trim().replace(/['\"]/g,'')).filter(Boolean).join(' '))"); do
  b=${f%.mjs}; t0=$(date +%s)
  curl -s -o /dev/null --max-time 2 http://127.0.0.1:$PORT/index.html || echo "SERVER DOWN before $b" >> ${P}_done.log
  timeout 1500 node tools/probe/$f > ${P}_s_$b.log 2>&1; echo "$b exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
done
echo SUITEDONE >> ${P}_done.log
t0=$(date +%s); MAX=1 timeout 1800 node tools/probe/alive.mjs > ${P}_alive_max.log 2>&1; echo "alive_max exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
t0=$(date +%s); timeout 900 node tools/probe/soak.mjs > ${P}_soak.log 2>&1; echo "soak exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
t0=$(date +%s); timeout 1800 node tools/probe/shots.mjs > ${P}_shots.log 2>&1; echo "shots exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
t0=$(date +%s); timeout 1800 node tools/probe/monkey.mjs > ${P}_monkey.log 2>&1; echo "monkey exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
echo ALLDONE >> ${P}_done.log
