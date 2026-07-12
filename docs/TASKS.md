# Hirameki 実装タスクカード

実装者: Sonnet 5 サブエージェント。**必ず docs/DESIGN.md を先に読むこと。**
各タスクは受け入れ基準(AC)を全て満たして完了。TypeScriptはstrict。`any`禁止(やむを得ない場合は`unknown`+絞り込み)。

## Phase 1: 基盤

### T1 モノレポscaffold
- npm workspaces ルート(`package.json`: `client`, `server`)
- `client/`: Vite + React 18 + TS strict。`vite.config.ts` に `/api` → `http://localhost:8788` のproxy
- `server/`: Express + `@anthropic-ai/sdk` + `dotenv`。TS。`tsx watch` で開発起動
- ルートscripts: `npm run dev`(client+server並行起動、`concurrently`可)、`npm run build`、`npm run typecheck`(両workspace)
- `server/.env.example`(`ANTHROPIC_API_KEY=`, `HIRAMEKI_MODEL=claude-opus-4-8`, `PORT=8787`)、`.gitignore`(node_modules, dist, .env)
- **AC**: `npm run dev` で両方起動し、ブラウザで仮ページが表示される。`npm run typecheck` green

### T2 型・ストレージ・ストア
- `client/src/types.ts`: DESIGN.md §3 の全型
- `client/src/lib/storage.ts`: localStorageリポジトリ。キー`hirameki:v1:*`、schemaVersion付きエンベロープ、JSON破損時は空で初期化(consoleに警告)
- `client/src/store.ts`: Zustand。projects/activeProjectId/cards/combinations/sparks/messages のCRUDアクション、全アクションでstorageへ永続化。メッセージはプロジェクトごと500件で間引き
- **AC**: 単体テスト(vitest)でstorageのround-trip・破損時初期化・500件間引きが通る。typecheck green

### T3 サーバーAPI
- `server/src/prompts.ts`: DESIGN.md §6 のプロンプト全文を定数化(**一言一句そのまま**)。`buildContext()` で<context>文字列を組み立て
- `server/src/index.ts`: Express。`GET /api/health`、`POST /api/chat`(SSE)、`POST /api/extract`(構造化出力)。DESIGN.md §4 の仕様どおり
  - chat: `client.messages.stream()`, `thinking: {type: "adaptive"}`, systemブロック1に`cache_control`
  - extract: `output_config.format` json_schema(`additionalProperties: false`)
  - APIキー未設定時: health は `hasApiKey: false`、chat/extract は 503 + `{error: "no_api_key"}`
  - SDKの型付き例外で分岐し、SSEは `event: error` で返す
- **AC**: キー未設定状態で `curl /api/health` が `hasApiKey:false`、`/api/chat` が503を返す。キーがある場合の動作はコードレビューで確認(実呼び出しはPhase 3)。typecheck green

## Phase 2: UI

### T4 チャットUI
- `client/src/components/Chat.tsx`: メッセージリスト(user右/assistant左)、SSE受信(`fetch`+ReadableStream)でストリーミング逐次描画、送信中は入力disable
- `client/src/lib/api.ts`: chat(SSEパーサ)/extract/health のクライアント
- エラー時: メッセージ末尾に「(中断されました)」+再送ボタン
- APIキー未設定(healthで判定): チャット欄に `server/.env` 設定手順の案内カード
- リクエスト組み立て: store から stage/question/cards(≤50)/combinations/sparks/messages(直近30往復) を渡す
- **AC**: キー未設定でも UI が壊れず案内が出る。モックSSE(vitestでパーサ単体)green。typecheck green

### T5 プロジェクト管理 + ステージステッパー
- ヘッダー: プロジェクト選択ドロップダウン、新規作成モーダル(title, question)、削除(確認付き)
- 左カラム: 5ステージのステッパー(DESIGN.md §5)。クリックで `project.stage` 更新。現在ステージの説明1行を表示
- 孵化ステージ: バナー表示、`incubateUntil` 設定UI(日時)、期限後の再訪時に「何か閃いた?」表示
- **AC**: プロジェクト作成→ステージ移動→リロードで状態復元。typecheck green

### T6 ワークベンチ
- 右カラム タブ3つ: 素材カード / 組み合わせ / 閃きメモ(DESIGN.md §5)
- 素材カード: kind別バッジ、手動追加(kind選択+テキスト)、編集・削除。「素材を抽出」ボタン → /api/extract → 候補リスト → 個別に承認/破棄
- 組み合わせ: カード2枚以上選択→「botに相談」でチャットへ定型文送信(「カードAとカードBの組み合わせについて考えたい: ...」)。メモ手動追加・削除
- 閃きメモ: 一覧+追加+削除。**右下フローティング「+閃きを記録」ボタン(全ステージ共通)**
- **AC**: カードCRUD・組み合わせ相談の定型文送信・閃きフローティングボタンが動作(チャット送信はキー未設定なら案内表示のままでよい)。typecheck green

## Phase 3: 仕上げ

### T7 スタイルと磨き込み
- `styles.css`: 紙のような落ち着いた配色、3カラムレイアウト(左200px/中央可変/右320px)、モバイルは考慮不要
- ストリーミング中のタイピングインジケータ、カード追加時のさりげないハイライト
- 空状態の文言(プロジェクトなし/カードなし等)をヤングの言葉を借りて温かく
- **AC**: 目視レビューで3カラムが崩れない。typecheck green

### T8 動作確認 + README
- `README.md`: セットアップ(npm i → .env → npm run dev)、5ステージの使い方、アーキテクチャ図1枚
- キー未設定E2E: 起動→プロジェクト作成→カード追加→ステージ一巡→リロード復元 を手動確認しチェックリストをタスク結果に記載
- (キーが設定されていれば)実チャット1往復とextractを確認し、serverログにcache_read_input_tokensが出ることを確認
- **AC**: READMEどおりに新規環境で起動できる内容になっている

## 進捗

| Task | 状態 | 備考 |
|------|------|------|
| T1 | 完了 | npm workspaces scaffold。typecheck/dev/build 確認済み |
| T2 | 完了 | storage.ts + store.ts。vitest 7件 green |
| T3 | 完了 | prompts.ts(DESIGN.md §6 一言一句)+ Express API。キー未設定時の健全性確認済み |
| T4 | 完了 | Chat.tsx + lib/api.ts(SSEパーサ/health/extract) + lib/useChatController.ts。会話履歴は必ずuser境界でトリミング(api.tsのbuildChatMessages)。vitest 6件追加、全13件green |
| T5 | 完了 | ProjectHeader.tsx(選択/新規作成/削除) + StageStepper.tsx + IncubateBanner.tsx。App.tsxで3カラム合成 |
| T6 | 完了 | Workbench.tsx(カード/組み合わせ/閃きタブ) + SparkFab.tsx(全ステージ共通フローティングボタン)。/api/extract候補の承認/破棄はuseChatController経由でCardsTabに表示 |
| T7 | 完了 | タイピングインジケータ(chat-bubble--streaming内)、素材カード追加時のハイライトアニメーション(card-item--new)、空状態文言をヤングの言葉を借りて温かく更新。3カラムレイアウトはT5/T6で実装済みのものを目視確認 |
| T8 | 完了 | README.md作成(セットアップ/5ステージ/アーキテクチャ図)。server/src/index.tsに/api/chatと/api/extractのusageログ追加(input/output/cache_creation/cache_read)。キー未設定E2EをPlaywright(planet-messenger借用)で自動化、17項目全てPASS。スクリーンショットをdocs/screenshots/に保存。実チャットはANTHROPIC_API_KEY未設定のため未確認、READMEに確認手順を記載 |

## Phase 4: スマホ対応 + 配布可能化 (BYOK静的アプリ化)

背景: 「スマホ単独で外でも使える」「他者への配布・販売も視野」という要件により、
Expressサーバーを廃止し、**ブラウザから直接Anthropic APIを呼ぶ静的アプリ(BYOK)**へ移行する。
APIキーは各ユーザーが設定画面で入力し、その端末のlocalStorageにのみ保存される。

### T9 BYOK化(サーバー廃止・ブラウザ直接呼び出し)
- `client` に `@anthropic-ai/sdk` を追加。`new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`
- `server/src/prompts.ts` を `client/src/lib/prompts.ts` へ**一言一句そのまま**移設(buildContext含む)
- `client/src/lib/api.ts` を改修: chat は SDK の `client.messages.stream()`(`thinking: {type:"adaptive"}`, systemブロック1に`cache_control`)、extract は `messages.create()` + `output_config.format`(既存サーバー実装と同仕様)。SSE手書きパーサは不要になるので削除し、既存の `ChatStreamHandlers`(onDelta/onDone/onError) インターフェースは維持してUI変更を最小化
- 設定UI: ヘッダーに歯車アイコン→モーダル。APIキー(パスワード入力、localStorage `hirameki:v1:settings` に保存)、モデル選択(`claude-opus-4-8` / `claude-sonnet-5`)。「キーはこの端末にのみ保存され、Anthropic以外には送信されません」と明記
- キー未設定時: 旧「server/.env案内」を「設定画面でAPIキーを入力してください」案内に差し替え
- エラーは SDK の型付き例外(401→キー無効の案内、429→レート制限、他)で分岐
- `server/` workspace と vite proxy を削除。ルートscriptsを client のみに簡素化
- **AC**: typecheck/test/build green。キー未設定→案内表示、無効キー→401案内(モック)。既存vitestが通る(SSEパーサのテストは削除し、履歴トリミング等のテストは維持)

### T10 レスポンシブUI(スマホ対応)
- ブレークポイント 900px 未満: 1カラム+下部タブバー(ステージ / チャット / ワークベンチ)。チャットが初期タブ
- 閃きFABはタブバーの上に浮かせる。モーダル(新規作成/設定)は全幅
- チャット入力欄はスマホで固定フッター化、iOSセーフエリア(env(safe-area-inset-bottom))考慮
- ステージステッパーはスマホでは横スクロールのチップ列でも可(実装しやすい方)
- **AC**: 375px幅(iPhone SE相当)でPlaywright(planet-messenger借用, .cjs)によるスクリーンショットを撮り、3タブ切替・チャット・カード追加・FABが操作可能。PC幅では従来の3カラム維持

### T11 PWA化 + GitHub Pagesデプロイ準備
- `manifest.webmanifest`(name: Hirameki, theme紙色, アイコン192/512はSVGから生成した単純な電球等でよい)+ apple-touch-icon
- ホーム画面追加で単体アプリ風に開ける(service workerは最小: 導入しない判断でも可、その場合README に理由を記載)
- `vite.config.ts`: `base: process.env.HIRAMEKI_BASE ?? "/"`(GitHub Pagesのサブパス対応)
- `.github/workflows/deploy.yml`: main への push で `HIRAMEKI_BASE=/hirameki/ npm run build` → GitHub Pages へデプロイ(actions/deploy-pages)
- README更新: BYOKの説明(キーの扱い・自己責任)、スマホでの使い方(ホーム画面追加)、デプロイ手順
- **AC**: `npm run build` green。`npx vite preview` でmanifestが配信される。workflowはYAML構文チェックのみ(push はしない)

## 進捗(Phase 4)

| Task | 状態 | 備考 |
|------|------|------|
| T9 | 完了 | server/廃止・client/src/lib/prompts.ts へ一言一句そのまま移設。client/src/lib/api.ts をSDK直呼び(`dangerouslyAllowBrowser: true`)に書き換え、SSE手書きパーサは削除。設定画面(歯車アイコン→SettingsModal)でAPIキー(localStorage `hirameki:v1:settings`)・モデル(`claude-opus-4-8`/`claude-sonnet-5`)を保存。エラーはSDK型付き例外(AuthenticationError/RateLimitError/APIError)で分岐。vitestに@anthropic-ai/sdkモックでキー未設定・401・429分岐のテストを追加、SSEパーサのテストは削除。ルートpackage.jsonをclientのみのworkspaceに簡素化、vite.config.tsのproxy削除 |
| T10 | 完了 | App.tsxに900px未満用のmobileTab状態(ステージ/チャット/ワークベンチ、初期値チャット)を追加し、main-layoutにdata-active-tab属性で連動。styles.cssに900px未満のメディアクエリを追加: 1カラム化、下部固定タブバー、チャット入力欄の固定フッター化(env(safe-area-inset-bottom)考慮)、閃きFABをタブバー上に再配置、モーダル全幅化。ステージステッパーは横スクロールチップ列にはせず既存の縦リストのまま(タブとして全画面表示されるため縦リストで十分と判断) |
| T11 | 完了 | client/public/manifest.webmanifest(name/theme/アイコン192/512)+ apple-touch-icon.png。アイコンはNode組み込みzlibで生成した自作PNGエンコーダでSVGなしの単純な電球図形として作成(外部ツール不要)。Service Workerは導入しない判断とし、README.mdに理由を明記。vite.config.tsに`base: process.env.HIRAMEKI_BASE ?? "/"`を追加済み(T9で実施)。.github/workflows/deploy.ymlを新規作成(main push → HIRAMEKI_BASE=/hirameki/ npm run build → actions/deploy-pages、workflow_dispatchも許可)。YAML構文はpython yamlでロード確認済み。git操作は一切行っていない。README.mdをBYOK/スマホ使用法/デプロイ手順で全面更新 |

## Phase 5: スマホ実使用フィードバック対応

### T12 エラー表示・ズーム・データエクスポート
背景: スマホ実機での初使用で3件のフィードバック。
1. **エラーメッセージの人間化** (client/src/lib/api.ts のエラー分岐拡張):
   - `Anthropic.BadRequestError` で message に "credit balance is too low" を含む場合 →「Anthropicのクレジット残高が不足しています。console.anthropic.com の Plans & Billing でクレジットを購入してください(APIキー自体は有効です)」
   - その他の `BadRequestError` → 生JSONを出さず「リクエストエラー: (messageのみ)」
   - `Anthropic.APIConnectionError` →「ネットワークに接続できません。電波状況を確認して再送してください」
   - 判定は型付き例外+messageの部分一致(このケースはAPIがエラー種別を分けていないためやむを得ない)。UIのエラー表示が長文JSONで溢れないよう word-break と最大高さも整える
2. **iOS自動ズーム防止**: input/textarea/select の font-size をモバイル(899px以下)で16px以上に統一。viewportメタに user-scalable=no は**使わない**(アクセシビリティ)。送信後にフォーカスが残って画面が寄る問題があれば blur で戻す
3. **データのエクスポート/インポート** (設定モーダルに追加):
   - エクスポート: 全データ(projects/cards/combinations/sparks/messages/schemaVersion)を1つのJSONにまとめ `hirameki-backup-YYYYMMDD.json` としてダウンロード(Blob+aタグ)
   - インポート: ファイル選択→スキーマ検証(不正なら中断しエラー表示)→「現在のデータを上書きします」確認→storageへ書き込み→リロード
   - settings(APIキー)は**含めない**(バックアップファイル経由のキー流出防止)
- **AC**: typecheck/test/build green。エラー3分岐の単体テスト(SDKモック)。エクスポート→インポートのround-tripテスト。モバイル幅で入力欄フォントが16px以上であることをPlaywrightで確認

## 進捗(Phase 5)

| Task | 状態 | 備考 |
|------|------|------|
| T12 | 完了 | client/src/lib/api.ts: formatAnthropicErrorにBadRequestError(クレジット残高不足はmessage部分一致、他は「リクエストエラー: 」+message)とAPIConnectionErrorの分岐を追加。client/src/styles.css: .chat-error/.chat-extract-errorにword-break/max-height+overflow-yを追加し長文JSONで溢れないようにした。900px未満のメディアクエリにinput/textarea/selectのfont-size:16px統一ルールを追加(user-scalable=noは使わず)。Chat.tsxはtextareaにrefを追加し、モバイル幅では送信後にblurして画面が寄ったままにならないようにした。データのエクスポート/インポートはclient/src/lib/backup.ts(buildBackup/downloadBackup/validateBackup/applyBackup、settingsは対象外)を新設しSettingsModal.tsxに「データのバックアップ」セクションとして追加(エクスポート即ダウンロード、インポートはファイル選択→schemaVersion含む構造検証→window.confirmで上書き確認→保存→リロード)。vitest: api.test.tsにBadRequestError(クレジット残高不足/その他)・APIConnectionErrorの3分岐テストを追加(vi.hoistedでエラーを差し替え可能なモックに変更)、backup.test.tsを新規追加(round-trip・settings非混入・不正データ拒否)。typecheck/test(26件)/build すべてgreen。Playwright(NODE_PATH=planet-messenger, .cjs, port 5184)で375px幅の検証: チャット入力欄・素材カード追加欄・設定モーダルのAPIキー欄/モデルselectすべてfont-size 16px、設定モーダルに「データのバックアップ」見出し+エクスポート/インポートボタンが表示されることを確認。スクリーンショットをdocs/screenshots/mobile-07-chat-input.png, mobile-08-workbench-input.png, mobile-09-settings-backup.pngに保存 |
