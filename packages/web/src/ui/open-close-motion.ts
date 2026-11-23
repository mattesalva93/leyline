// How a Radix part that opens and closes comes and goes. Radix keeps a closing part on the page
// until its exit animation ends.

export const FADES_IN_AND_OUT =
  'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out';
export const SLIDES_IN_AND_OUT_ON_THE_LEFT =
  'data-[state=open]:animate-slide-in-from-left data-[state=closed]:animate-slide-out-to-left';
export const SLIDES_IN_AND_OUT_AT_THE_BOTTOM =
  'data-[state=open]:animate-slide-in-from-bottom data-[state=closed]:animate-slide-out-to-bottom';
