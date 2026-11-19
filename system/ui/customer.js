// Customer-only behavior: language, structured suggestions, and submission.
// Keep suggestions editable; only a confirmed form submission writes to the database.
const language=document.querySelector('#language');
const requestForm=document.querySelector('#request');
const result=document.querySelector('#result');
const extracted=document.querySelector('#extracted');
let submission=null, extraction=null;
const message=(ja,zh)=>language.value==='zh'?zh:ja;
function renderLanguage() {
  document.documentElement.lang=language.value==='zh'?'zh-CN':'ja';
  document.querySelectorAll('[data-ja]').forEach(node=>node.textContent=node.dataset[language.value]);
  if(submission)result.textContent=message(...submission);
  if(extraction)extracted.textContent=message(...extraction);
}
language.value='ja';
language.onchange=()=>{try{localStorage.setItem('hiyori-language',language.value)}catch{}renderLanguage()};
renderLanguage();
async function send(path,body) {
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)throw Error(String(response.status));
  return response.json();
}
requestForm.onsubmit=async event=>{
  event.preventDefault();
  const button=document.querySelector('#send');
  button.disabled=true;
  try {
    const {orderId}=await send('/api/public/request',Object.fromEntries(new FormData(requestForm)));
    requestForm.reset();
    extracted.textContent='';extraction=null;
    submission=['受付番号：'+orderId,'申请编号：'+orderId];
  } catch(error) {
    submission=error.message==='400'?['入力内容をご確認ください。','请核对填写的信息。']:['送信できませんでした。再度お試しください。','提交失败，请重试。'];
  } finally {button.disabled=false;renderLanguage()}
};
document.querySelector('#extract').onclick=async event=>{
  const button=event.currentTarget;
  button.disabled=true;
  try {
    const raw=document.querySelector('#raw').value.trim();
    if(!raw){extraction=['依頼文を入力してください。','请输入日语申请内容。'];return}
    const data=await send('/api/public/extract',{text:raw});
    for(const field of ['items','address']) if(data[field])requestForm.elements[field].value=data[field];
    const model=data.mode==='model';
    extraction=[
      (model?'モデル抽出':'ルールによるデモ')+'｜希望日時：'+(data.appointment||'未検出')+'。下の日時欄で確認してください。',
      (model?'模型提取':'规则演示')+'｜期望时间：'+(data.appointment||'未识别')+'。请在下方核对并选择。',
    ];
  } catch(error) {
    extraction=error.message==='503'
      ?['モデルに接続できません。Ollama と設定を確認してください。','无法连接模型，请检查 Ollama 是否运行以及模型配置。']
      :['抽出できませんでした。手動で入力してください。','提取失败，请手动填写。'];
  }
  finally {button.disabled=false;renderLanguage()}
};
