import { describe, expect, it } from 'vitest';
import { touchingGroupColoursOf } from './touching-group-colours.ts';

describe('touchingGroupColoursOf', () => {
  it('never gives a group the colour of the group above it', () => {
    // 8 columns, groups of 2: group 4 stands under group 0.
    const cells = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];

    const colours = touchingGroupColoursOf(cells, 8, 4);

    expect(colours.get(4)).not.toBe(colours.get(0));
    expect(colours.get(5)).not.toBe(colours.get(1));
  });

  it('keeps the groups above one another apart when the rows get narrower', () => {
    // 4 columns, groups of 2: group 2 now stands under group 0, and group 3 under group 1.
    const cells = [0, 0, 1, 1, 2, 2, 3, 3];

    const colours = touchingGroupColoursOf(cells, 4, 4);

    expect(colours.get(2)).not.toBe(colours.get(0));
    expect(colours.get(3)).not.toBe(colours.get(1));
  });

  it('lets groups that only meet at a corner, or with a cell of no group between, share a colour', () => {
    // 3 columns: groups 0 and 1 meet at a corner, groups 1 and 2 have a cell of no group between.
    const cells = [0, null, null, null, 1, null, 2];

    const colours = touchingGroupColoursOf(cells, 3, 4);

    expect(colours.get(1)).toBe(colours.get(0));
    expect(colours.get(2)).toBe(colours.get(1));
  });

  it('never gives a group the colour of the group on its left, even across a row break', () => {
    // 3 columns: group 1 wraps onto the second row, beside group 2.
    const cells = [0, 1, 1, 1, 2];

    const colours = touchingGroupColoursOf(cells, 3, 4);

    expect(colours.get(1)).not.toBe(colours.get(0));
    expect(colours.get(2)).not.toBe(colours.get(1));
  });

  it('takes, when every colour is taken by a neighbour, the colour whose groups touch it with the fewest sides', () => {
    // 3 columns, 2 colours: group 2 stands under group 0 on two sides and under group 1 on one.
    const cells = [0, 0, 1, 2, 2, 2];

    const colours = touchingGroupColoursOf(cells, 3, 2);

    expect([colours.get(0), colours.get(1)]).toEqual([0, 1]);
    expect(colours.get(2)).toBe(colours.get(1));
  });
});
