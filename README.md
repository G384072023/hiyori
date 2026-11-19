# 日和 回収管理システム

| 画面 | URL |
| --- | --- |
| お客様 | https://hiyori-recycle.hiyori-recycle.workers.dev/customer |
| 管理者 | https://hiyori-recycle.hiyori-recycle.workers.dev/admin/ |
| スタッフ a | https://hiyori-recycle.hiyori-recycle.workers.dev/employee/ |

管理者とスタッフは別のアカウントでログインします。ログイン情報は別紙で管理します。

操作方法は [system/README.md](system/README.md)、公開環境の設定は [system/CLOUD-DEPLOY.md](system/CLOUD-DEPLOY.md) を参照してください。

画面・APIはCloudflare Workers、データはD1に保存します。日本語の情報抽出はWorkers AIを使用します。ソースはsystemフォルダーにあります。