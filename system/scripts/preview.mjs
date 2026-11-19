import http from 'node:http';import {DatabaseSync} from 'node:sqlite';import worker from '../worker/index.js';import fs from 'node:fs';
// Read UI files on each request so edits in VS Code show up after a browser refresh.
const loadAssets=()=>Object.fromEntries(['style.css','customer.js','staff.js','employee.js','accounts.js','customer.html','admin.html','employee.html'].map(name=>
  [name,fs.readFileSync(new URL('../'+(name.endsWith('.html')?'':'ui/')+name,import.meta.url),'utf8')]));
const db=new DatabaseSync(process.env.HIYORI_DB||'hiyori.sqlite');if(!db.prepare("SELECT name FROM sqlite_master WHERE name='customers'").get())db.exec(fs.readFileSync(new URL('../drizzle/0000_initial.sql',import.meta.url),'utf8'));
if(!db.prepare("SELECT name FROM sqlite_master WHERE name='settings'").get())db.exec(fs.readFileSync(new URL('../drizzle/0001_settings.sql',import.meta.url),'utf8'));
if(!db.prepare("SELECT name FROM sqlite_master WHERE name='app_accounts'").get())db.exec(fs.readFileSync(new URL('../drizzle/0002_accounts.sql',import.meta.url),'utf8'));
const DB={async batch(statements){
  db.exec('BEGIN');
  try {const results=await Promise.all(statements.map(statement=>statement.run()));db.exec('COMMIT');return results}
  catch(error){db.exec('ROLLBACK');throw error}
},prepare(sql){let args=[];return {bind(...a){args=a;return this},async all(){return {results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)},async run(){return db.prepare(sql).run(...args)}}}};
http.createServer(async(req,res)=>{try{let chunks=[];for await(let c of req)chunks.push(c);let body=Buffer.concat(chunks);let r=await worker.fetch(new Request('http://'+(req.headers.host||'127.0.0.1:4173')+req.url,{method:req.method,...(body.length?{body}:{}),headers:req.headers}),{DB,UI_ASSETS:loadAssets(),LOCAL_PREVIEW:true,HIYORI_ADMIN_PASSWORD:process.env.HIYORI_ADMIN_PASSWORD,HIYORI_OLLAMA_MODEL:process.env.HIYORI_OLLAMA_MODEL,HIYORI_EMPLOYEE_NAME:process.env.HIYORI_EMPLOYEE_NAME,HIYORI_EMPLOYEE_PASSWORD:process.env.HIYORI_EMPLOYEE_PASSWORD});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()))}catch(e){console.error(e);res.writeHead(500);res.end('Error')}}).listen(4173,'127.0.0.1',()=>{console.log('お客様: http://127.0.0.1:4173/customer');console.log('管理者: http://127.0.0.1:4173/admin/');console.log('スタッフ: http://127.0.0.1:4173/employee/');console.log(process.env.HIYORI_OLLAMA_MODEL?'AIモデル: '+process.env.HIYORI_OLLAMA_MODEL:'抽出モード: ルール抽出デモ')});
