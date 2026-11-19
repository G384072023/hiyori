// The server selects the signed-in employee's orders and checks each status change.
const language = document.querySelector('#language');
const jobs = document.querySelector('#jobs');
const message = document.querySelector('#message');
const title = document.querySelector('#employee');
let orders = [];
let busy = false;
const t = (ja, zh) => language.value === 'zh' ? zh : ja;
const labels = {'回収予定':'待回收','回収中':'回收中','回収完了':'回收完成'};
language.value = 'ja';

function render() {
  document.documentElement.lang = t('ja','zh-CN');
  document.querySelectorAll('[data-ja]').forEach(node => { node.textContent = node.dataset[language.value]; });
  const cards = orders.map(order => {
    const card = document.createElement('article');
    card.className = 'job';
    const add = (element, value) => {
      const node = document.createElement(element);
      node.textContent = value;
      card.append(node);
      return node;
    };
    const badge = add('span',t(order.status,labels[order.status]||order.status));
    badge.className = 'badge b'+order.status;
    add('h2',order.items);
    for (const value of [order.id,order.appointment.replace('T',' '),order.address,order.customer_name,order.note]) {
      if (value) add('p',value);
    }
    const next = {'回収予定':'回収中','回収中':'回収完了'}[order.status];
    if (next) {
      const button = add('button',next==='回収中'?t('回収を開始','开始回收'):t('回収完了にする','标记回收完成'));
      button.className = 'primary';
      button.disabled = busy;
      button.onclick = () => update(order.id,next);
    }
    return card;
  });
  jobs.replaceChildren(...cards);
  if (!cards.length) jobs.textContent=t('担当オーダーはありません。','目前没有分配给你的订单。');
}
language.onchange = () => {
  localStorage.setItem('hiyori-language',language.value);
  render();
};
async function load() {
  const response = await fetch('/employee/api/orders');
  if (!response.ok) throw Error('load');
  const data = await response.json();
  title.textContent = data.employee;
  orders = data.orders;
  render();
}
async function update(id,status) {
  if(busy)return;
  busy=true;
  render();
  try {
    const response = await fetch('/employee/api/orders/'+encodeURIComponent(id),{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status}),
    });
    if(!response.ok)throw Error('change');
    await load();
    message.textContent=t('保存しました。','状态已保存。');
  } catch {
    message.textContent=t('更新できませんでした。最新の担当一覧を確認してください。','更新失败，请刷新查看最新任务。');
  } finally {
    busy=false;
    render();
  }
}
function refresh() {
  load().catch(()=>{message.textContent=t('担当一覧を取得できませんでした。','无法读取任务列表。');});
}
document.querySelector('#reload').onclick=refresh;
render();
refresh();
