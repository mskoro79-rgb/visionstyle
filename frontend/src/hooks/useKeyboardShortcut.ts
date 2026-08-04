import { useEffect } from "react";

export interface ShortcutBinding {
  key: string;
  handler: () => void;
  description: string;
  ctrlOrCmd?: boolean;
}

/** Registers global keyboard shortcuts (Phase 12) while ignoring keystrokes inside form fields. */
export function useKeyboardShortcuts(bindings: ShortcutBinding[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      for (const binding of bindings) {
        const modifierMatches = binding.ctrlOrCmd ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        if (event.key.toLowerCase() === binding.key.toLowerCase() && modifierMatches) {
          event.preventDefault();
          binding.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bindings]);
}
