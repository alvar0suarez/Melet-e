import { useEffect } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-40 overflow-hidden rounded-lg border border-[var(--color-bg3)] bg-[var(--color-bg2)] py-1 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={[
            "w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--color-bg3)] transition-colors",
            item.danger
              ? "text-[var(--color-red)]"
              : "text-[var(--color-text)]",
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
