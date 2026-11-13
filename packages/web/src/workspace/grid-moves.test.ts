import { describe, expect, it } from 'vitest';
import { cellAfterArrow } from './grid-moves.ts';

// Two sections of the card grid, three columns wide: the first one holds eight cells
// (two full rows, then two cells), the second one holds five (a full row, then two cells).
//
//   0 1 2
//   3 4 5
//   6 7
//   ------
//   0 1 2
//   3 4
const SECTIONS = [
  { cellCount: 8, columns: 3 },
  { cellCount: 5, columns: 3 },
];

describe('the arrows on the card grid', () => {
  it('go to the next and the previous cell in a row', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 1 }, 'right')).toEqual({
      group: 0,
      index: 2,
    });
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 1 }, 'left')).toEqual({
      group: 0,
      index: 0,
    });
  });

  it('go on to the next row from the end of a row, as the text reads', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 2 }, 'right')).toEqual({
      group: 0,
      index: 3,
    });
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 3 }, 'left')).toEqual({
      group: 0,
      index: 2,
    });
  });

  it('go from the last cell of a section to the first of the next, and back', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 7 }, 'right')).toEqual({
      group: 1,
      index: 0,
    });
    expect(cellAfterArrow(SECTIONS, { group: 1, index: 0 }, 'left')).toEqual({
      group: 0,
      index: 7,
    });
  });

  it('go up and down a column', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 1 }, 'down')).toEqual({
      group: 0,
      index: 4,
    });
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 4 }, 'up')).toEqual({
      group: 0,
      index: 1,
    });
  });

  it('go down to the last cell of a shorter row below', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 5 }, 'down')).toEqual({
      group: 0,
      index: 7,
    });
  });

  it('go down from the last row of a section to the same column of the next section', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 6 }, 'down')).toEqual({
      group: 1,
      index: 0,
    });
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 7 }, 'down')).toEqual({
      group: 1,
      index: 1,
    });
  });

  it('go up from the first row of a section to the same column of the last row above, or its last cell', () => {
    expect(cellAfterArrow(SECTIONS, { group: 1, index: 0 }, 'up')).toEqual({
      group: 0,
      index: 6,
    });
    expect(cellAfterArrow(SECTIONS, { group: 1, index: 2 }, 'up')).toEqual({
      group: 0,
      index: 7,
    });
  });

  it('stay put past the edges of the grid', () => {
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 0 }, 'left')).toEqual({
      group: 0,
      index: 0,
    });
    expect(cellAfterArrow(SECTIONS, { group: 0, index: 2 }, 'up')).toEqual({
      group: 0,
      index: 2,
    });
    expect(cellAfterArrow(SECTIONS, { group: 1, index: 4 }, 'right')).toEqual({
      group: 1,
      index: 4,
    });
    expect(cellAfterArrow(SECTIONS, { group: 1, index: 3 }, 'down')).toEqual({
      group: 1,
      index: 3,
    });
  });
});
