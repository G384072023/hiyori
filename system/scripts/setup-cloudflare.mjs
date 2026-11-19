// Provision a D1 database, remember its returned ID, then apply versioned migrations.
// Passwords are entered via Wrangler's hidden prompt and stored as Worker secrets.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const wrangler = new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url);
function run(args,capture=false) {
  const result=spawnSync(process.execPath,[wrangler.pathname,...args],{
    stdio:capture?['inherit','pipe','inherit']:'inherit',encoding:'utf8',
  });
  if(result.status!==0)throw Error('Wrangler failed: '+args.slice(0,2).join(' '));
  return result.stdout||'';
}
run(['whoami']);
const configFile=new URL('../wrangler.jsonc',import.meta.url);
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
if(config.d1_databases[0].database_id==='REPLACE_WITH_D1_DATABASE_ID'){
  let databases=JSON.parse(run(['d1','list','--json'],true));
  let database=databases.find(item=>item.name==='hiyori-recycle-db');
  if(!database){
    run(['d1','create','hiyori-recycle-db','--location','apac']);
    databases=JSON.parse(run(['d1','list','--json'],true));
    database=databases.find(item=>item.name==='hiyori-recycle-db');
  }
  const id=database?.uuid||database?.database_id;
  if(typeof id!=='string'||!id)throw Error('Database ID was not returned. Check Cloudflare before retrying.');
  config.d1_databases[0].database_id=id;
  const temp=new URL('../wrangler.jsonc.tmp',import.meta.url);
  fs.writeFileSync(temp,JSON.stringify(config,null,2)+'\n');
  fs.renameSync(temp,configFile);
}
run(['d1','migrations','apply','DB','--remote']);
console.log('管理者用パスワードを入力してください（12文字以上）。');
run(['secret','put','HIYORI_ADMIN_PASSWORD']);
console.log('スタッフ用パスワードを入力してください（管理者と異なる12文字以上）。');
run(['secret','put','HIYORI_EMPLOYEE_PASSWORD']);
console.log('設定が完了しました。npm run deploy で公開します。');
