import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { relativeLinkTargets } from './readme-links.js';

const repo = join(import.meta.dirname, '..');

it('every relative link and image of the README points to a file in the repository', () => {
  const readme = readFileSync(join(repo, 'README.md'), 'utf8');

  const missing = relativeLinkTargets(readme).filter((path) => !existsSync(join(repo, path)));

  expect(missing).toEqual([]);
});

describe('relativeLinkTargets', () => {
  it('finds the file a relative link points to', () => {
    expect(
      relativeLinkTargets('See [the ADRs](docs/adr/) and [`SECURITY.md`](SECURITY.md).'),
    ).toEqual(['docs/adr/', 'SECURITY.md']);
  });

  it('leaves out the site, issues, e-mail addresses and anchors in the README itself', () => {
    const markdown = [
      '[Leyline](https://leyline.website), [#99](https://github.com/mattesalva93/leyline/issues/99),',
      '[write](mailto:someone@example.com), [Status](#status), [plain](http://example.com).',
    ].join('\n');

    expect(relativeLinkTargets(markdown)).toEqual([]);
  });

  it('finds the images and links written as HTML, which Markdown cannot size', () => {
    const markdown =
      '<a href="docs/media/phone.png"><img src="docs/media/phone.png" alt="On a phone" width="240"></a>\n' +
      '<img alt="Online" src="https://leyline.website/icon.png">';

    expect(relativeLinkTargets(markdown)).toEqual(['docs/media/phone.png', 'docs/media/phone.png']);
  });

  it('points to the file a link to a heading inside it opens', () => {
    expect(relativeLinkTargets('[deploy](docs/deploy.md#first-deploy)')).toEqual([
      'docs/deploy.md',
    ]);
  });
});
