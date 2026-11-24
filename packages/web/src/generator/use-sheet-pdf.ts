import {
  generateSheetPdf,
  printsShowingImages,
  sheetImageUrls,
  type Print,
  type Sheet,
  type SheetLayout,
} from '@leyline/core';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchImages } from '../api.ts';
import { canShareFile, deviceSharesPdf, downloadPdf, sharePdf, toPdfFile } from './pdf-delivery.ts';

/** How far the PDF has got: images arrive one by one, then the pages are put together. */
export type PdfStatus =
  | { readonly step: 'idle' }
  | { readonly step: 'fetchingImages'; readonly fetchedCount: number; readonly imageCount: number }
  | { readonly step: 'composingPages' }
  | { readonly step: 'readyToShare'; readonly file: File; readonly madeFrom: string }
  /** `unfetchedPrints` names, once each, the cards whose images could not be fetched, if any. */
  | { readonly step: 'failed'; readonly unfetchedPrints: readonly Print[] };

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
  // The images already fetched, kept so that making the PDF again fetches only the missing ones.
  const imagesInMemory = useRef(new Map<string, Uint8Array>());
  const isGenerating = status.step === 'fetchingImages' || status.step === 'composingPages';

  /** Differs exactly when the PDF would: the options, and where each image goes on paper. */
  const pdfIdentity = () => JSON.stringify({ options: sheet.options, layout: sheetLayout });
  const fileToShare =
    status.step === 'readyToShare' && status.madeFrom === pdfIdentity() ? status.file : null;

  async function createPdf() {
    const madeFrom = pdfIdentity();
    const urls = sheetImageUrls(sheet);
    // Another image quality or another print needs other URLs: the images of the old ones go.
    const neededUrls = new Set(urls);
    const images = new Map([...imagesInMemory.current].filter(([url]) => neededUrls.has(url)));
    imagesInMemory.current = images;
    const alreadyFetched = images.size;
    const missingUrls = urls.filter((url) => !images.has(url));
    const showFetchProgress = (fetchedCount: number) =>
      setStatus({ step: 'fetchingImages', fetchedCount, imageCount: urls.length });
    showFetchProgress(alreadyFetched);
    try {
      const fetched = await fetchImages(missingUrls, (count) =>
        showFetchProgress(alreadyFetched + count),
      );
      fetched.images.forEach((bytes, url) => images.set(url, bytes));
      if (fetched.failedUrls.length > 0) {
        setStatus({
          step: 'failed',
          unfetchedPrints: printsShowingImages(sheet, fetched.failedUrls),
        });
        return;
      }
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
      setStatus({ step: 'failed', unfetchedPrints: [] });
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
