"use client";

const URL_RE = /(https?:\/\/[^\s<]+)/g;
const URL_RE_TEST = /^https?:\/\/[^\s<]+$/;

/** Igual que la función `linkify` del HTML original, pero como componente React (sin dangerouslySetInnerHTML). */
export function Linkify({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line.split(URL_RE).map((part, j) =>
            URL_RE_TEST.test(part) ? (
              <a key={j} href={part} target="_blank" rel="noopener">
                {part}
              </a>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}
