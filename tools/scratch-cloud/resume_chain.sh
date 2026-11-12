#!/bin/bash
# resume_chain.sh <port> <site> <logprefix> <last-done-probe>: the rest of the full chain, after a restart cut it off.
. /tmp/claude-0/-home-user-General-Knowledge/3c29311d-8e40-5546-bd63-3fb852b23790/scratchpad/env.sh
PORT=$1; SITE=$2; P=$3; LAST=$4
export PORT SITE
cd $REPO
echo "RESUMED after $LAST ($(date -u +%H:%M))" >> ${P}_done.log
go=0
for f in $(node -e "const s=require('fs').readFileSync('tools/probe/all.mjs','utf8');console.log(s.match(/const probes = \[([^\]]*)\]/)[1].split(',').map(x=>x.trim().replace(/['\"]/g,'')).filter(Boolean).join(' '))"); do
  b=${f%.mjs}
  if [ $go = 0 ]; then [ "$b" = "$LAST" ] && go=1; continue; fi
  t0=$(date +%s)
  curl -s -o /dev/null --max-time 2 http://127.0.0.1:$PORT/index.html || echo "SERVER DOWN before $b" >> ${P}_done.log
  timeout 1500 node tools/probe/$f > ${P}_s_$b.log 2>&1; echo "$b exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
done
echo SUITEDONE >> ${P}_done.log
t0=$(date +%s); MAX=1 timeout 1800 node tools/probe/alive.mjs > ${P}_alive_max.log 2>&1; echo "alive_max exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
t0=$(date +%s); timeout 900 node tools/probe/soak.mjs > ${P}_soak.log 2>&1; echo "soak exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
t0=$(date +%s); timeout 1800 node tools/probe/shots.mjs > ${P}_shots.log 2>&1; echo "shots exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
t0=$(date +%s); timeout 1800 node tools/probe/monkey.mjs > ${P}_monkey.log 2>&1; echo "monkey exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log
echo ALLDONE >> ${P}_done.log
