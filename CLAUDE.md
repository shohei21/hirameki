# Hirameki

ジェームス・W・ヤング『アイデアのつくり方』ベースのアイデア創出パートナーbot (Webチャットアプリ)。

- 設計書: `docs/DESIGN.md`(必読・Phase4のBYOK化以前の内容が中心。最新構成はREADME.mdも参照)/ タスク: `docs/TASKS.md`
- 体制: Fable 5 が設計・レビュー、Sonnet 5 サブエージェントがタスクカード単位で実装
- スタック(Phase4以降・BYOK静的アプリ): npm workspaces(client のみ) / Vite+React18+TS strict+Zustand + `@anthropic-ai/sdk`(ブラウザから直接呼び出し)。server/ は廃止済み
- モデル: 設定画面(歯車アイコン)でユーザーが選択。既定 `claude-opus-4-8` / 選択可 `claude-sonnet-5`
- 起動: `npm run dev`(client のみ、http://localhost:5173)。APIキーは設定画面で入力し、この端末の localStorage(`hirameki:v1:settings`)にのみ保存
- 規約: TS strict・`any`禁止。プロンプト文言(`client/src/lib/prompts.ts`)は DESIGN.md §6 が正、勝手に変えない
