/**
 * Where a banner will sit (ADR 0005). It holds nothing yet, and an empty slot takes no room, so
 * the layout already has its place without showing an empty space.
 */
export function AdSlot({ className = '' }: { readonly className?: string }) {
  return <aside data-ad-slot className={`empty:hidden ${className}`} />;
}
