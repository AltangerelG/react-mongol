import { useEffect, useState } from 'react';
import { DEFAULT_MONGOLIAN_FONT_STACK } from './fonts.js';

/** A representative Mongolian letter (U+1820 MONGOLIAN LETTER A) to probe with. */
const PROBE = 'ᠠ';

export interface MongolFontStatus {
  /** `true` if at least one candidate family is available, `false` if none. */
  readonly available: boolean;
  /** The first available family, or `null` if none matched. */
  readonly family: string | null;
  /**
   * `true` until the check has run. On the server, and in a browser without
   * the CSS Font Loading API, this stays `true` and `available` stays `false`:
   * do not render a "install a font" warning while `pending` is set.
   */
  readonly pending: boolean;
}

const UNRESOLVED: MongolFontStatus = {
  available: false,
  family: null,
  pending: true,
};

/**
 * Reports whether the browser can actually render Mongolian text.
 *
 * Most Android and Linux installs have no Mongolian font at all, so text that
 * is perfectly correct still shows as tofu. Use this to decide whether to load
 * a webfont or show a fallback, rather than assuming the script renders.
 *
 * Built on `document.fonts.check`, which answers for *installed and loaded*
 * faces. It cannot see a webfont that has not finished loading, so await
 * `document.fonts.ready` before trusting a negative -- this hook does that.
 */
export function useMongolFont(
  families: readonly string[] = DEFAULT_MONGOLIAN_FONT_STACK,
): MongolFontStatus {
  const [status, setStatus] = useState<MongolFontStatus>(UNRESOLVED);

  // The families array is usually a fresh literal, so key the effect on its
  // contents rather than its identity to avoid re-checking on every render.
  const key = families.join(',');

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;

    let cancelled = false;
    const check = (): void => {
      if (cancelled) return;
      const names = key.split(',');
      const found =
        names.find((name) => {
          if (name === 'sans-serif') return false;
          try {
            return document.fonts.check(`16px '${name}'`, PROBE);
          } catch {
            // check() throws on a font shorthand it cannot parse.
            return false;
          }
        }) ?? null;
      setStatus({ available: found !== null, family: found, pending: false });
    };

    void document.fonts.ready.then(check, check);
    return () => {
      cancelled = true;
    };
  }, [key]);

  return status;
}
