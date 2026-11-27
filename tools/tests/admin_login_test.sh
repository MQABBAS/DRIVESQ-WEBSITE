#!/bin/sh
# Tests the admin-login function against an in-memory mock database (no network).
set -e
R=$(cd "$(dirname "$0")/../.." && pwd); T=${TMPDIR:-/tmp}/admin_login_test; mkdir -p "$T"
python3 - "$R" "$T" <<'PY'
import re,sys
R,T=sys.argv[1:3]
s=open(R+'/supabase/functions/admin-login/index.ts',encoding='utf-8').read()
s=re.sub(r'^import .*$','',s,flags=re.M).replace('export async function','async function')
mock='''
globalThis.Deno={env:{get:(k)=>({SUPABASE_SERVICE_ROLE_KEY:"svc"})[k]}};
const serve=()=>{};
globalThis.DB={admins:[],admin_login_attempts:[]};let SEQ=1;
const createClient=()=>({from:(t)=>{const st={f:[],op:"select",rows:null,patch:null};
 const m=r=>st.f.every(([k,o,v])=>o==="eq"?String(r[k])===String(v):String(r[k])>=String(v));
 const run=()=>{const tb=DB[t];if(!tb)return{data:null,error:{message:"missing"}};
  if(st.op==="insert"){st.rows.forEach(r=>tb.push({id:SEQ++,at:new Date().toISOString(),...r}));return{data:null,error:null}}
  if(st.op==="update"){tb.filter(m).forEach(r=>Object.assign(r,st.patch));return{data:null,error:null}}
  if(st.op==="delete"){DB[t]=tb.filter(r=>!m(r));return{data:null,error:null}}
  return{data:tb.filter(m),error:null}};
 const o={select:()=>o,eq:(k,v)=>{st.f.push([k,"eq",v]);return o},gte:(k,v)=>{st.f.push([k,"gte",v]);return o},insert:r=>{st.op="insert";st.rows=r;return o},update:p=>{st.op="update";st.patch=p;return o},delete:()=>{st.op="delete";return o},
  maybeSingle:async()=>{const r=run();return{data:(r.data||[])[0]||null,error:r.error}},then:(a,b)=>Promise.resolve(run()).then(a,b)};return o}});
'''
t=open(R+'/tools/tests/admin_login_test.mts').read()
open(T+'/fn.ts','w').write(mock+s)
open(T+'/t.mts','w').write(t.replace('__FN__',T+'/fn.ts'))
PY
cd "$T" && node --experimental-strip-types t.mts 2>&1 | grep -v "Warning\|trace-warnings"
