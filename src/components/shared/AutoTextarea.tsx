"use client";

import { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from "react";

function resize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

/** Textarea que crece sola a medida que se escribe, en vez de quedar con scroll interno. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoTextarea(props, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (innerRef.current) resize(innerRef.current);
    }, [props.value]);

    return (
      <textarea
        {...props}
        ref={(el) => {
          innerRef.current = el;
          if (typeof forwardedRef === "function") forwardedRef(el);
          else if (forwardedRef) forwardedRef.current = el;
        }}
        style={{ overflow: "hidden", resize: "vertical", ...props.style }}
        onInput={(e) => {
          resize(e.currentTarget);
          props.onInput?.(e);
        }}
      />
    );
  }
);
