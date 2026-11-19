# 公開環境の設定

GitHub はソースを管理し、Cloudflare Workers が画面・API・認証を実行します。データは Cloudflare D1 に保存します。AI は Workers AI を使用します。すべて同じ公開アドレスで動作します。

## 初回設定

Cloudflare の Free プランでログインします。GitHub の `system` ディレクトリをローカルに取得し、そのフォルダーで実行します。

```sh
npm install
npx wrangler login
npm run cloud:setup
npm run deploy
```

`cloud:setup` は D1 を作成し、設定ファイルに返されたIDを保存します。再実行時は同名DBを検索して再利用します。テーブルはSQLマイグレーションで作成します。管理者・スタッフのパスワードは Wrangler の入力画面で設定します。公開環境は異なる12文字以上のパスワードを使用します。パスワードは Cloudflare のシークレットに保存され、GitHubには含めません。ローカル確認用のパスワードとは別に設定します。

公開後、Wrangler が表示した `https://…workers.dev` アドレスで次のURLを開きます。

- `/customer` — お客様の申込
- `/admin/` — 管理者（admin）
- `/employee/` — スタッフ a（employee）

お客様が送信した依頼文は、抽出操作時に Cloudflare Workers AI で処理されます。返された物品・住所・日時を確認してから申し込みます。AI の無料枠を使い切った場合は抽出エラーが表示されます。必要な項目を手入力して申し込めます。データベースはローカル版と別です。

## GitHub からの更新

初回設定後の `wrangler.jsonc`（DBのIDを含む）を `system` フォルダーに反映します。Cloudflare の Worker 設定で GitHub リポジトリを接続すると、push ごとに再公開できます。

- Root directory: `system`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`

GitHub Pages は従来の表示確認用ページです。公開システムへのリンクは Workers の公開アドレス確定後に更新します。実データやローカルの `hiyori.sqlite` は GitHub にアップロードしないでください。
