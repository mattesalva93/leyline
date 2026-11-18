import { useTranslation } from 'react-i18next';

/** Where a dragged line is dropped to open the sideboard, while the decklist has none. */
export function SideboardDropZone({
  isTarget,
  onDragOver,
}: {
  /** The dragged line lands here if dropped now. */
  readonly isTarget: boolean;
  readonly onDragOver: (event: React.DragEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`mx-6 mb-4 border-2 border-dashed p-6 text-center text-sm ${isTarget ? 'border-accent text-foreground' : 'border-border text-muted-foreground'}`}
      onDragOver={onDragOver}
    >
      {t('workspace.sideboardDrop')}
    </div>
  );
}
