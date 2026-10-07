import { checkSpecificity } from "../lib/specificity";

export function SpecificityHint({ text }: { text: string }) {
  const r = checkSpecificity(text);
  if (r.level === "empty") return null;
  if (r.level === "ok") {
    return <p className="hint hint--ok">✓ 何をするか迷わず分かる具体さ</p>;
  }
  return (
    <ul className="hint hint--vague">
      {r.hints.map((h) => (
        <li key={h}>{h}</li>
      ))}
    </ul>
  );
}
