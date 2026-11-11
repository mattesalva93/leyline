/**
 * How the finished PDF reaches the user: the native share menu on touch devices that can share
 * files, a download everywhere else.
 */

const PDF_TYPE = 'application/pdf';

export function toPdfFile(bytes: Uint8Array, fileName: string): File {
  return new File([bytes as BlobPart], fileName, { type: PDF_TYPE });
}

/**
 * Whether this device hands the PDF to the native share menu instead of downloading it: a touch
 * screen as the main input, and a browser able to share a PDF file.
 */
export function deviceSharesPdf(): boolean {
  if (!matchMedia('(pointer: coarse)').matches) return false;
  // A stand-in PDF: `canShare` needs a file to judge, before the real one exists.
  return canShareFile(toPdfFile(new TextEncoder().encode('%PDF-'), 'check.pdf'));
}

/** Whether the browser can put `file` in the native share menu; `canShare` needs no tap. */
export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/**
 * Opens the native share menu with `file`. Call it straight from a tap: the browser allows it only
 * for a few seconds after one. A share the browser refuses falls back to the download.
 */
export async function sharePdf(file: File): Promise<void> {
  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    // AbortError: the user closed the menu, choosing not to share, so nothing is downloaded
    // either. InvalidStateError: a share menu is already open.
    if (error instanceof DOMException && ['AbortError', 'InvalidStateError'].includes(error.name))
      return;
    downloadPdf(file);
  }
}

export function downloadPdf(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  // Revoking right after click() can cancel the download in Firefox and Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
