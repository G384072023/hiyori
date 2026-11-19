// Admin-only account editor. Password values are never returned by the account API.
let accountList = [];
let currentAccountId = '';

async function accountsPage() {
  $('#app').innerHTML = heading('', 'アカウント管理', 'ログイン情報と利用状態を管理します。');
  try {
    const result = await api('accounts');
    if (page !== 'accounts') return;
    accountList = result.accounts;
    currentAccountId = result.currentId;
    $('#app').innerHTML = heading('', 'アカウント管理', 'ログイン情報と利用状態を管理します。',
      '<button class="primary" onclick="newAccount()">＋ アカウント追加</button>') +
      '<section class="panel"><div class="tablewrap"><table><thead><tr>' +
      '<th>ユーザー名</th><th>権限</th><th>スタッフID</th><th>利用状態</th><th>操作</th>' +
      '</tr></thead><tbody>' + accountList.map(account => {
        const role = account.role === 'admin' ? '管理者' : 'スタッフ';
        const own = account.id === currentAccountId ? '（自分）' : '';
        return '<tr><td><span data-record>' + esc(account.username) + '</span>' + own +
          '</td><td>' + role + '</td><td data-record>' + esc(account.staff_name || '—') +
          '</td><td>' + (account.enabled ? '利用中' : '利用停止') +
          '</td><td><button class="link" onclick="changeAccountPassword(\'' + account.id +
          '\')">パスワード変更</button> <button class="link" onclick="toggleAccount(\'' + account.id +
          '\')">' + (account.enabled ? '利用停止にする' : '利用を再開') + '</button></td></tr>';
      }).join('') + '</tbody></table></div><p class="note">利用停止したスタッフの未完了オーダーは、未割当に戻ります。完了履歴は残ります。</p></section>' + footer();
  } catch (error) { toast(error.message); }
}
function newAccount() {
  modal('<h1 style="font-size:22px">アカウント追加</h1><form id="accountCreate">' +
    '<div class="field"><label for="accountRole">権限</label><select id="accountRole" name="role">' +
    '<option value="employee">スタッフ</option><option value="admin">管理者</option></select></div>' +
    '<div class="field"><label for="accountUsername">ユーザー名</label><input id="accountUsername" name="username" required pattern="[a-zA-Z0-9._-]{1,32}" maxlength="32" autocomplete="off"><p class="hint">半角英数字・ピリオド・ハイフン・アンダースコア</p></div>' +
    '<div class="field" id="staffAccountField"><label for="accountStaff">スタッフID（配車時の表示名）</label><input id="accountStaff" name="staff_name" maxlength="50" required placeholder="b"></div>' +
    '<div class="field"><label for="accountPassword">パスワード（6文字以上）</label><input id="accountPassword" name="password" type="password" minlength="6" maxlength="128" autocomplete="new-password" required></div>' +
    '<button class="primary">登録する</button><p id="accountError" role="status"></p></form>');
  $('#accountRole').onchange = event => {
    const staffRole = event.target.value === 'employee';
    $('#staffAccountField').hidden = !staffRole;
    $('#accountStaff').required = staffRole;
  };
  $('#accountCreate').onsubmit = async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      await api('accounts', 'POST', values);
      closeModal();
      await refresh();
      toast('アカウントを登録しました。');
    } catch (error) {
      $('#accountError').textContent = error.message;
      button.disabled = false;
    }
  };
}
function changeAccountPassword(id) {
  const account = accountList.find(item => item.id === id);
  if (!account) return;
  modal('<h1 style="font-size:22px">パスワード変更</h1><p data-record>' + esc(account.username) +
    '</p><form id="accountPasswordForm"><div class="field"><label for="newPassword">新しいパスワード（6文字以上）</label>' +
    '<input id="newPassword" name="password" type="password" minlength="6" maxlength="128" autocomplete="new-password" required></div>' +
    '<div class="field"><label for="confirmPassword">パスワード確認</label><input id="confirmPassword" name="confirmation" type="password" minlength="6" maxlength="128" autocomplete="new-password" required></div>' +
    '<button class="primary">変更を保存</button><p id="passwordError" role="status"></p></form>');
  $('#accountPasswordForm').onsubmit = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.confirmation) {
      $('#passwordError').textContent = 'パスワードが一致しません。';
      return;
    }
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const result = await api('accounts/' + id, 'PATCH', {action: 'password', password: values.password});
      if (result.reauthenticate) { location.assign('/admin/login'); return; }
      closeModal();
      toast('パスワードを変更しました。対象者は再ログインしてください。');
    } catch (error) {
      $('#passwordError').textContent = error.message;
      button.disabled = false;
    }
  };
}
function toggleAccount(id) {
  const account = accountList.find(item => item.id === id);
  if (!account) return;
  modal('<h1 style="font-size:22px">' + (account.enabled ? '利用停止にする' : '利用を再開') +
    '</h1><p data-record>' + esc(account.username) + '</p>' +
    (account.role === 'employee' && account.enabled ? '<p>未完了のオーダーは未割当に戻ります。</p>' : '') +
    '<button class="primary" id="accountToggleConfirm">変更を保存</button><p id="toggleError" role="status"></p>');
  $('#accountToggleConfirm').onclick = async event => {
    event.currentTarget.disabled = true;
    try {
      const result = await api('accounts/' + id, 'PATCH', {action: account.enabled ? 'disable' : 'enable'});
      if (result.reauthenticate) { location.assign('/admin/login'); return; }
      closeModal();
      await refresh();
    } catch (error) {
      $('#toggleError').textContent = error.message;
      $('#accountToggleConfirm').disabled = false;
    }
  };
}
