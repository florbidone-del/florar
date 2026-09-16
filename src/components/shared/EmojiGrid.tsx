"use client";

export const EMOJIS = [
  "😀", "😊", "😍", "🥰", "😂", "😅", "🤔", "😉", "😎", "🙌",
  "👏", "👍", "🙏", "💪", "✨", "🔥", "🎉", "❤️", "💜", "🧡",
  "🏺", "🎨", "🖌️", "🧑‍🎨", "🌸", "🌿", "☀️", "🌙", "⭐", "✅",
  "❌", "⏰", "📅", "💬", "📸", "👋", "🥲", "😴", "🫶", "🤝",
  "😇", "🤩", "🥳", "🤗", "😌", "🙃", "😬", "🤷", "🙋", "👀",
  "💥", "💦", "🌟", "🌺", "🌻", "🍃", "🐣", "🦋", "🌈", "❄️",
  "🧉", "☕", "🍰", "🍫", "🎂", "🍓", "🎈", "🎁", "🏆", "📌",
  "🔔", "💯", "🪴", "🕯️", "🧵", "🧱", "🪵", "🐶", "🐱", "🐝",
  "🙈", "🙉", "🙊", "💫", "🌊", "🍀", "🌼", "🌷", "🧺", "🖼️",
  "💛", "💚", "💙", "🩷", "🤍", "🖤", "🤎", "💗", "💖", "💘",
  "🤣", "😜", "😝", "🤪", "🫠", "🥴", "🤯", "🥸", "🫡", "🤭",
  "🍕", "🍔", "🍟", "🌮", "🍦", "🍩", "🥐", "🧁", "🍉", "🍣",
];

/** La grilla de emojis en sí, sin el botón ni el panel flotante que la abre — para poder
 *  reusarla tanto en el EmojiPicker de siempre como en el menú "+" del chat. */
export function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="emoji-grid">
      {EMOJIS.map((e) => (
        <button type="button" key={e} className="emoji-picker-item" onClick={() => onPick(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}
