import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import assert from 'node:assert/strict';import worker from '../worker/index.js';const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../drizzle/0000_initial.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0001_settings.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0002_accounts.sql',import.meta.url),'utf8'));const UI_ASSETS=Object.fromEntries(['customer.html','admin.html','employee.html'].map(name=>[name,fs.readFileSync(new URL('../'+name,import.meta.url),'utf8')]));
const DB={async batch(statements){return Promise.all(statements.map(statement=>statement.run()))},prepare(sql){let a=[];return {bind(...b){a=b;return this},async all(){return{results:db.prepare(sql).all(...a)}},async first(){return db.prepare(sql).get(...a)},async run(){return db.prepare(sql).run(...a)}}}};async function call(p,method='GET',b){let r=await worker.fetch(new Request('http://test/api/'+p,{method,headers:{'oai-authenticated-user-email':'operator@example.test','oai-authenticated-user-id':'operator'},...(b?{body:JSON.stringify(b)}:{})}),{DB,UI_ASSETS,HIYORI_ADMIN_EMAIL:'operator@example.test'});assert.equal(r.status,200);return r.json()}
await call('customers','POST',{name:'テスト顧客',phone:'090-0000-0000'});let d=await call('data');await call('orders','POST',{customer:d.customers[0].id,items:'冷蔵庫1台',address:'東京都新宿区',appointment:'2026-11-15T10:00'});d=await call('data');let id=d.orders[0].id;for(let status of ['回収予定','回収中','回収完了'])await call('orders/'+id,'PATCH',{staff:'a',status});assert.equal((await call('data')).orders[0].status,'回収完了');let x=await call('extract','POST',{text:'11月15日に冷蔵庫1台を回収してください。東京都新宿区西新宿2-8-1'});assert.match(x.items,/冷蔵庫/);assert.match(x.address,/東京都/);const config={brand:'日和デモ',color:'#9e3653',staffs:['a','王 小明']};
await call('settings','PUT',config);
const saved=(await call('data')).config;
assert.deepEqual({brand:saved.brand,color:saved.color,staffs:saved.staffs},config);
assert.deepEqual(saved.flyer.phones,['090-2197-0469','080-6264-6865']);
const flyer={...saved.flyer,hours:'09:30–18:00',services:[['家電','家电','掃除機','吸尘器']]};
await call('settings','PUT',{...config,flyer});
assert.deepEqual((await call('data')).config.flyer,flyer);
await call('orders/'+id,'PATCH',{staff:'王 小明',status:'回収予定'});
assert.equal((await call('data')).orders[0].staff,'王 小明');
let html=await (await worker.fetch(new Request('http://test/'),{DB,UI_ASSETS})).text();new Function(fs.readFileSync(new URL('../ui/staff.js',import.meta.url),'utf8'));console.log('PASS: SQLite customer → order → assignment → completion, extraction, UI JavaScript syntax');

const env={DB,UI_ASSETS,HIYORI_ADMIN_EMAIL:'operator@example.test'};
const customerHeaders={'oai-authenticated-user-email':'customer@example.test','oai-authenticated-user-id':'customer'};
for(const route of ['/staff','/api/data','/api/customers','/api/settings','/api/orders/'+id]){
  const response=await worker.fetch(new Request('http://test'+route,{headers:customerHeaders}),env);
  assert.equal(response.status,route==='/staff'?302:403,route);
}
const publicPage=await (await worker.fetch(new Request('http://test/customer'),env)).text();
assert.match(publicPage,/回収のお申し込み/);
assert.doesNotMatch(publicPage,/\/api\/data|settingsform/);
assert.match(publicPage,/assets\/customer.js/);
new Function(fs.readFileSync(new URL('../ui/customer.js',import.meta.url),'utf8'));
await call('customers','POST',{name:'公開 対話',phone:'090-0000-0020'});
const registered=(await call('data')).customers.find(customer=>customer.phone==='090-0000-0020');
const request=await worker.fetch(new Request('http://test/api/public/request',{
  method:'POST',headers:{'Content-Type':'application/json',Origin:'http://test'},
  body:JSON.stringify({name:'公開 対話',phone:'090-0000-0020',items:'掃除機',address:'東京都新宿区',appointment:'2026-11-20T10:00'}),
}),env);
assert.equal(request.status,201);
const {orderId}=await request.json();
const received=await call('data');
assert.equal(received.orders.find(order=>order.id===orderId)?.status,'未割当');
assert.equal(received.orders.find(order=>order.id===orderId)?.customer,registered.id);
assert.equal(received.customers.filter(customer=>customer.phone==='090-0000-0020').length,1);
const staffPage=await worker.fetch(new Request('http://test/staff',{headers:{
  'oai-authenticated-user-email':'operator@example.test','oai-authenticated-user-id':'operator'
}}),env);
assert.match(await staffPage.text(),/admin\/app.js/);
console.log('PASS: distinct customer page, customer denied access to back-office pages and APIs, submission visible to admin');

const modelResponse=await worker.fetch(new Request('http://test/api/public/extract',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'掃除機を東京都新宿区で11月20日10時に回収してください。'}),
}),{DB,UI_ASSETS,LOCAL_PREVIEW:true,HIYORI_OLLAMA_MODEL:'test-model',MODEL_FETCH:async(url,options)=>{
  assert.equal(url,'http://127.0.0.1:11434/api/chat');
  assert.equal(JSON.parse(options.body).model,'test-model');
  return Response.json({message:{content:JSON.stringify({items:'掃除機',address:'東京都新宿区',appointment:'11月20日10時'})}});
}});
assert.deepEqual(await modelResponse.json(),{items:'掃除機',address:'東京都新宿区',appointment:'11月20日10時',mode:'model'});
console.log('PASS: model request and structured result using a simulated Ollama response');

const localEnv={DB,UI_ASSETS,LOCAL_PREVIEW:true,HIYORI_ADMIN_PASSWORD:'only-admin',HIYORI_EMPLOYEE_PASSWORD:'only-worker'};
const employeeAuth='Basic '+btoa('employee:only-worker');
const adminAuth='Basic '+btoa('admin:only-admin');
async function local(path,auth,method='GET',payload) {
  return worker.fetch(new Request('http://test'+path,{method,
    headers:{...(auth?{Authorization:auth}:{}),'Content-Type':'application/json'},
    ...(payload?{body:JSON.stringify(payload)}:{}),
  }),localEnv);
}
assert.equal((await local('/employee/')).status,302);
assert.equal((await local('/employee/',adminAuth)).status,302);
assert.equal((await local('/employee/',employeeAuth)).status,200);
assert.equal((await local('/admin/',employeeAuth)).status,302);
assert.equal((await local('/admin/api/data',employeeAuth)).status,403);
assert.equal((await local('/admin/api/data',adminAuth)).status,200);
assert.match(await (await local('/admin/',adminAuth)).text(),/admin\/app.js/);
await call('orders/'+orderId,'PATCH',{staff:'a',status:'回収予定'});
const employeeData=await (await local('/employee/api/orders',employeeAuth)).json();
assert.equal(employeeData.employee,'a');
assert.deepEqual(employeeData.orders.map(order=>order.id),[orderId]);
assert.equal((await local('/employee/api/orders/'+id,employeeAuth,'PATCH',{status:'回収中'})).status,404);
assert.equal((await local('/employee/api/orders/'+orderId,employeeAuth,'PATCH',{status:'回収完了'})).status,404);
for(const status of ['回収中','回収完了'])
  assert.equal((await local('/employee/api/orders/'+orderId,employeeAuth,'PATCH',{status})).status,200);
assert.equal((await call('data')).orders.find(order=>order.id===orderId).status,'回収完了');
console.log('PASS: separate logins, employee sees only assigned orders and can complete only those orders');

// Hosted mode uses explicit secrets, never Sites identity headers or local demo defaults.
const hostedEnv={DB,UI_ASSETS,HIYORI_HOSTING:'cloudflare',
  HIYORI_ADMIN_PASSWORD:'online-admin-secret-unique',
  HIYORI_EMPLOYEE_PASSWORD:'online-worker-secret-unique',
  REQUEST_LIMITER:{limit:async()=>({success:true})},
  AI:{run:async(model,input)=>{
    assert.equal(model,'@cf/qwen/qwen2.5-coder-32b-instruct');
    assert.equal(input.response_format.type,'json_schema');
    return {response:JSON.stringify({items:'冷蔵庫1台',address:'東京都新宿区',appointment:'来週の火曜 午後'})};
  }},
};
async function hosted(path,credentials,method='GET',payload) {
  return worker.fetch(new Request('https://hiyori.example'+path,{
    method,headers:{'Content-Type':'application/json',...(credentials?{Authorization:'Basic '+btoa(credentials)}:{})},
    ...(payload?{body:JSON.stringify(payload)}:{}),
  }),hostedEnv);
}
assert.equal((await hosted('/customer')).status,200);
assert.equal((await hosted('/admin/')).status,302);
assert.equal((await hosted('/admin/','admin:123456')).status,302);
assert.equal((await hosted('/admin/','admin:online-admin-secret-unique')).status,200);
assert.equal((await hosted('/employee/','employee:online-worker-secret-unique')).status,200);
assert.equal((await hosted('/admin/api/data','employee:online-worker-secret-unique')).status,403);
const aiResult=await hosted('/api/public/extract',null,'POST',{text:'来週の火曜午後、東京都新宿区で冷蔵庫1台をお願いできますか。'});
assert.equal(aiResult.status,200);
assert.equal((await aiResult.json()).mode,'model');
assert.equal((await worker.fetch(new Request('https://hiyori.example/api/public/extract',{
  method:'POST',headers:{'Content-Type':'application/json'},body:'{"text":"冷蔵庫"}',
}),{...hostedEnv,REQUEST_LIMITER:{limit:async()=>({success:false})}})).status,429);
console.log('PASS: hosted secrets, cloud model adapter (simulated), and public rate limits');

// Database accounts replace fixed environment credentials after first successful login.
async function accountRequest(path,method='GET',body,cookie) {
  return worker.fetch(new Request('https://hiyori.example'+path,{
    method,headers:{'Content-Type':'application/json',Origin:'https://hiyori.example',...(cookie?{Cookie:cookie}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
  }),hostedEnv);
}
const initialLogin=await accountRequest('/admin/login','POST',{
  username:'admin',password:hostedEnv.HIYORI_ADMIN_PASSWORD,
});
assert.equal(initialLogin.status,200);
const adminCookie=initialLogin.headers.get('set-cookie').split(';')[0];
const list=await (await accountRequest('/admin/api/accounts','GET',undefined,adminCookie)).json();
assert.equal(list.accounts.length,2);
assert(!JSON.stringify(list).includes('password_hash'));
const originalAdmin=list.accounts.find(account=>account.role==='admin');
const originalEmployee=list.accounts.find(account=>account.role==='employee');
assert.equal((await accountRequest('/admin/api/accounts/'+originalAdmin.id,'PATCH',{action:'disable'},adminCookie)).status,409);
assert.equal((await accountRequest('/admin/api/accounts','POST',{
  username:'b',role:'employee',staff_name:'b',password:'worker-b-123',
},adminCookie)).status,201);
assert.equal((await accountRequest('/admin/api/accounts','POST',{
  username:'manager2',role:'admin',password:'manager-123',
},adminCookie)).status,201);
const bLogin=await accountRequest('/employee/login','POST',{username:'b',password:'worker-b-123'});
assert.equal(bLogin.status,200);
const bCookie=bLogin.headers.get('set-cookie').split(';')[0];
assert.equal((await accountRequest('/admin/api/data','GET',undefined,bCookie)).status,403);
const users=await (await accountRequest('/admin/api/accounts','GET',undefined,adminCookie)).json();
const bAccount=users.accounts.find(account=>account.username==='b');
await accountRequest('/admin/api/orders/'+orderId,'PATCH',{staff:'b',status:'回収予定'},adminCookie);
assert.equal((await (await accountRequest('/employee/api/orders','GET',undefined,bCookie)).json()).orders.length,1);
assert.equal((await accountRequest('/admin/api/accounts/'+bAccount.id,'PATCH',{action:'disable'},adminCookie)).status,200);
assert.equal((await accountRequest('/employee/api/orders','GET',undefined,bCookie)).status,403);
const afterDisable=await (await accountRequest('/admin/api/data','GET',undefined,adminCookie)).json();
assert.equal(afterDisable.orders.find(order=>order.id===orderId).status,'未割当');
assert(!afterDisable.config.staffs.includes('b'));
await accountRequest('/admin/api/accounts/'+bAccount.id,'PATCH',{action:'enable'},adminCookie);
assert.equal((await accountRequest('/admin/api/accounts/'+originalAdmin.id,'PATCH',{action:'password',password:'123456'},adminCookie)).status,200);
assert.equal((await accountRequest('/admin/api/data','GET',undefined,adminCookie)).status,403);
assert.equal((await accountRequest('/admin/login','POST',{username:'admin',password:'123456'})).status,200);
assert.equal((await accountRequest('/admin/login','POST',{username:'admin',password:hostedEnv.HIYORI_ADMIN_PASSWORD})).status,401);
assert.equal((await accountRequest('/employee/login','POST',{username:'b',password:'worker-b-123'})).status,200);
console.log('PASS: account creation, short password, session revocation, staff disabling and last-admin protection');

// Input and session regressions found during the end-to-end audit.
const renewed=await accountRequest('/admin/login','POST',{username:'admin',password:'123456'});
const renewedCookie=renewed.headers.get('set-cookie').split(';')[0];
const duplicate={name:'重複確認',phone:'090-0000-0030'};
assert.equal((await accountRequest('/admin/api/customers','POST',duplicate,renewedCookie)).status,200);
assert.equal((await accountRequest('/admin/api/customers','POST',duplicate,renewedCookie)).status,409);
assert.equal((await accountRequest('/admin/api/customers','POST',{name:{bad:true},phone:'bad'},renewedCookie)).status,400);
assert.equal((await accountRequest('/admin/api/orders/HY-ffffffff','PATCH',{staff:'a',status:'回収予定'},renewedCookie)).status,404);
const invalidOrder={name:'無効日付',phone:'090-0000-0040',items:'冷蔵庫',address:'東京都',appointment:'2026-02-30T10:00'};
assert.equal((await accountRequest('/api/public/request','POST',invalidOrder)).status,400);
assert.equal((await accountRequest('/api/public/request','POST',{...invalidOrder,appointment:'2026-11-25T10:00',note:'x'.repeat(2001)})).status,400);
assert.equal((await accountRequest('/api/public/extract','POST',null)).status,400);
assert.equal((await accountRequest('/admin/logout','POST',undefined,renewedCookie)).status,303);
assert.equal((await accountRequest('/admin/api/data','GET',undefined,renewedCookie)).status,403);
const legacyHeader=await worker.fetch(new Request('https://hiyori.example/admin/api/data',{
  headers:{Authorization:'Basic '+btoa('admin:123456')},
}),hostedEnv);
assert.equal(legacyHeader.status,403);
console.log('PASS: duplicate/invalid inputs, missing order, calendar validation, and complete logout');
