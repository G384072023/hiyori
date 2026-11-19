// Accounts are retained when disabled so completed orders keep their original staff reference.
// Password hashes use a fresh random salt. Session tokens are stored only as SHA-256 hashes.
const encoder = new TextEncoder();
const iterations = 100000;
const json = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: {'Cache-Control': 'no-store', ...headers},
});
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const bytes = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
const rolePath = role => role === 'admin' ? '/admin/' : '/employee/';
const cookieName = role => role === 'admin' ? 'hiyori_admin' : 'hiyori_employee';

async function digest(text) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))));
}
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2', salt: bytes(salt), iterations, hash: 'SHA-256',
  }, key, 256)));
}
async function passwordFields(password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return {salt, hash: await hashPassword(password, salt)};
}
async function passwordMatches(account, password) {
  if (!account || typeof password !== 'string' || password.length > 128) return false;
  const actual = await hashPassword(password, account.password_salt);
  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual.charCodeAt(index) ^ account.password_hash.charCodeAt(index);
  }
  return difference === 0;
}
function basicCredentials(request) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), c => c.charCodeAt(0)));
    const separator = decoded.indexOf(':');
    return {username: decoded.slice(0, separator), password: decoded.slice(separator + 1)};
  } catch { return null; }
}
export async function hasAccounts(env) {
  return Boolean(await env.DB.prepare('SELECT id FROM app_accounts LIMIT 1').first());
}
export async function identity(request, env, role) {
  const token = (request.headers.get('Cookie') || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(cookieName(role) + '='))?.slice(cookieName(role).length + 1);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const account = await env.DB.prepare(`SELECT a.id,a.username,a.role,a.staff_name
      FROM app_sessions s JOIN app_accounts a ON a.id=s.account_id
      WHERE s.token_hash=? AND s.expires_at>? AND a.enabled=1 AND a.role=?`)
      .bind(await digest(token), Date.now(), role).first();
    if (account) return account;
  }
  const credentials = basicCredentials(request);
  if (!credentials) return null;
  const account = await env.DB.prepare('SELECT * FROM app_accounts WHERE username=? AND role=? AND enabled=1')
    .bind(credentials.username, role).first();
  return await passwordMatches(account, credentials.password) ? account : null;
}

// Called only after a successful legacy login, or inside an already-authorized admin request.
// Concurrent first logins use INSERT OR IGNORE and therefore cannot replace existing passwords.
export async function initializeAccounts(env) {
  if (await hasAccounts(env)) return;
  if (!env.HIYORI_ADMIN_PASSWORD || !env.HIYORI_EMPLOYEE_PASSWORD) return;
  const [admin, employee] = await Promise.all([
    passwordFields(env.HIYORI_ADMIN_PASSWORD), passwordFields(env.HIYORI_EMPLOYEE_PASSWORD),
  ]);
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO app_accounts
      (id,username,role,staff_name,password_hash,password_salt) VALUES (?,?,'admin',NULL,?,?)`)
      .bind(crypto.randomUUID(), 'admin', admin.hash, admin.salt),
    env.DB.prepare(`INSERT OR IGNORE INTO app_accounts
      (id,username,role,staff_name,password_hash,password_salt) VALUES (?,?,'employee',?,?,?)`)
      .bind(crypto.randomUUID(), 'employee', env.HIYORI_EMPLOYEE_NAME || 'a', employee.hash, employee.salt),
  ]);
}
function sessionCookie(role, value, request, maxAge) {
  return cookieName(role) + '=' + value + '; Path=' + rolePath(role) +
    '; HttpOnly; SameSite=Lax; Max-Age=' + maxAge +
    (new URL(request.url).protocol === 'https:' ? '; Secure' : '');
}
function loginPage(role) {
  const path = rolePath(role);
  const title = role === 'admin' ? ['管理者ログイン','管理员登录'] : ['スタッフログイン','员工登录'];
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>日和 | ${title[0]}</title><link rel="stylesheet" href="/assets/style.css"><body>
<header class="publicHeader"><strong>日和</strong><select id="lang" class="role" aria-label="言語 / 语言"><option value="ja">日本語</option><option value="zh">中文</option></select></header>
<main class="content" style="margin:auto;max-width:520px"><form class="panel formpanel" id="login" method="post">
<h1 data-ja="${title[0]}" data-zh="${title[1]}">${title[0]}</h1>
<div class="field"><label for="username" data-ja="ユーザー名" data-zh="用户名">ユーザー名</label><input id="username" name="username" required autocomplete="username" maxlength="32"></div>
<div class="field"><label for="password" data-ja="パスワード" data-zh="密码">パスワード</label><input id="password" name="password" required type="password" autocomplete="current-password" maxlength="128"></div>
<button class="primary" data-ja="ログイン" data-zh="登录">ログイン</button><p id="error" role="status"></p></form></main>
<script>
const form=document.querySelector('#login'),lang=document.querySelector('#lang'),error=document.querySelector('#error');
lang.onchange=()=>{document.documentElement.lang=lang.value==='ja'?'ja':'zh-CN';document.querySelectorAll('[data-ja]').forEach(el=>el.textContent=el.dataset[lang.value]);error.textContent=''};
form.onsubmit=async event=>{
 event.preventDefault();const button=form.querySelector('button');button.disabled=true;
 try{
  const response=await fetch(${JSON.stringify(path + 'login')},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
  if(!response.ok)throw Error('login');
  location.assign(${JSON.stringify(path)});
 }catch{error.textContent=lang.value==='ja'?'ユーザー名とパスワードを確認してください。':'请检查用户名、密码及账号是否启用。'}
 finally{button.disabled=false}
};
</script></body></html>`;
}
export async function loginRoute(request, url, env) {
  const match = url.pathname.match(/^\/(admin|employee)\/(login|logout)$/);
  if (!match) return null;
  const role = match[1] === 'admin' ? 'admin' : 'employee';
  if (request.method === 'GET' && match[2] === 'login') {
    return new Response(loginPage(role), {headers: {'Content-Type':'text/html;charset=UTF-8','Cache-Control':'no-store'}});
  }
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) {
    return json({error:'Access denied'},403);
  }
  if (match[2] === 'logout') {
    const current = await identity(request,env,role);
    if (current) {
      // Logout affects this browser token; other signed-in devices keep their own sessions.
      const cookie = (request.headers.get('Cookie')||'').split(';').map(p=>p.trim())
        .find(p=>p.startsWith(cookieName(role)+'='))?.split('=')[1];
      if (cookie) await env.DB.prepare('DELETE FROM app_sessions WHERE token_hash=?').bind(await digest(cookie)).run();
    }
    return new Response(null,{status:303,headers:{Location:rolePath(role)+'login',
      'Set-Cookie':sessionCookie(role,'',request,0),'Cache-Control':'no-store'}});
  }
  const body = await request.json();
  if (typeof body.username !== 'string' || typeof body.password !== 'string' ||
      body.username.length > 32 || body.password.length > 128) return json({error:'Invalid login'},401);
  if (!await hasAccounts(env)) {
    const username = role === 'admin' ? 'admin' : 'employee';
    const password = role === 'admin' ? env.HIYORI_ADMIN_PASSWORD : env.HIYORI_EMPLOYEE_PASSWORD;
    if (!password || body.username !== username || body.password !== password) return json({error:'Invalid login'},401);
    await initializeAccounts(env);
  }
  const account = await env.DB.prepare('SELECT * FROM app_accounts WHERE username=? AND role=? AND enabled=1')
    .bind(body.username.trim(),role).first();
  if (!await passwordMatches(account,body.password)) return json({error:'Invalid login'},401);
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const saved=await env.DB.batch([
    env.DB.prepare('DELETE FROM app_sessions WHERE expires_at<=?').bind(Date.now()),
    env.DB.prepare(`INSERT INTO app_sessions (token_hash,account_id,expires_at)
      SELECT ?,id,? FROM app_accounts WHERE id=? AND enabled=1 AND password_hash=?`)
      .bind(await digest(token),Date.now()+7*86400000,account.id,account.password_hash),
  ]);
  if((saved[1].meta?.changes??saved[1].changes)!==1)return json({error:'Invalid login'},401);
  return json({ok:true},200,{'Set-Cookie':sessionCookie(role,token,request,7*86400)});
}
export async function accountRoute(request, url, env) {
  if (!url.pathname.startsWith('/api/accounts')) return null;
  await initializeAccounts(env);
  const actor = await identity(request,env,'admin');
  // The caller was checked by the main admin gate. Sessions and legacy Basic accounts share it.
  if (!actor) return json({error:'Access denied'},403);
  const id = url.pathname.split('/')[3];
  if (request.method === 'GET' && !id) {
    const {results:accounts}=await env.DB.prepare(
      'SELECT id,username,role,staff_name,enabled,created_at FROM app_accounts ORDER BY role,username').all();
    return json({accounts,currentId:actor.id});
  }
  const body = await request.json();
  if (request.method === 'POST' && !id) {
    const {username,password,role,staff_name}=body;
    if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{1,32}$/.test(username) ||
        typeof password !== 'string' || password.length<6 || password.length>128 ||
        !['admin','employee'].includes(role) ||
        (role==='employee' && (typeof staff_name!=='string'||!staff_name.trim()||staff_name.length>50))) {
      return json({error:'入力内容を確認してください。パスワードは6文字以上です。'},400);
    }
    if (await env.DB.prepare('SELECT id FROM app_accounts WHERE username=? OR (role=\'employee\' AND staff_name=?)')
      .bind(username,role==='employee'?staff_name.trim():null).first()) {
      return json({error:'ユーザー名またはスタッフIDは登録済みです。'},409);
    }
    const secret=await passwordFields(password);
    try {
      await env.DB.prepare(`INSERT INTO app_accounts
        (id,username,role,staff_name,password_hash,password_salt) VALUES (?,?,?,?,?,?)`)
        .bind(crypto.randomUUID(),username,role,role==='employee'?staff_name.trim():null,secret.hash,secret.salt).run();
    } catch { return json({error:'ユーザー名またはスタッフIDは登録済みです。'},409); }
    return json({ok:true},201);
  }
  if (request.method !== 'PATCH' || !id) return json({error:'Not found'},404);
  const account=await env.DB.prepare('SELECT id,role,staff_name,enabled FROM app_accounts WHERE id=?').bind(id).first();
  if (!account) return json({error:'Not found'},404);
  if (body.action==='password') {
    if (typeof body.password!=='string'||body.password.length<6||body.password.length>128) {
      return json({error:'パスワードは6〜128文字で入力してください。'},400);
    }
    const secret=await passwordFields(body.password);
    await env.DB.batch([
      env.DB.prepare('UPDATE app_accounts SET password_hash=?,password_salt=? WHERE id=?').bind(secret.hash,secret.salt,id),
      env.DB.prepare('DELETE FROM app_sessions WHERE account_id=?').bind(id),
    ]);
    return json({ok:true,reauthenticate:actor.id===id});
  }
  if (!['enable','disable'].includes(body.action)) return json({error:'Invalid action'},400);
  const enabled=body.action==='enable'?1:0;
  // The last enabled admin check is inside the UPDATE, so concurrent requests cannot remove both.
  const results=await env.DB.batch([
    env.DB.prepare(`UPDATE app_accounts SET enabled=? WHERE id=? AND
      (?=1 OR role!='admin' OR enabled=0 OR (SELECT count(*) FROM app_accounts WHERE role='admin' AND enabled=1)>1)`)
      .bind(enabled,id,enabled),
    env.DB.prepare(`DELETE FROM app_sessions WHERE account_id=? AND
      EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND enabled=0)`).bind(id,id),
    env.DB.prepare(`UPDATE orders SET staff='',status='未割当'
      WHERE staff=? AND status!='回収完了'
      AND EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND role='employee' AND enabled=0)`)
      .bind(account.staff_name||'',id),
  ]);
  if ((results[0].meta?.changes??results[0].changes)!==1) {
    return json({error:'最後の管理者は利用停止できません。'},409);
  }
  return json({ok:true,reauthenticate:actor.id===id&&enabled===0});
}
