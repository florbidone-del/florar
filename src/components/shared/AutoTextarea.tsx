"use client";

import { TextareaHTMLAttributes, useEffect, useRef } from "react";

function resize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

/** Textarea que crece solo a medida que se escribe, en vez de quedar con scroll interno. */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) resize(ref.current);
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      style={{ overflow: "hidden", resize: "vertical", ...props.style }}
      onInput={(e) => {
        resize(e.currentTarget);
        props.onInput?.(e);
      }}
    />
  );
}
