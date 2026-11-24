import { generateSheetPdf, sheetImageUrls, type Sheet, type SheetLayout } from '@leyline/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchImages } from '../api.ts';
import { canShareFile, deviceSharesPdf, downloadPdf, sharePdf, toPdfFile } from './pdf-delivery.ts';

/** How far the PDF has got: images arrive one by one, then the pages are put together. */
export type PdfStatus =
  | { readonly step: 'idle' }
  | { readonly step: 'fetchingImages'; readonly fetchedCount: number; readonly imageCount: number }
  | { readonly step: 'composingPages' }
  | { readonly step: 'readyToShare'; readonly file: File; readonly madeFrom: string }
  | { readonly step: 'failed' };

/** The PDF of a `Sheet`: how far it has got, and how it reaches the user. */
export interface SheetPdf {
  readonly status: PdfStatus;
  readonly isGenerating: boolean;
  /** Whether this device hands the PDF to the share menu instead of downloading it. */
  readonly sharesPdf: boolean;
  /** The PDF waiting to be shared; `null` once the sheet has changed since it was made. */
  readonly fileToShare: File | null;
  /** `false` while the sheet is incomplete or has nothing to print, or a PDF is under way. */
  readonly isAvailable: boolean;
  /** Shares the waiting PDF, or makes a new one: downloaded, or kept waiting for a tap to share it. */
  readonly makeOrShare: () => void;
}

/**
 * Makes the PDF of `sheet`, laid out as `sheetLayout` (`null` when it has nothing to print).
 * `sheetIsComplete` is `false` while lines of the decklist are still missing from the sheet.
 */
export function useSheetPdf(
  sheet: Sheet,
  sheetLayout: SheetLayout | null,
  sheetIsComplete: boolean,
): SheetPdf {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PdfStatus>({ step: 'idle' });
  const [sharesPdf] = useState(deviceSharesPdf);
  const [isSharing, setIsSharing] = useState(false);
  const isGenerating = status.step === 'fetchingImages' || status.step === 'composingPages';

  /** Differs exactly when the PDF would: the options, and where each image goes on paper. */
  const pdfIdentity = () => JSON.stringify({ options: sheet.options, layout: sheetLayout });
  const fileToShare =
    status.step === 'readyToShare' && status.madeFrom === pdfIdentity() ? status.file : null;

  async function createPdf() {
    const madeFrom = pdfIdentity();
    const urls = sheetImageUrls(sheet);
    setStatus({ step: 'fetchingImages', fetchedCount: 0, imageCount: urls.length });
    try {
      const images = await fetchImages(urls, (fetchedCount) =>
        setStatus({ step: 'fetchingImages', fetchedCount, imageCount: urls.length }),
      );
      setStatus({ step: 'composingPages' });
      const file = toPdfFile(await generateSheetPdf(sheet, images), t('pdf.fileName'));
      // The browser opens the share menu only within a few seconds of a tap, and fetching the
      // images outlasts that: sharing waits for a tap of its own. The real file is checked again:
      // the browser may refuse one that the stand-in passed, such as a too large one.
      if (sharesPdf && canShareFile(file)) {
        setStatus({ step: 'readyToShare', file, madeFrom });
      } else {
        downloadPdf(file);
        setStatus({ step: 'idle' });
      }
    } catch {
      setStatus({ step: 'failed' });
    }
  }

  async function openShareMenu(file: File) {
    setIsSharing(true);
    try {
      await sharePdf(file);
    } finally {
      setIsSharing(false);
    }
  }

  return {
    status,
    isGenerating,
    sharesPdf,
    fileToShare,
    isAvailable: sheetIsComplete && sheetLayout !== null && !isGenerating && !isSharing,
    makeOrShare: () => (fileToShare ? void openShareMenu(fileToShare) : void createPdf()),
  };
}
