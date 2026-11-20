#!/bin/sh
# Runs the auto-assign engine against an in-memory mock database (no network, no Meta).
set -e
D=$(cd "$(dirname "$0")" && pwd); R=$(cd "$D/../../.." && pwd); T=${TMPDIR:-/tmp}/wa_engine_test; mkdir -p "$T"
python3 - "$R" "$D" "$T" <<'PY'
import re,sys
R,D,T=sys.argv[1:4]
s=open(R+'/supabase/functions/whatsapp/index.ts',encoding='utf-8').read()
s=re.sub(r'^import .*$','',s,flags=re.M).replace('serve(async (req) => {','globalThis.__h = (async (req) => {',1)
open(T+'/fn2.ts','w').write(open(D+'/shim.ts').read()+s)
t=open(D+'/engine.mts').read().replace('/tmp/claude-0/watest/fn2.ts',T+'/fn2.ts')
open(T+'/engine.mts','w').write(t)
PY
cd "$T" && node --experimental-strip-types engine.mts 2>&1 | grep -v "Warning\|trace-warnings"
