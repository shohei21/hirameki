// T13: 使い方ガイド。モバイル下部タブの「使い方」・PCヘッダーの「使い方」ボタン・
// 初回起動時の自動表示のいずれからも、この同一コンポーネントをモーダル表示する。
// 文言はタスクカード記載のものをそのまま掲載する(要約・改変しない)。

interface GuideModalProps {
  onClose: () => void;
}

export default function GuideModal({ onClose }: GuideModalProps): JSX.Element {
  return (
    <div className="modal-overlay">
      <div className="modal guide-modal">
        <h2>使い方</h2>
        <div className="guide-content">
          <p className="guide-intro">
            Hiramekiの考え方: アイデアとは既存の要素の新しい組み合わせ。5つの工程をこの順に回します。
          </p>
          <ol className="guide-stages">
            <li>
              <h3>📥 ① 収集</h3>
              <p>
                チャットでbotと話す。出てきた事実は「素材を抽出」ボタンか、ワークベンチで手動でカード化。特殊資料=課題に直接関係する事実、一般資料=無関係だけど面白かったこと。10枚たまったら次の工程へ。
              </p>
            </li>
            <li>
              <h3>🧩 ② 咀嚼</h3>
              <p>
                ワークベンチでカードを2枚以上選んで「botに相談」。つながりを感じたら組み合わせメモに残す。「もう何も出ない」と疲れたら、それが完了の合図。
              </p>
            </li>
            <li>
              <h3>🌙 ③ 孵化</h3>
              <p>
                アプリを閉じて散歩や音楽を。考えないことが仕事。期限を設定すると再訪時に声がかかる。
              </p>
            </li>
            <li>
              <h3>💡 ④ 誕生</h3>
              <p>閃いたら右下の「+閃きを記録」ですぐメモ。</p>
            </li>
            <li>
              <h3>🔍 ⑤ 検証</h3>
              <p>閃きをチャットでbotと一緒に磨いて現実に使える形へ。</p>
            </li>
          </ol>
          <p className="guide-tabs">
            タブの役割: ステージ=今どの工程にいるかの切替 / チャット=botとの対話 / ワークベンチ=素材の保管庫
          </p>
        </div>
        <div className="modal__actions">
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
