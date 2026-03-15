import { forwardRef, useImperativeHandle, useState, useEffect } from "react";

export interface WikiLinkSuggestionRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
  items: string[];
  command: (item: string) => void;
  clientRect?: (() => DOMRect | null) | null;
}

export const WikiLinkSuggestion = forwardRef<WikiLinkSuggestionRef, Props>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) =>
            (i - 1 + props.items.length) % props.items.length
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = props.items[selectedIndex];
          if (item) props.command(item);
          return true;
        }
        return false;
      },
    }));

    const rect = props.clientRect?.();
    if (!rect || props.items.length === 0) return null;

    return (
      <div
        style={{ top: rect.bottom + 4, left: rect.left }}
        className="fixed z-50 min-w-48 overflow-hidden rounded-lg border border-[var(--color-bg3)] bg-[var(--color-bg2)] shadow-xl"
      >
        {props.items.map((item, index) => (
          <button
            key={item}
            onClick={() => props.command(item)}
            className={[
              "w-full px-3 py-2 text-left text-sm transition-colors",
              index === selectedIndex
                ? "bg-[var(--color-indigo)] text-white"
                : "text-[var(--color-text)] hover:bg-[var(--color-bg3)]",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
      </div>
    );
  }
);

WikiLinkSuggestion.displayName = "WikiLinkSuggestion";
