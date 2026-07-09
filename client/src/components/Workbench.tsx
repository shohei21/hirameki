import { useEffect, useRef, useState } from "react";
import type { MaterialCard, Project } from "../types";
import { useHiramekiStore } from "../store";
import type { ChatController } from "../lib/useChatController";

type Tab = "cards" | "combinations" | "sparks";

interface WorkbenchProps {
  project: Project;
  controller: ChatController;
}

export default function Workbench({ project, controller }: WorkbenchProps): JSX.Element {
  const [tab, setTab] = useState<Tab>("cards");

  return (
    <aside className="workbench">
      <div className="workbench-tabs">
        <button
          type="button"
          className={tab === "cards" ? "is-active" : ""}
          onClick={() => setTab("cards")}
        >
          素材カード
        </button>
        <button
          type="button"
          className={tab === "combinations" ? "is-active" : ""}
          onClick={() => setTab("combinations")}
        >
          組み合わせ
        </button>
        <button
          type="button"
          className={tab === "sparks" ? "is-active" : ""}
          onClick={() => setTab("sparks")}
        >
          閃きメモ
        </button>
      </div>
      {tab === "cards" && <CardsTab project={project} controller={controller} />}
      {tab === "combinations" && <CombinationsTab project={project} controller={controller} />}
      {tab === "sparks" && <SparksTab project={project} />}
    </aside>
  );
}

function CardsTab({
  project,
  controller,
}: {
  project: Project;
  controller: ChatController;
}): JSX.Element {
  const cards = useHiramekiStore((state) => state.cards).filter(
    (card) => card.projectId === project.id,
  );
  const addCard = useHiramekiStore((state) => state.addCard);
  const updateCard = useHiramekiStore((state) => state.updateCard);
  const deleteCard = useHiramekiStore((state) => state.deleteCard);

  const [kind, setKind] = useState<MaterialCard["kind"]>("specific");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set(cards.map((c) => c.id)));
  const cardIdsKey = cards.map((c) => c.id).join(",");

  useEffect(() => {
    const currentIds = new Set(cards.map((c) => c.id));
    const added = cards.find((c) => !knownIdsRef.current.has(c.id));
    knownIdsRef.current = currentIds;
    if (!added) return;
    setHighlightId(added.id);
    const timer = setTimeout(() => setHighlightId((id) => (id === added.id ? null : id)), 1200);
    return () => clearTimeout(timer);
  }, [cardIdsKey]);

  function handleAdd(): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    addCard(project.id, kind, trimmed);
    setText("");
  }

  function startEdit(card: MaterialCard): void {
    setEditingId(card.id);
    setEditingText(card.text);
  }

  function saveEdit(): void {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (trimmed.length > 0) {
      updateCard(editingId, trimmed);
    }
    setEditingId(null);
    setEditingText("");
  }

  return (
    <div className="workbench-tab">
      {controller.candidates.length > 0 && (
        <div className="candidate-list">
          <h3>抽出候補</h3>
          {controller.candidates.map((candidate, index) => (
            <div key={`${candidate.text}-${index}`} className="candidate-item">
              <span className={`card-badge card-badge--${candidate.kind}`}>
                {candidate.kind === "specific" ? "特殊" : "一般"}
              </span>
              <span>{candidate.text}</span>
              <button type="button" onClick={() => controller.approveCandidate(index)}>
                承認
              </button>
              <button type="button" onClick={() => controller.discardCandidate(index)}>
                破棄
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card-add-form">
        <select value={kind} onChange={(e) => setKind(e.target.value as MaterialCard["kind"])}>
          <option value="specific">特殊資料</option>
          <option value="general">一般資料</option>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="1つの事実・観察を短く"
        />
        <button type="button" onClick={handleAdd}>
          追加
        </button>
      </div>

      <ul className="card-list">
        {cards.length === 0 && (
          <li className="empty">
            まだ素材カードがありません。アイデアとは既存の要素の新しい組み合わせに過ぎない——まずは素材を集めることから始めましょう。
          </li>
        )}
        {cards.map((card) => (
          <li
            key={card.id}
            className={`card-item${card.id === highlightId ? " card-item--new" : ""}`}
          >
            <span className={`card-badge card-badge--${card.kind}`}>
              {card.kind === "specific" ? "特殊" : "一般"}
            </span>
            {editingId === card.id ? (
              <>
                <input value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                <button type="button" onClick={saveEdit}>
                  保存
                </button>
              </>
            ) : (
              <>
                <span className="card-item__text">{card.text}</span>
                <button type="button" onClick={() => startEdit(card)}>
                  編集
                </button>
              </>
            )}
            <button type="button" onClick={() => deleteCard(card.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CombinationsTab({
  project,
  controller,
}: {
  project: Project;
  controller: ChatController;
}): JSX.Element {
  const cards = useHiramekiStore((state) => state.cards).filter(
    (card) => card.projectId === project.id,
  );
  const combinations = useHiramekiStore((state) => state.combinations).filter(
    (combination) => combination.projectId === project.id,
  );
  const addCombination = useHiramekiStore((state) => state.addCombination);
  const deleteCombination = useHiramekiStore((state) => state.deleteCombination);

  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  function toggleSelect(cardId: string): void {
    setSelected((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }

  function handleConsult(): void {
    if (selected.length < 2) return;
    const selectedCards = cards.filter((card) => selected.includes(card.id));
    const list = selectedCards.map((card) => `「${card.text}」`).join(" と ");
    controller.sendMessage(`${list} の組み合わせについて考えたい。`);
  }

  function handleAddNote(): void {
    const trimmed = note.trim();
    if (trimmed.length === 0 || selected.length === 0) return;
    addCombination(project.id, selected, trimmed);
    setNote("");
    setSelected([]);
  }

  return (
    <div className="workbench-tab">
      <div className="combination-card-picker">
        <p>素材カードを2枚以上選ぶ:</p>
        <ul className="card-picker-list">
          {cards.length === 0 && (
            <li className="empty">素材カードがありません。収集ステージでまず集めてみましょう。</li>
          )}
          {cards.map((card) => (
            <li key={card.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(card.id)}
                  onChange={() => toggleSelect(card.id)}
                />
                <span className={`card-badge card-badge--${card.kind}`}>
                  {card.kind === "specific" ? "特殊" : "一般"}
                </span>
                {card.text}
              </label>
            </li>
          ))}
        </ul>
        <button type="button" disabled={selected.length < 2} onClick={handleConsult}>
          botに相談
        </button>
      </div>

      <div className="combination-note-form">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="見つけた関連性をメモ"
        />
        <button
          type="button"
          onClick={handleAddNote}
          disabled={selected.length === 0 || note.trim().length === 0}
        >
          メモを追加
        </button>
      </div>

      <ul className="combination-list">
        {combinations.length === 0 && (
          <li className="empty">
            まだ組み合わせメモがありません。どんなに突飛でも、不完全でも——書き留めることに意味があります。
          </li>
        )}
        {combinations.map((combination) => (
          <li key={combination.id} className="combination-item">
            <span>{combination.note}</span>
            <button type="button" onClick={() => deleteCombination(combination.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SparksTab({ project }: { project: Project }): JSX.Element {
  const sparks = useHiramekiStore((state) => state.sparks).filter(
    (spark) => spark.projectId === project.id,
  );
  const addSpark = useHiramekiStore((state) => state.addSpark);
  const deleteSpark = useHiramekiStore((state) => state.deleteSpark);
  const [text, setText] = useState("");

  function handleAdd(): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    addSpark(project.id, trimmed);
    setText("");
  }

  return (
    <div className="workbench-tab">
      <div className="spark-add-form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="閃きを書き留める"
        />
        <button type="button" onClick={handleAdd}>
          追加
        </button>
      </div>
      <ul className="spark-list">
        {sparks.length === 0 && (
          <li className="empty">
            まだ閃きメモがありません。ユーレカの瞬間は、思いがけないときに訪れます——いつでも右下のボタンから書き留められます。
          </li>
        )}
        {sparks.map((spark) => (
          <li key={spark.id} className="spark-item">
            <p>{spark.text}</p>
            {spark.developedText && <p className="spark-item__developed">{spark.developedText}</p>}
            <button type="button" onClick={() => deleteSpark(spark.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
