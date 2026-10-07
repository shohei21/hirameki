# Hirameki

ジェームス・W・ヤング『アイデアのつくり方』(A Technique for Producing Ideas) の5段階メソッドに基づき、
ユーザーと**一緒に**アイデアを育てる対話型Webアプリ。botは各ステージで役割を変え(インタビュアー→パズルの相棒→番人→書記→建設的な批評家)、
アイデアを「与える」のではなく、ユーザー自身が素材の組み合わせを発見するのを助けます。

**BYOK(Bring Your Own Key)構成の静的アプリです。** サーバーは存在せず、ブラウザから直接Anthropic APIを呼び出します。
APIキーは各ユーザーが設定画面(右上の歯車アイコン)で入力し、その端末の`localStorage`にのみ保存されます。
スマホのホーム画面に追加すれば単体アプリのように使えます。

> 同じリポジトリに、行動に移せないときの「今日の一動作」アプリ **Ippo** も入っています → [`ippo/README.md`](ippo/README.md)

設計の背景・システムプロンプトの全文は [`docs/DESIGN.md`](docs/DESIGN.md) を参照してください。

---

## APIキーの扱い・自己責任について

- APIキーは**ブラウザの`localStorage`(この端末)にのみ保存**され、Anthropic以外のどこにも送信されません。
- キーはブラウザから直接 `https://api.anthropic.com` へ送信されます(`dangerouslyAllowBrowser: true`)。
  これは「サーバーを持たない個人利用・配布アプリ」だから成立する構成です。**共有PCや他人に配布したデバイスでキーを入力しないでください。**
- キーの発行・利用料金の管理はユーザー自身の責任です。Anthropic Consoleで使用量・上限を確認してください。
- このリポジトリ自体にAPIキーは含まれません(`.env`や`.env.example`は廃止済み)。

---

## セットアップ(ローカル開発)

### 必要環境

- Node.js 20以上(推奨: Node 24)
- npm 10以上

### 手順

```bash
# 1. 依存関係のインストール
npm install

# 2. 開発サーバーを起動(http://localhost:5173)
npm run dev

# 3. ブラウザで開き、右上の歯車アイコンからAPIキーを入力する
#    (キー未設定でもアプリは起動します。ワークベンチ(カード/組み合わせ/閃き)はキーなしで全機能利用可能。
#     チャットのみキー未設定時は入力欄に案内が表示されます)
```

### その他のコマンド

```bash
npm run typecheck   # client の tsc --noEmit
npm run test        # client の vitest
npm run build       # client のビルド(dist/ に静的ファイル一式を出力)
npm run preview -w client   # ビルド結果をローカルで確認(vite preview)
```

---

## 5ステージの使い方

ジェームス・W・ヤングの5工程に対応する、ステージステッパー(PC: 左カラム / スマホ: 下部タブ「ステージ」)で自由に行き来できます(botが移行を提案することはありますが、決めるのはユーザーです)。

| # | ステージ | やること | botの役割 |
|---|---------|---------|----------|
| 1 | 収集 (Gather) | 課題に関する事実・観察(特殊資料)と、一見無関係な雑多な知識(一般資料)を素材カードに集める | インタビュアー。質問で掘り下げる |
| 2 | 咀嚼 (Digest) | 集めた素材カードを2〜3枚選び、組み合わせを試す。関連性メモを書き留める | パズルの相棒。突飛な組み合わせを一緒に試す |
| 3 | 孵化 (Incubate) | 課題をいったん完全に手放す。散歩・音楽・映画など無意識に委ねる | 番人。課題の話を優しく止める |
| 4 | 誕生 (Spark) | 閃いたら右下の「+閃きを記録」でいつでも即記録 | 書記。批評せず言語化を手伝う |
| 5 | 検証 (Verify) | 「誰のためか・何が新しいか・実現条件は」を問い、閃きを育てる | 建設的な批評家 |

- **ワークベンチ**(PC: 右カラム / スマホ: 下部タブ「ワークベンチ」): 素材カード / 組み合わせ / 閃きメモ の3タブ。カードのCRUD、組み合わせの「botに相談」(選択したカードでチャットへ定型文送信)、閃きメモの追加・削除ができます。
- **閃きメモ**はどのステージにいても右下のフローティングボタンから即時追加できます(ユーレカの瞬間は予告なく来るため)。
- **孵化ステージ**では「いつまで寝かせるか」を設定でき、期限が来ると次に開いたときに「何か閃いた?」と表示されます。
- **素材を抽出**ボタン(チャット欄)は会話ログから素材カード候補をAPIで抽出し、個別に承認/破棄できます。APIキーが必要です。
- すべてのデータ(プロジェクト・カード・組み合わせ・閃き・会話履歴・設定)はブラウザの localStorage に保存され、リロードしても失われません。

---

## スマホでの使い方(ホーム画面に追加)

本アプリはPWA(manifest + アイコン)対応で、ホーム画面に追加すると単体アプリ風に開けます。

- **iOS (Safari)**: 共有ボタン → 「ホーム画面に追加」
- **Android (Chrome)**: メニュー → 「ホーム画面に追加」/ 「アプリをインストール」

900px未満の画面では自動的に1カラム表示になり、画面下部のタブ(ステージ / チャット / ワークベンチ)で切り替えます。
チャット入力欄は下部固定フッターになり、iOSのセーフエリア(ノッチ・ホームバー)を考慮したレイアウトです。

### Service Workerを導入していない理由

意図的にService Workerは実装していません。理由:

1. 本アプリはBYOK構成で、表示内容の大半(チャット応答)は常に生きたAPI呼び出しが必要であり、オフラインキャッシュの恩恵が小さい。
2. Service Workerによるキャッシュは「デプロイ後に古いバージョンが表示され続ける」トラブルの主要因になりやすく、個人開発・小規模配布の段階では複雑さに見合わない。
3. `manifest.webmanifest` + アイコンだけでもホーム画面への追加・単体アプリ風の起動(`display: "standalone"`)は実現でき、要件の「スマホ単独で使える」は満たせる。

将来オフライン対応が必要になった場合は、`vite-plugin-pwa`などの導入を検討する(v2バックログ)。

---

## デプロイ手順(GitHub Pages)

`.github/workflows/deploy.yml` が `main` ブランチへの push をトリガーに、`HIRAMEKI_BASE=/hirameki/ npm run build` → GitHub Pages へのデプロイを自動実行します。

### 初回セットアップ

1. GitHubリポジトリの Settings → Pages → Source を **GitHub Actions** に設定する。
2. `main` ブランチに push する(またはActionsタブから `Deploy to GitHub Pages` を手動実行 `workflow_dispatch`)。
3. デプロイ完了後、`https://<ユーザー名>.github.io/hirameki/` でアクセスできる。

### リポジトリ名がhirameki以外の場合

`vite.config.ts` は `base: process.env.HIRAMEKI_BASE ?? "/"` としているため、
`.github/workflows/deploy.yml` の `HIRAMEKI_BASE` の値をリポジトリ名に合わせて変更してください
(例: リポジトリ名が `my-hirameki` なら `HIRAMEKI_BASE: /my-hirameki/`)。

### 手元でのデプロイ前確認

```bash
HIRAMEKI_BASE=/hirameki/ npm run build
npx vite preview -w client   # または cd client && npx vite preview
```

---

## アーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│  client (Vite + React + TS, 静的アプリ)                   │
│                                                            │
│  App.tsx                                                  │
│   ├─ ProjectHeader (+ SettingsModal: APIキー/モデル設定)   │
│   ├─ StageStepper                                          │
│   ├─ IncubateBanner                                        │
│   ├─ Chat  ──useChatController                              │
│   ├─ Workbench (cards/combos/sparks)                        │
│   ├─ SparkFab                                              │
│   └─ mobile-tabbar (900px未満: ステージ/チャット/ワークベンチ)│
│                                                            │
│  store.ts (Zustand: projects/cards/.../settings)           │
│  lib/storage.ts   (localStorage: hirameki:v1:*)            │
│  lib/prompts.ts   (DESIGN.md §6 のプロンプト全文)           │
│  lib/api.ts       (@anthropic-ai/sdk を直接呼び出し)         │
└───────────────────────────┬────────────────────────────────┘
                             │ new Anthropic({apiKey, dangerouslyAllowBrowser:true})
                             │ messages.stream() / messages.create()
                             ▼
                       Anthropic API
                (claude-opus-4-8 既定 / claude-sonnet-5 選択可、プロンプトキャッシュ)
```

- フロントのみで完結する静的アプリ。APIキーはユーザーがブラウザで入力し `localStorage` にのみ保存する(BYOK)。
- チャットは `client.messages.stream()` + `thinking: {type: "adaptive"}` + systemブロックへの `cache_control` でプロンプトキャッシュを効かせる。
- 素材抽出は `client.messages.create()` + `output_config.format: json_schema` で構造化出力を強制する。
- エラーはSDKの型付き例外(`Anthropic.AuthenticationError` / `Anthropic.RateLimitError` / `Anthropic.APIError`)で分岐する。
- 永続化はすべてブラウザの localStorage(`hirameki:v1:*` キー)。サーバー・DBは存在しない。
