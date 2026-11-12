const ICON_PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 0 1.4 1.4M4.9 4.9l1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  info: 'M12 11v6m0-9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

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
