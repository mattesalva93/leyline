const ICON_PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  flip: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
  info: 'M12 11v6m0-9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warning:
    'M12 9v4m0 4h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  cards: 'M4 5h7v14H4zM13 5h7v14h-7z',
  sheet: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  close: 'M6 6l12 12M18 6 6 18',
} as const;

type IconName = keyof typeof ICON_PATHS;

/** A line icon in the current text colour, hidden from screen readers: its control is named. */
export function Icon({
  name,
  className = 'size-4',
}: {
  readonly name: IconName;
  readonly className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
