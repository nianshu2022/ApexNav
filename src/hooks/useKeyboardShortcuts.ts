import { useEffect } from 'react';

/**
 * isTyping — returns true when the user is focused inside a text input / textarea / contenteditable,
 * so we can skip non-modifier shortcuts that would interfere with typing.
 */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

interface ShortcutOptions {
  onOpenCommandBar: () => void;
  onToggleDarkMode: () => void;
  categories: { id: string }[];
}

/**
 * useKeyboardShortcuts
 *
 * Global keyboard shortcut registry for ApexNav.
 *
 * | Shortcut      | Action                                      |
 * |---------------|---------------------------------------------|
 * | Ctrl+K / ⌘+K  | Open / close Command Bar                    |
 * | /             | Focus the main search input                 |
 * | 1 – 9         | Jump to the Nth category tab                |
 * | D             | Toggle dark / light mode                    |
 * | Esc           | Handled locally by each modal — no-op here |
 */
export function useKeyboardShortcuts({
  onOpenCommandBar,
  onToggleDarkMode,
  categories,
}: ShortcutOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = isTyping();

      // ── Ctrl+K / ⌘+K → Command Bar (works everywhere) ─────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandBar();
        return;
      }

      // All shortcuts below are skipped when typing inside an input
      if (inInput) return;

      // ── / → focus main search box ───────────────────────────────────────
      if (e.key === '/') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('apexnav_focus_search'));
        return;
      }

      // ── D → toggle dark mode ────────────────────────────────────────────
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onToggleDarkMode();
        return;
      }

      // ── 1–9 → jump to Nth category ──────────────────────────────────────
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = categories[num - 1];
        if (target) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('apexnav_jump_category', { detail: { id: target.id } })
          );
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenCommandBar, onToggleDarkMode, categories]);
}
