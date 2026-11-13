import { describe, expect, it } from 'vitest';
import { withLineFeedBreaks } from './index.ts';

describe('withLineFeedBreaks', () => {
  it('writes every line break as a line feed, the way a textarea holds it', () => {
    expect(withLineFeedBreaks('4 Sol Ring\r\n1 Lightning Bolt\n2 Ponder\r\n')).toBe(
      '4 Sol Ring\n1 Lightning Bolt\n2 Ponder\n',
    );
  });
});
