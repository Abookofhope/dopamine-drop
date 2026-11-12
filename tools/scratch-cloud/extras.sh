#!/bin/bash
# extras.sh <port> <site> <logprefix>: the chain's last four steps, skipping any already in the log (restarts cut runs short).
. /tmp/claude-0/-home-user-General-Knowledge/3c29311d-8e40-5546-bd63-3fb852b23790/scratchpad/env.sh
PORT=$1; SITE=$2; P=$3; export PORT SITE; cd $REPO
done_(){ grep -q "^$1 exit" ${P}_done.log; }
done_ alive_max || { t0=$(date +%s); MAX=1 timeout 1800 node tools/probe/alive.mjs > ${P}_alive_max.log 2>&1; echo "alive_max exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log; }
done_ soak || { t0=$(date +%s); timeout 900 node tools/probe/soak.mjs > ${P}_soak.log 2>&1; echo "soak exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log; }
done_ shots || { t0=$(date +%s); timeout 1800 node tools/probe/shots.mjs > ${P}_shots.log 2>&1; echo "shots exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log; }
done_ monkey || { t0=$(date +%s); timeout 1800 node tools/probe/monkey.mjs > ${P}_monkey.log 2>&1; echo "monkey exit $? $(( $(date +%s) - t0 ))s" >> ${P}_done.log; }
echo ALLDONE >> ${P}_done.log
