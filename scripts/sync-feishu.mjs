import {readFile, writeFile, mkdir, cp, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://open.feishu.cn/open-apis';
export const SOURCES = {
  publish: {app:'TOSpbM0o0aonBGsbBK9c8hXJn8d', table:'tblcYFvr2kzo7TbF', view:'vew045jueC'},
  crm: {app:'W2UvbnBpfayuPtsvBDdcwmDenVc', table:'tblI1T4R7veSAtei', view:'vewzxPTmz9'}
};
const PUBLISH_FIELDS=['id','账号链接','平台','推进机构','建联日期','脚本留档','下单价格','权益','是否交付','约定交付日期','实际交付日期','交付链接'];
const OMITTED_CRM_FIELDS=['背景与备注'];
export function text(value) {
  if(value==null)return '';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value).trim();
  if(Array.isArray(value))return value.map(text).filter(Boolean).join('');
  if(typeof value==='object') {
    if(value.text!=null)return text(value.text);
    if(value.name!=null)return text(value.name);
    if(value.value!=null)return text(value.value);
    if(value.link!=null)return text(value.link);
    if(value.record_ids)return '关联项目请查看飞书原表';
  }
  throw new Error(`Unsupported Feishu field shape (keys: ${Object.keys(value).sort().join(',')}); deployment stopped.`);
}
function labels(value) {return (Array.isArray(value)?value:[value]).map(text).filter(Boolean);}
export function safeURL(value) {
  const candidate=String(value||'').trim();
  try {const url=new URL(candidate);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
}
export function link(value) {
  if(Array.isArray(value))return value.map(link).find(Boolean)||'';
  if(value&&typeof value==='object')return safeURL(value.link||value.url)||link(value.text||value.value);
  return safeURL(value);
}
export function date(value) {
  if(value==null||value==='')return '';
  if(typeof value==='number') {
    const d=new Date(value+8*3600000);
    if(!Number.isFinite(d.getTime()))throw new Error('Invalid Feishu date.');
    return d.toISOString().slice(0,10);
  }
  const s=text(value).replaceAll('/','-');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw new Error('Invalid Feishu date.');
  return s;
}
const platform=p=>({youtube:'YouTube',yt:'YouTube',ins:'Instagram',instagram:'Instagram',tiktok:'TikTok',twitter:'X',x:'X',linkedin:'LinkedIn'}[p.toLowerCase()]||p);
function unique(rows,label) {
  const names=rows.map(r=>r.id);
  if(new Set(names).size!==names.length)throw new Error(`Duplicate names in ${label}; deployment stopped.`);
  if(!rows.length)throw new Error(`Empty ${label}; refusing to replace the live site.`);
}
export function normalizePublish(records,previous=[]) {
  const rows=records.filter(r=>text(r.fields.id)).map(({fields:f})=>{
    const id=text(f.id), script=text(f['脚本留档']);
    const old=previous.find(r=>r.id===id);
    // Rich mentions may omit their URL in the API. Retain only a previously verified
    // URL whose document title is identical; never infer a new private document URL.
    const scriptLink=link(f['脚本留档'])||(old?.script===script?old.scriptLink:'')||'';
    const rawPrice=f['下单价格'];
    const price=rawPrice==null||rawPrice===''?null:Number(rawPrice);
    if(price!=null&&(!Number.isFinite(price)||price<0))throw new Error('Invalid price; deployment stopped.');
    return {id,account:link(f['账号链接']),platforms:[...new Set(labels(f['平台']).map(platform))],agency:text(f['推进机构']),contact:date(f['建联日期']),script,scriptLink,price,rights:text(f['权益']),delivered:f['是否交付']===true||text(f['是否交付'])==='是',due:date(f['约定交付日期']),actual:date(f['实际交付日期']),link:link(f['交付链接'])};
  });
  unique(rows,'publish table');return rows;
}
export function normalizeCRM(records,headers) {
  const rows=records.filter(r=>text(r.fields['达人名称/ID'])).map(({fields:f})=>{
    const id=text(f['达人名称/ID']);
    const values=Object.fromEntries(headers.map(h=>[h,OMITTED_CRM_FIELDS.includes(h)?'备注请查看飞书原表':h==='主页链接'?link(f[h]):h==='主推平台'?labels(f[h]).map(platform).join(' / '):Array.isArray(f[h])?f[h].map(text).filter(Boolean).join(' / '):text(f[h])]));
    return {id,values};
  });
  unique(rows,'CRM table');return {headers,records:Object.fromEntries(rows.map(r=>[r.id,r.values]))};
}
export async function request(endpoint,{token,body,fetchImpl=fetch}={}) {
  for(let attempt=0;attempt<3;attempt++) {
    let response;
    try {response=await fetchImpl(API+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json; charset=utf-8',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000),redirect:'error'});}
    catch {if(attempt===2)throw new Error('Feishu network request failed.');await new Promise(r=>setTimeout(r,1000*(attempt+1)));continue;}
    if((response.status===429||response.status>=500)&&attempt<2){await new Promise(r=>setTimeout(r,2000*(attempt+1)));continue;}
    if(!response.ok){
      let code='unavailable';
      try {const error=await response.json();if(Number.isInteger(error.code))code=String(error.code);}catch{}
      const operation=endpoint.includes('/auth/')?'authentication':endpoint.split('?')[0].split('/').at(-1);
      throw new Error(`Feishu ${operation} HTTP ${response.status}, API code ${code}; no deployment.`);
    }
    const json=await response.json();
    // Do not log raw API responses: they can contain private records or credentials.
    if(json.code!==0)throw new Error(`Feishu API code ${Number(json.code)}; check application and table read permissions.`);
    return json;
  }
}
export async function paginate(source,resource,params,token,requestImpl=request) {
  const items=[],seen=new Set();let next='';
  do {
    const query=new URLSearchParams({...params,page_size:'500',...(next?{page_token:next}:{})});
    const response=await requestImpl(`/bitable/v1/apps/${source.app}/tables/${source.table}/${resource}?${query}`,{token});
    const data=response.data;
    if(!Array.isArray(data?.items)||typeof data.has_more!=='boolean')throw new Error('Incomplete Feishu response; no deployment.');
    items.push(...data.items);
    if(!data.has_more)break;
    next=data.page_token;
    if(!next||seen.has(next))throw new Error('Incomplete pagination; no deployment.');
    seen.add(next);
  }while(true);
  return items;
}
async function fetchTable(source,fields,token) {
  const schema=await paginate(source,'fields',{},token);
  const missing=fields.filter(name=>!schema.some(f=>f.field_name===name));
  if(missing.length)throw new Error('Required columns were renamed or removed; no deployment.');
  return paginate(source,'records',{view_id:source.view,field_names:JSON.stringify(fields),text_field_as_array:'true'},token);
}
export async function build() {
  const appId=process.env.FEISHU_APP_ID,appSecret=process.env.FEISHU_APP_SECRET;
  if(!appId||!appSecret)throw new Error('Set FEISHU_APP_ID and FEISHU_APP_SECRET in GitHub Actions secrets first.');
  const context={window:{}};vm.createContext(context);
  for(const name of ['data.js','crm-data.js'])vm.runInContext(await readFile(path.join(ROOT,name),'utf8'),context);
  const previous=context.window;
  const auth=await request('/auth/v3/tenant_access_token/internal',{body:{app_id:appId,app_secret:appSecret}});
  if(!auth.tenant_access_token)throw new Error('Feishu did not return an access token.');
  console.log('Feishu authentication succeeded. Reading table schemas and records.');
  const [publishRaw,crmRaw]=await Promise.all([
    fetchTable(SOURCES.publish,PUBLISH_FIELDS,auth.tenant_access_token),
    fetchTable(SOURCES.crm,previous.ASTRA_CRM.headers.filter(h=>!OMITTED_CRM_FIELDS.includes(h)),auth.tenant_access_token)
  ]);
  const publish=normalizePublish(publishRaw,previous.ASTRA_DATA),crm=normalizeCRM(crmRaw,previous.ASTRA_CRM.headers);
  // Unexpected mass disappearance is usually a view/permission change. Require review.
  if(publish.length<previous.ASTRA_DATA.length/2||Object.keys(crm.records).length<Object.keys(previous.ASTRA_CRM.records).length/2)throw new Error('More than half the records disappeared; review the source view before publishing.');
  const now=new Date(),day=new Date(now.getTime()+8*3600000).toISOString().slice(0,10);
  const meta={date:day,syncedAt:now.toISOString(),mode:'automatic',schedule:'每天北京时间 12:00',publishCount:publish.length,crmCount:Object.keys(crm.records).length};
  const out=path.join(ROOT,'_site');await rm(out,{recursive:true,force:true});await mkdir(out);
  for(const name of ['index.html','styles.css','app.js','.nojekyll'])await cp(path.join(ROOT,name),path.join(out,name));
  const serialize=v=>JSON.stringify(v,null,2).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  await writeFile(path.join(out,'data.js'),`window.ASTRA_DATA = ${serialize(publish)};\nwindow.ASTRA_METRICS = ${serialize(previous.ASTRA_METRICS||{})};\nwindow.ASTRA_SYNC = ${serialize(meta)};\n`);
  await writeFile(path.join(out,'crm-data.js'),`window.ASTRA_CRM = ${serialize(crm)};\n`);
  const index=await readFile(path.join(out,'index.html'),'utf8');
  await writeFile(path.join(out,'index.html'),index.replace(/\?v=[^"']+/g,`?v=${now.getTime()}`));
  console.log(`Validated ${publish.length} publishing records and ${Object.keys(crm.records).length} CRM records. Public artifact is ready.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build().catch(error=>{console.error(error.message);process.exitCode=1;});
