import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePublish,normalizeCRM,date,link,paginate,request,SOURCES} from './sync-feishu.mjs';
const row=fields=>({record_id:'rec1',fields});
test('normalizes price zero, social platforms, rich script link and Shanghai dates',()=>{
 const [r]=normalizePublish([row({id:' Alice ',平台:['ins','youtube'],推进机构:['Youdao MRP'],建联日期:Date.parse('2026-10-18T16:00:00Z'),脚本留档:[{text:'Script',link:'https://example.com/script'}],下单价格:0,是否交付:'是'})]);
 assert.equal(r.id,'Alice');assert.equal(r.price,0);assert.equal(r.contact,'2026-10-19');assert.equal(r.delivered,true);assert.deepEqual(r.platforms,['Instagram','YouTube']);assert.equal(r.scriptLink,'https://example.com/script');
});
test('rejects duplicates, unexpected empty results, invalid prices and dates',()=>{
 for(const rows of [[],[row({id:'a'}),row({id:'a'})],[row({id:'a',下单价格:'abc'})],[row({id:'a',约定交付日期:'2026-02-30'})]])assert.throws(()=>normalizePublish(rows));
 assert.throws(()=>date({unexpected:123}));
});
test('does not execute link schemes or retain an unrelated old script URL',()=>{
 assert.equal(link({link:'javascript:alert(1)'}),'');
 const old=[{id:'a',script:'Old',scriptLink:'https://example.com/old'}];
 assert.equal(normalizePublish([row({id:'a',脚本留档:'New'})],old)[0].scriptLink,'');
 assert.equal(normalizePublish([row({id:'a',脚本留档:'Old'})],old)[0].scriptLink,old[0].scriptLink);
 assert.equal(normalizePublish([row({id:'a',脚本留档:''})],old)[0].scriptLink,'');
});
test('removes private notes and all unapproved fields',()=>{
 const r=normalizeCRM([row({'达人名称/ID':'a','背景与备注':'Bank account PRIVATE','password':'SECRET','主推平台':['YT','TikTok']})],['达人名称/ID','主推平台','背景与备注']);
 assert.equal(r.records.a['主推平台'],'YouTube / TikTok');assert.equal(r.records.a['背景与备注'],'备注请查看飞书原表');assert.ok(!JSON.stringify(r).includes('PRIVATE'));assert.ok(!JSON.stringify(r).includes('SECRET'));
});
test('paginates the full table and refuses a truncated second page',async()=>{
 let calls=0;
 const result=await paginate(SOURCES.publish,'records',{},'test',async()=>({data:++calls===1?{items:[row({id:'a'})],has_more:true,page_token:'next'}:{items:[row({id:'b'})],has_more:false}}));
 assert.equal(result.length,2);
 await assert.rejects(()=>paginate(SOURCES.publish,'records',{},'test',async()=>({data:{items:[],has_more:true}})));
});
test('API failures contain neither raw response data nor tokens',async()=>{
 await assert.rejects(()=>request('/test',{fetchImpl:async()=>({ok:true,json:async()=>({code:99991672,msg:'PRIVATE SECRET'})})}),e=>!e.message.includes('SECRET')&&e.message.includes('99991672'));
});

test('build creates only public website files after both sources validate',async()=>{
 const {mkdtemp,mkdir,cp,writeFile,readFile,readdir,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const path=await import('node:path');const {fileURLToPath}=await import('node:url');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const temp=await mkdtemp(path.join(tmpdir(),'kol-sync-test-'));
 try {
  await mkdir(path.join(temp,'scripts'));
  await cp(path.join(root,'scripts/sync-feishu.mjs'),path.join(temp,'scripts/sync-feishu.mjs'));
  for(const f of ['index.html','app.js','styles.css','.nojekyll'])await cp(path.join(root,f),path.join(temp,f));
  await writeFile(path.join(temp,'data.js'),'window.ASTRA_DATA=[{id:"a"}];window.ASTRA_METRICS={old:{views:12,collectedAt:"2026-10-16"}};');
  const headers=['达人名称/ID','主推平台','背景与备注'];await writeFile(path.join(temp,'crm-data.js'),`window.ASTRA_CRM=${JSON.stringify({headers,records:{a:{}}})};`);
  const {spawnSync}=await import('node:child_process');
  const harness=`import {build} from './scripts/sync-feishu.mjs';
   globalThis.fetch=async(url,options)=>{const u=new URL(url);let obj;
    if(u.pathname.endsWith('/internal'))obj={tenant_access_token:'TEST_TOKEN'};
    else if(u.pathname.endsWith('/fields'))obj={data:{items:${JSON.stringify(['id','账号链接','平台','推进机构','建联日期','脚本留档','下单价格','权益','是否交付','约定交付日期','实际交付日期','交付链接',...headers])}.map(field_name=>({field_name})),has_more:false}};
    else obj={data:{items:[{fields:u.pathname.includes('tblcYFvr2kzo7TbF')?{id:'a',平台:['youtube'],下单价格:100,是否交付:'是'}:{'达人名称/ID':'a','主推平台':['YT'],'背景与备注':'DO_NOT_PUBLISH'}}],has_more:false}};
    return {ok:true,json:async()=>({code:0,...obj})};};await build();`;
  await writeFile(path.join(temp,'run.mjs'),harness);
  const result=spawnSync(process.execPath,['run.mjs'],{cwd:temp,env:{...process.env,FEISHU_APP_ID:'TEST_ID',FEISHU_APP_SECRET:'TEST_SECRET'},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual((await readdir(path.join(temp,'_site'))).sort(),['.nojekyll','app.js','crm-data.js','data.js','index.html','styles.css'].sort());
  const crm=await readFile(path.join(temp,'_site/crm-data.js'),'utf8'),data=await readFile(path.join(temp,'_site/data.js'),'utf8');
  assert.ok(!crm.includes('DO_NOT_PUBLISH'));assert.ok(!data.includes('TEST_SECRET'));assert.ok(data.includes('ASTRA_SYNC'));assert.ok(data.includes('2026-10-16'));
 }finally{await rm(temp,{recursive:true,force:true});}
});


test('reads linked project names returned as text_arr without publishing table ids',()=>{
 const headers=['达人名称/ID','Campaign 合作追踪（项目进度表）'];
 const result=normalizeCRM([row({'达人名称/ID':'a',[headers[1]]:[{table_id:'PRIVATE_TABLE_ID',text_arr:['a - Astra','a - Follow-up'],type:'text'}]})],headers);
 assert.equal(result.records.a[headers[1]],'a - Astra / a - Follow-up');
 assert.ok(!JSON.stringify(result).includes('PRIVATE_TABLE_ID'));
});
