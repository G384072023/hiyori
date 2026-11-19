// Back-office screens: dashboard, customer directory, assignment, and employee jobs.
// Edit the Chinese dictionary below when changing Japanese interface labels.
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let data={customers:[],orders:[]},page='dashboard',role='admin',staff='a',filter='',search='';let staffs=['a','b','c'];
const adminApi = location.pathname.startsWith('/admin/') ? '/admin/api/' : '/api/';
async function api(path,method='GET',body){const r=await fetch(adminApi+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'通信エラー');return d}function toast(s){$('#toast').hidden=false;$('#toast').textContent=s;setTimeout(()=>$('#toast').hidden=true,4500)}async function refresh(){data=await api('data');staffs=data.config.staffs;if(!staffs.includes(staff))staff=staffs[0];applyBrand();render()}function customer(id){return data.customers.find(c=>c.id===id)?.name||'—'}function badge(s){return '<span class="badge b'+esc(s)+'">'+esc(s)+'</span>'}function go(p){page=p;filter='';search='';render()}function render(){const nav=role==='admin'?[['dashboard','◫','ダッシュボード'],['orders','▤','回収オーダー'],['customers','♙','顧客管理'],['team','♧','スタッフ'],['settings','⚙','設定']]:role==='customer'?[['guide','▤','回収のご案内'],['request','＋','回収のお申し込み'],['history','▤','お申し込み履歴']]:[['jobs','▤','担当オーダー']];$('#nav').innerHTML=nav.map(([p,i,t])=>'<button class="'+(page===p?'active':'')+'" onclick="go(\''+p+'\')"><span>'+i+'</span>'+t+'</button>').join('');$('#crumb').textContent=nav.find(n=>n[0]===page)?.[2]||'';$('#avatar').textContent={admin:'管',customer:'客',staff:'佐'}[role];if(page==='dashboard'||page==='orders')dashboard();if(page==='customers')customers();if(page==='team')team();if(page==='settings')settings();if(page==='guide')guide()}
function heading(e,t,p,button=''){return '<div class="heading"><div><h1>'+t+'</h1><p style="margin-bottom:0">'+p+'</p></div>'+button+'</div>'}function footer(){return '<div class="footer"><span>© 2026 日和 · HIYORI RECYCLING</span><span>回収管理</span></div>'}function staffRows(){return staffs.map((s,i)=>'<div class="staffrow"><span class="avatar">'+esc(s[0])+'</span><div><b data-record>'+esc(s)+'</b><small>回収スタッフ / '+(i+1)+'</small></div><em>'+data.orders.filter(o=>o.staff===s&&o.status!=='回収完了').length+' 件</em></div>').join('')}
function dashboard(){let un=data.orders.filter(o=>!o.staff).length,done=data.orders.filter(o=>o.status==='回収完了').length;$('#app').innerHTML=heading('OPERATIONS OVERVIEW',page==='dashboard'?'ダッシュボード':'回収オーダー','受付状況を確認し、担当スタッフを割り当てます。','<button class="primary" onclick="location.assign(\'/customer\')">＋ 回収依頼を登録</button>')+'<div class="guideShortcut"><div><b>回収サービスのご案内</b><p>品目一覧・電話でのご相談</p></div><button class="secondary" id="guidePreview">お客様向け案内を見る →</button></div><div class="stats">'+[['総オーダー','▤',data.orders.length,'すべての回収依頼'],['未割当のオーダー','◷',un,'担当スタッフを設定してください'],['回収中・回収予定','↗',data.orders.length-un-done,'スタッフが対応しています'],['回収完了','✓',done,'回収が完了したオーダー']].map((s,i)=>'<div class="stat '+(i===1?'highlight':'')+'"><span class="sym">'+s[1]+'</span><label>'+esc(s[0])+'</label><strong>'+s[2]+'<span style="font-size:12px;color:#aaa;margin-left:8px">件</span></strong><small>'+s[3]+'</small></div>').join('')+'</div><div class="grid"><section class="panel"><div class="panelhead"><h2>回収オーダー一覧</h2><small>受付一覧</small></div><div class="toolbar"><input class="search" id="search" placeholder="顧客名・住所・回収品で検索" aria-label="オーダー検索"><select id="filter" aria-label="ステータス"><option value="">すべてのステータス</option>'+['未割当','回収予定','回収中','回収完了'].map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('')+'</select></div><div id="ordertable"></div><div class="note">オーダーを選択して、詳細確認・担当者の割当ができます。</div></section><div class="rightside"><section class="panel"><div class="panelhead"><h2>チームの状況</h2><small>'+staffs.length+' 名</small></div><div class="sidebody"><div class="alert"><b>'+un+' 件のオーダーが未割当です</b><br>スタッフを割り当てて、回収を進めましょう。</div>'+staffRows()+'</div></section></div></div>'+footer();$('#search').value=search;$('#filter').value=filter;$('#search').oninput=e=>{search=e.target.value;orderTable()};$('#filter').onchange=e=>{filter=e.target.value;orderTable()};orderTable();
$('#guidePreview').onclick=()=>location.assign('/customer')}
function orderTable(){let os=data.orders.filter(o=>(!filter||o.status===filter)&&[customer(o.customer),o.address,o.items,o.id].join(' ').includes(search));$('#ordertable').innerHTML=os.length?'<div class="tablewrap"><table><thead><tr><th>オーダー / お客様</th><th>回収内容 / エリア</th><th>希望日時</th><th>ステータス</th><th>担当者</th><th></th></tr></thead><tbody>'+os.map(o=>'<tr><td><b data-record>'+esc(customer(o.customer))+'</b><small>'+esc(o.id)+'</small></td><td>'+esc(o.items)+'<small>'+esc(o.address)+'</small></td><td>'+esc(o.appointment)+'</td><td>'+badge(o.status)+'</td><td>'+esc(o.staff||'未割当')+'</td><td><button class="link" onclick="detail(\''+o.id+'\')">詳細 →</button></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">該当するオーダーはありません。<br><br><button class="secondary" onclick="sample()">デモデータを追加</button></div>'}
function modal(html){$('#overlay').innerHTML='<div class="modalback"><div class="modal"><div class="modalhead"><span class="eyebrow">オーダー管理</span><button class="link" onclick="closeModal()" aria-label="閉じる">✕</button></div>'+html+'</div></div>';$('#overlay input, #overlay select')?.focus()}function closeModal(){$('#overlay').innerHTML=''}function detail(id){let o=data.orders.find(x=>x.id===id);modal('<h1 style="font-size:22px">オーダー詳細</h1><p>'+esc(o.id)+'</p><h2>'+esc(customer(o.customer))+'</h2><p>'+esc(o.items)+'<br>'+esc(o.address)+'<br>'+esc(o.appointment)+'</p><p>'+esc(o.note)+'</p><form id="assign"><div class="field"><label>担当スタッフ</label><select name="staff"><option value="">未割当</option>'+staffs.map(s=>'<option data-record '+(s===o.staff?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></div><div class="field"><label>ステータス</label><select name="status">'+['未割当','回収予定','回収中','回収完了'].map(s=>'<option value="'+esc(s)+'" '+(s===o.status?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></div><button class="primary">変更を保存</button></form>');$('#assign').onsubmit=async e=>{e.preventDefault();let b=Object.fromEntries(new FormData(e.target));if(b.staff&&b.status==='未割当')b.status='回収予定';if(!b.staff)b.status='未割当';await act(()=>api('orders/'+id,'PATCH',b));closeModal()}}
async function act(fn){try{await fn();await refresh();toast('データベースに保存しました')}catch(e){toast(e.message)}}
function customers(){$('#app').innerHTML=heading('CUSTOMER DIRECTORY','顧客管理','お客様の基本情報を管理します。','<button class="primary" onclick="addCustomer()">＋ 顧客を追加</button>')+'<div class="panel"><div class="panelhead"><h2>登録済みのお客様</h2><small>'+data.customers.length+' 名</small></div>'+(data.customers.length?'<div class="tablewrap"><table><thead><tr><th>顧客名</th><th>電話番号</th><th>回収オーダー</th></tr></thead><tbody>'+data.customers.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.phone)+'</td><td>'+data.orders.filter(o=>o.customer===c.id).length+' 件</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">「顧客を追加」から登録してください。</div>')+'</div>'+footer()}
function addCustomer(){modal('<h1 style="font-size:22px">顧客を追加</h1><form id="customerform"><div class="field"><label>お名前 *</label><input name="name" required maxlength="80" placeholder="山田 花子"></div><div class="field"><label>電話番号 *</label><input name="phone" required type="tel" maxlength="30" placeholder="090-0000-0000"></div><button class="primary">登録する</button></form>');$('#customerform').onsubmit=async e=>{e.preventDefault();let b=Object.fromEntries(new FormData(e.target));try{await api('customers','POST',b);closeModal();await refresh();toast('顧客を登録しました')}catch(e){toast(e.message)}}}function team(){$('#app').innerHTML=heading('OUR TEAM','スタッフ','担当件数と対応状況を確認できます。')+'<div class="panel formpanel">'+staffRows()+'<p class="hint">スタッフ名簿は設定画面で変更できます。権限管理は今後の拡張項目です。</p></div>'+footer()}
async function sample(){await act(async()=>{if(data.customers.length||data.orders.length)throw Error('デモデータは空の状態でのみ追加できます');for(let [name,phone]of [['山田 花子（デモ）','090-0000-0001'],['高橋 太郎（デモ）','090-0000-0002'],['伊藤 美優（デモ）','090-0000-0003']])await api('customers','POST',{name,phone});data=await api('data');let examples=[['冷蔵庫 1台・洗濯機 1台','東京都新宿区西新宿2-8-1','2026-11-15T10:00'],['ソファ 1点・テーブル 1点','東京都渋谷区神南1-1-1','2026-11-15T13:00'],['自転車 2台','東京都中野区中野4-1-1','2026-11-16T09:00']];for(let i=0;i<3;i++)await api('orders','POST',{customer:data.customers[i].id,items:examples[i][0],address:examples[i][1],appointment:examples[i][2],note:'架空の面接用デモデータです。'});data=await api('data');await api('orders/'+data.orders[0].id,'PATCH',{staff:staffs[0],status:'回収予定'});await api('orders/'+data.orders[1].id,'PATCH',{staff:staffs[1]||staffs[0],status:'回収完了'})})}

const chinese = {"設定": "设置", "ダッシュボード": "工作台", "回収オーダー": "回收订单", "顧客管理": "客户管理", "スタッフ": "员工", "回収のお申し込み": "申请回收", "お申し込み履歴": "申请记录", "担当オーダー": "我的订单", "管理者として表示": "管理员视图", "お客様として表示": "客户视图", "スタッフとして表示": "员工视图", "管理者専用": "仅限管理员", "ワークスペース": "工作台", "受付状況を確認し、担当スタッフを割り当てます。": "集中管理从客户申请到回收完成的全过程。", "回収依頼を登録": "登记回收申请", "総オーダー": "订单总数", "未割当のオーダー": "待分配订单", "回収中・回収予定": "待回收及回收中", "回収完了": "回收完成", "すべての回収依頼": "所有回收申请", "担当スタッフを設定してください": "请分配负责员工", "スタッフが対応しています": "员工正在处理", "回収が完了したオーダー": "已完成回收的订单", "回収オーダー一覧": "回收订单列表", "顧客名・住所・回収品で検索": "按客户名、地址或物品搜索", "すべてのステータス": "所有状态", "ステータス": "状态", "未割当": "待分配", "回収予定": "待回收", "回収中": "回收中", "オーダー / お客様": "订单 / 客户", "回収内容 / エリア": "回收物品 / 地区", "希望日時": "期望时间", "担当者": "负责人", "詳細 →": "详情 →", "オーダーを選択して、詳細確認・担当者の割当ができます。": "选择订单后可查看详情并分配员工。", "チームの状況": "员工任务概况", "件のオーダーが未割当です": "个订单待分配", "スタッフを割り当てて、回収を進めましょう。": "分配员工后即可推进回收。", "回収スタッフ": "回收员工", "日本語のご依頼を、": "从日语申请中", "スムーズにオーダーへ。": "提取订单信息。", "回収品・住所・希望日時を抽出。": "提取物品、地址和期望时间。", "内容を確認してから登録できます。": "确认信息后即可提交。", "ご依頼": "申请", "情報抽出": "提取信息", "内容確認": "确认内容", "該当するオーダーはありません。": "没有符合条件的订单。", "デモデータを追加": "添加演示数据", "閉じる": "关闭", "オーダー詳細": "订单详情", "担当スタッフ": "负责员工", "変更を保存": "保存更改", "データベースに保存しました": "已保存到数据库", "お客様の基本情報を管理します。": "管理客户基本信息。", "顧客を追加": "添加客户", "登録済みのお客様": "已登记客户", "顧客名": "客户姓名", "電話番号": "电话号码", "「顧客を追加」から登録してください。": "点击「添加客户」进行登记。", "お名前": "姓名", "登録する": "登记", "顧客を登録しました": "已登记客户", "担当件数と対応状況を確認できます。": "查看员工负责的订单数量和处理状态。", "スタッフ名簿は設定画面で変更できます。権限管理は今後の拡張項目です。": "可在设置中修改员工名单。权限管理暂未接入。", "お客様（デモ用選択）": "客户（演示选择）", "選択してください": "请选择", "ご希望の内容を入力してください。確認後、担当スタッフが回収に伺います。": "请填写回收需求，确认后将安排员工上门。", "最初に管理者画面の「顧客管理」でお客様を登録してください。": "请先在管理员的「客户管理」中登记客户。", "日本語のご依頼から入力をサポート": "从日语申请中提取信息", "AI連携用の枠組みです。現在はルールベースの抽出演示です。": "已预留 AI 接口，目前使用规则提取演示。", "抽出結果を確認し、希望日時を選択してください。": "请核对提取结果并选择期望时间。", "内容を抽出する": "提取信息", "回収する品物": "回收物品", "回収先の住所": "回收地址", "回収希望日時": "期望回收时间", "備考": "备注", "この内容で申し込む": "提交回收申请", "※ 希望日時は予約確定日時ではありません。": "※ 期望时间需等待确认。", "ご依頼内容を入力してください": "请输入申请内容", "抽出した希望日時": "提取的期望时间", "検出できませんでした": "未提取到", "。下の日時欄で指定してください。": "。请在下方选择时间。", "抽出結果をご確認ください": "请确认提取结果", "お申し込みを受け付けました": "已收到回收申请", "回収完了にする": "标记回收完成", "回収を開始する": "开始回收", "今日も安全運転で。担当する回収内容をご確認ください。": "请查看分配给你的回收任务。", "スタッフを選択": "选择员工", "担当オーダーはありません。": "目前没有分配给你的订单。", "受付状況と回収ステータスを確認できます。": "查看申请及回收进度。", "お申し込みはありません。": "暂无申请。", "デモデータは空の状態でのみ追加できます": "仅可在数据库为空时添加演示数据", "接続できませんでした": "连接失败", "データベースへの接続を確認してください。": "请检查数据库连接。", "再試行": "重试", "通信エラー": "网络错误", "設定内容を確認してください": "请检查设置内容", "注文があるスタッフは削除・改名できません": "已有订单的员工暂不能删除或改名", "氏名と電話番号を入力してください": "请输入姓名和电话号码", "必須項目を確認してください": "请检查必填项", "顧客が見つかりません": "客户不存在", "更新内容が不正です": "更新内容无效", "担当者とステータスを確認してください": "请检查负责人和状态", "6000文字以内で入力してください": "请输入不超过 6000 字的内容", "処理に失敗しました。時間をおいて再度お試しください。": "操作失败，请稍后重试。", "見つかりません": "未找到", "ブランド名": "品牌名称", "テーマカラー": "主题强调色", "スタッフ名簿": "员工名单", "1行に1名を入力してください。注文のあるスタッフの名前は保持してください。": "每行填写一位员工。已有订单的员工请保留原名。", "表示名、テーマカラー、担当スタッフを変更できます。": "可修改品牌名称、主题色和负责人员。", "設定を保存": "保存设置", "設定を保存しました": "设置已保存", "回収管理システム": "回收管理系统", "回収業務を、もっとスムーズに。": "简化回收工作流程。", "スマート回収管理": "智能回收管理", "回収管理": "让闲置物品继续发挥价值。", "例：冷蔵庫1台、洗濯機1台": "例如：冰箱 1 台、洗衣机 1 台", "都道府県・市区町村・番地・建物名": "都道府县、市区町村、门牌号及楼名", "階数・エレベーターの有無など": "楼层、是否有电梯等", "件": "单", "名": "人"};
Object.assign(chinese, {"回収のご案内": "回收服务指南", "回収サービスのご案内": "回收服务指南", "品目一覧・電話でのご相談": "查看回收品类及联系电话", "お客様向け案内を見る →": "查看客户指南 →", "家電・電子機器": "家电与电子设备", "壊れている品物や年式の古い品物もご相談ください。": "损坏或型号较旧的物品也可咨询。", "オンラインで申し込む →": "在线申请 →", "電話で相談": "电话咨询", "回収品目の例": "常见回收物品", "品目や状態によって回収条件が異なります。費用や回収可否は事前にお問い合わせください。": "回收条件视物品及其状态而定，请提前咨询能否回收及相关费用。", "電話でのお問い合わせ": "电话咨询", "受付時間": "服务时间", "回収案内の編集": "编辑回收指南", "会社名": "公司名称", "電話番号を1行に1件入力してください。": "每行填写一个电话号码。", "回収品目（日中）": "回收品类（日中双语）", "1行につき「日本語カテゴリ | 中文分类 | 日本語の品目 | 中文品目」の順で入力してください。": "每行按「日语分类 | 中文分类 | 日语物品 | 中文物品」填写。", "回収案内の設定をご確認ください": "请检查回收指南设置"});
let language = 'ja';
const originalText = new WeakMap();
const originalAttrs = new WeakMap();
function translate(text) {
  if (language !== 'zh') return text;
  const trimmed = text.trim();
  if (Object.hasOwn(chinese,trimmed)) return text.replace(trimmed,chinese[trimmed]);
  if (/^\s*\d+\s*(件|名|件のオーダーが未割当です)\s*$/.test(text)) {
    return text.replace(/件のオーダーが未割当です|件|名/g,key=>chinese[key]);
  }
  if (trimmed.startsWith('抽出した希望日時')) {
    return text.replace('抽出した希望日時',chinese['抽出した希望日時'])
      .replace('検出できませんでした',chinese['検出できませんでした'])
      .replace('。下の日時欄で指定してください。',chinese['。下の日時欄で指定してください。']);
  }
  const prefix = text.match(/^([＋✓✧]\s*)(.*?)(\s*→)?$/);
  if (prefix && Object.hasOwn(chinese,prefix[2])) return prefix[1]+chinese[prefix[2]]+(prefix[3]||'');
  const required = text.match(/^(.*?)(\s+\*)$/);
  if (required && Object.hasOwn(chinese,required[1])) return chinese[required[1]]+required[2];
  return text.replace(/(ワークスペース)(?=　)|スマート回収管理|回収スタッフ(?= \/ TEAM)/g,key=>chinese[key]);
}
function localize() {
  for(const label of document.querySelectorAll('[data-ja][data-zh]')){
    const value=label.dataset[language];
    if(label.textContent!==value) label.textContent=value;
  }
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'ja';
  document.title = (data.config?.brand||'日和')+' | '+translate('回収管理システム');
  const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for (let node=walker.nextNode();node;node=walker.nextNode()) {
    if (node.parentElement.closest('script,style,[data-record]')) continue;
    const previous = originalText.get(node);
    const original = previous && node.nodeValue===previous.display ? previous.original : node.nodeValue;
    const display = translate(original);
    originalText.set(node,{original,display});
    if (node.nodeValue!==display) node.nodeValue=display;
  }
  for (const element of document.querySelectorAll('[placeholder],[aria-label]')) {
    let previous=originalAttrs.get(element)||{};
    for (const attribute of ['placeholder','aria-label']) {
      const current=element.getAttribute(attribute);
      if (current===null) continue;
      const original=previous[attribute]?.display===current ? previous[attribute].original : current;
      const display=translate(original);
      previous[attribute]={original,display};
      if (display!==current) element.setAttribute(attribute,display);
    }
    originalAttrs.set(element,previous);
  }
}
function guide() {
  const flyer=data.config.flyer;
  const firstPhone=flyer.phones[0].replace(/[^0-9+]/g,'');
  $('#app').innerHTML='<section class="flyerHero">'
    +'<p class="flyerCompany" data-record>'+esc(flyer.company)+'</p>'
    +'<h1><span>家電・電子機器</span><br><span>回収のご案内</span></h1>'
    +'<p>壊れている品物や年式の古い品物もご相談ください。</p>'
    +'<div class="flyerActions"><button class="primary" onclick="go(\'request\')">オンラインで申し込む →</button>'
    +'<a class="secondary" href="tel:'+esc(firstPhone)+'">電話で相談</a></div></section>'
    +'<section class="flyerCatalog"><h2>回収品目の例</h2><div class="catalogGrid">'
    +flyer.services.map(row=>'<article class="catalogCell"><h3 data-ja="'+esc(row[0])+'" data-zh="'+esc(row[1])+'" data-record>'+esc(row[0])+'</h3><p data-ja="'+esc(row[2])+'" data-zh="'+esc(row[3])+'" data-record>'+esc(row[2])+'</p></article>').join('')
    +'</div><p class="hint">品目や状態によって回収条件が異なります。費用や回収可否は事前にお問い合わせください。</p></section>'
    +'<section class="flyerContact"><div><h2>電話でのお問い合わせ</h2><p><span>受付時間</span> <span data-record>'+esc(flyer.hours)+'</span></p></div>'
    +'<div>'+flyer.phones.map(phone=>'<a href="tel:'+esc(phone.replace(/[^0-9+]/g,''))+'">'+esc(phone)+'</a>').join('')+'</div></section>'+footer();
}
function applyBrand() {
  const {brand,color}=data.config;
  $('.brand').innerHTML='<span data-record>'+esc(brand)+'</span><i>▰</i>';
  document.documentElement.style.setProperty('--pink',color);
  const [r,g,b]=color.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  document.documentElement.style.setProperty('--accent-text',.2126*r+.7152*g+.0722*b>.179?'#111':'#fff');
}
function settings() {
  const config=data.config;
  if(!config) return;
  $('#app').innerHTML=heading('WORKSPACE SETTINGS','設定','表示名、テーマカラー、担当スタッフを変更できます。')
    +'<form class="panel formpanel" id="settingsform">'
    +'<div class="field"><label for="brandname">ブランド名</label><input id="brandname" name="brand" required maxlength="30" value="'+esc(config.brand)+'"></div>'
    +'<div class="field"><label for="accent">テーマカラー</label><input id="accent" name="color" type="color" value="'+esc(config.color)+'" style="height:48px;max-width:140px;padding:6px"></div>'
    +'<div class="field"><label for="roster">スタッフ名簿</label><textarea id="roster" name="roster" required>'+esc(staffs.join('\n'))+'</textarea><p class="hint">1行に1名を入力してください。注文のあるスタッフの名前は保持してください。</p></div>'
    +'<section class="flyerSettings"><h2>回収案内の編集</h2>'
    +'<div class="field"><label for="company">会社名</label><input id="company" name="company" required maxlength="60" value="'+esc(config.flyer.company)+'"></div>'
    +'<div class="field"><label for="hours">受付時間</label><input id="hours" name="hours" required maxlength="40" value="'+esc(config.flyer.hours)+'"></div>'
    +'<div class="field"><label for="phones">電話番号</label><textarea id="phones" name="phones" required>'+esc(config.flyer.phones.join('\n'))+'</textarea><p class="hint">電話番号を1行に1件入力してください。</p></div>'
    +'<div class="field"><label for="services">回収品目（日中）</label><textarea id="services" name="services" rows="8" required>'+esc(config.flyer.services.map(row=>row.join(' | ')).join('\n'))+'</textarea><p class="hint">1行につき「日本語カテゴリ | 中文分类 | 日本語の品目 | 中文品目」の順で入力してください。</p></div></section>'
    +'<button class="primary">設定を保存</button></form>'+footer();
  $('#settingsform').onsubmit=async event=>{
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    const settings={brand:fields.get('brand').trim(),color:fields.get('color'),staffs:fields.get('roster').split(/\r?\n/).map(name=>name.trim()).filter(Boolean)};
    const lines=name=>fields.get(name).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    settings.flyer={company:fields.get('company').trim(),hours:fields.get('hours').trim(),phones:lines('phones'),services:lines('services').map(line=>line.split('|').map(cell=>cell.trim()))};
    try {
      await api('settings','PUT',settings);
      await refresh();
      toast('設定を保存しました');
    } catch(error) {toast(error.message)}
  };
}
$('#language').value=language;
$('#language').onchange=event=>{
  language=event.target.value;
  localStorage.setItem('hiyori-language',language);
  localize();
};
new MutationObserver(localize).observe(document.body,{subtree:true,childList:true,characterData:true});
localize();

refresh().catch(e=>{$('#app').innerHTML='<div class="panel formpanel"><h1>接続できませんでした</h1><p>データベースへの接続を確認してください。</p><button class="primary" onclick="location.reload()">再試行</button></div>';toast(e.message)});
