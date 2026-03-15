import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  // Stable ref — avoids re-running the effect when onClose identity changes
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function handleClose() {
      onCloseRef.current();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    // setTimeout(0) ensures we don't catch the same contextmenu event
    // that triggered the menu to open.
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClose, true);
      document.addEventListener("contextmenu", handleClose, true);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClose, true);
      document.removeEventListener("contextmenu", handleClose, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, []); // empty — runs once on mount, reads onClose via ref

  return createPortal(
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-44 overflow-hidden rounded-lg border border-[var(--color-bg3)] bg-[var(--color-bg2)] py-1 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          disabled={item.disabled}
          title={item.disabled ? item.disabledReason : undefined}
          onClick={(e) => {
            if (item.disabled) return;
            e.stopPropagation();
            item.onClick();
            onCloseRef.current();
          }}
          className={[
            "w-full px-3 py-1.5 text-left text-sm transition-colors",
            item.disabled
              ? "cursor-not-allowed opacity-40 text-[var(--color-text2)]"
              : item.danger
              ? "text-[var(--color-red)] hover:bg-[var(--color-bg3)]"
              : "text-[var(--color-text)] hover:bg-[var(--color-bg3)]",
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
