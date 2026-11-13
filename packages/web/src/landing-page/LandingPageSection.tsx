import { useId, type ReactNode } from 'react';

/** One titled part of the landing page under its start. */
export function LandingPageSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}
