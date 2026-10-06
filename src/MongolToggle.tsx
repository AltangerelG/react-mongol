import { createElement, forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';
import { loadConverter } from './convert.js';
import type { ConverterOptions } from './convert.js';
import { applyMongolScript } from './dom.js';
import type { VerticalMode } from './dom.js';

export interface MongolScriptHookOptions extends ConverterOptions {
  /** Subtree to convert. Default: the whole `document.body`. */
  root?: RefObject<Element | null>;
  vertical?: VerticalMode;
  columnHeight?: string;
  fontFamily?: string | null;
  /**
   * Remember the reader's choice in localStorage under this key. `false` to
   * forget it on reload. Default `'react-mongol:script'`.
   */
  persist?: string | false;
  /** Initial state when nothing is remembered. Default `false` (Cyrillic). */
  defaultEnabled?: boolean;
}

export interface MongolScriptState {
  /** Traditional script is showing. */
  enabled: boolean;
  /** The converter is loading (first switch only). */
  loading: boolean;
  error: Error | null;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

const DEFAULT_KEY = 'react-mongol:script';

function readPersisted(key: string | false, fallback: boolean): boolean {
  if (!key || typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === 'on';
  } catch {
    return fallback;
  }
}

/**
 * Switch a page (or part of it) between Cyrillic and traditional Mongolian
 * script. The converter loads on the first switch, not on page load.
 *
 * Options are read when the script is switched on; changing them while it is
 * on takes effect the next time it is switched on.
 */
export function useMongolScript(options: MongolScriptHookOptions = {}): MongolScriptState {
  const key = options.persist === undefined ? DEFAULT_KEY : options.persist;
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const latest = useRef(options);
  latest.current = options;

  // Read the remembered choice after mount, so server and client render alike.
  useEffect(() => {
    setEnabledState(readPersisted(key, latest.current.defaultEnabled ?? false));
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    let restore: (() => void) | null = null;
    let cancelled = false;
    const { root, vertical, columnHeight, fontFamily, dictionary, reviewed } = latest.current;
    setLoading(true);
    setError(null);
    loadConverter({
      ...(dictionary ? { dictionary } : {}),
      ...(reviewed === undefined ? {} : { reviewed }),
    })
      .then((convert) => {
        if (cancelled) return;
        restore = applyMongolScript(convert, {
          ...(root?.current ? { root: root.current } : {}),
          ...(vertical ? { vertical } : {}),
          ...(columnHeight ? { columnHeight } : {}),
          ...(fontFamily === undefined ? {} : { fontFamily }),
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason : new Error(String(reason)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      restore?.();
    };
  }, [enabled]);

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      if (!key) return;
      try {
        window.localStorage.setItem(key, next ? 'on' : 'off');
      } catch {
        // Storage can be unavailable (private mode); the switch still works.
      }
    },
    [key],
  );
  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  return { enabled, loading, error, setEnabled, toggle };
}

export interface MongolToggleProps
  extends MongolScriptHookOptions,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  /** Label while Cyrillic shows. Default ᠮᠣᠩᠭᠣᠯ (in script). */
  scriptLabel?: ReactNode;
  /** Label while traditional script shows. Default "Кирилл". */
  cyrillicLabel?: ReactNode;
  onScriptChange?: (enabled: boolean) => void;
}

/** MONGOL in traditional script. */
const SCRIPT_LABEL = 'ᠮᠣᠩᠭᠣᠯ';

/**
 * A button that switches the page between Cyrillic and traditional script.
 * The button itself is never converted (`data-mongol-skip`).
 */
export const MongolToggle = forwardRef<HTMLButtonElement, MongolToggleProps>(function MongolToggle(
  {
    root,
    vertical,
    columnHeight,
    fontFamily,
    persist,
    defaultEnabled,
    dictionary,
    reviewed,
    scriptLabel = SCRIPT_LABEL,
    cyrillicLabel = 'Кирилл',
    onScriptChange,
    ...button
  },
  ref,
) {
  const state = useMongolScript({
    ...(root ? { root } : {}),
    ...(vertical ? { vertical } : {}),
    ...(columnHeight ? { columnHeight } : {}),
    ...(fontFamily === undefined ? {} : { fontFamily }),
    ...(persist === undefined ? {} : { persist }),
    ...(defaultEnabled === undefined ? {} : { defaultEnabled }),
    ...(dictionary ? { dictionary } : {}),
    ...(reviewed === undefined ? {} : { reviewed }),
  });

  return createElement(
    'button',
    {
      type: 'button',
      ...button,
      ref,
      'data-mongol-skip': '',
      'aria-pressed': state.enabled,
      'aria-busy': state.loading || undefined,
      title: button.title ?? (state.enabled ? 'Кирилл үсгээр харах' : 'Монгол бичгээр харах'),
      onClick: () => {
        onScriptChange?.(!state.enabled);
        state.toggle();
      },
    },
    state.enabled ? cyrillicLabel : scriptLabel,
  );
});
