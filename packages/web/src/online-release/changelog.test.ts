import { describe, expect, it } from 'vitest';
import { releaseChangesOf } from './changelog.ts';

const CHANGELOG = `# Changelog

Cosa cambia in Leyline a ogni rilascio. La voce più recente sta in cima.

## 0.2.0 — 2026-12-01

### Novità

- Quando esce una versione nuova, Leyline ti invita a ricaricare la pagina.
- Il PDF ricorda il formato del foglio.

### Correzioni

- Il foglio Letter non taglia più l'ultima riga.

## 0.1.0 — 2026-11-24

### Novità

- L'alpha di Leyline è online.
`;

describe('the changes of a release, read from the changelog', () => {
  it('lists the «Novità» and the «Correzioni» of the entry of the app version', () => {
    expect(releaseChangesOf(CHANGELOG, '0.2.0')).toEqual({
      news: [
        'Quando esce una versione nuova, Leyline ti invita a ricaricare la pagina.',
        'Il PDF ricorda il formato del foglio.',
      ],
      fixes: ["Il foglio Letter non taglia più l'ultima riga."],
    });
  });

  it('reads the entry of the app version even when it is not on top', () => {
    expect(releaseChangesOf(CHANGELOG, '0.1.0')).toEqual({
      news: ["L'alpha di Leyline è online."],
      fixes: [],
    });
  });

  it('lists nothing for an app version the changelog has no entry for, as on a spec branch', () => {
    expect(releaseChangesOf(CHANGELOG, '0.3.0')).toEqual({ news: [], fixes: [] });
  });

  it('joins an item wrapped on an indented line to the item it continues', () => {
    const wrapped =
      '## 0.2.0 — 2026-12-01\n\n### Correzioni\n\n- Il foglio Letter\n  non taglia più.\n';

    expect(releaseChangesOf(wrapped, '0.2.0').fixes).toEqual(['Il foglio Letter non taglia più.']);
  });
});
