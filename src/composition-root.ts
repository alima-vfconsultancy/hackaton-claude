import { createApplication } from './application/createApplication';
import { createIcsCalendarExporter } from './infrastructure/calendar/icsCalendarExporter';
import { createBrowserFileDownloader } from './infrastructure/files/browserFileDownloader';
import { createCanvasImageProcessor } from './infrastructure/imaging/canvasImageProcessor';
import { createBrowserReminderNotifier } from './infrastructure/notifications/browserReminderNotifier';
import { createTesseractOcrEngine } from './infrastructure/ocr/tesseractOcrEngine';
import { createDexieStoragePorts } from './infrastructure/persistence/dexie/dexieStoragePorts';
import { createLazyPdfReportGenerator } from './infrastructure/pdf/lazyPdfReportGenerator';

/**
 * Composition root: the only place where the application is wired to its concrete adapters.
 * The presentation layer imports `app` from here and never touches an adapter directly.
 */
const files = createBrowserFileDownloader();

export const app = createApplication({
  ...createDexieStoragePorts(),
  ocr: createTesseractOcrEngine(),
  imaging: createCanvasImageProcessor(),
  pdf: createLazyPdfReportGenerator(),
  calendar: createIcsCalendarExporter(files),
  notifier: createBrowserReminderNotifier(),
  files,
});

/** The "load sample data" button only exists in development and demo builds. */
export const SAMPLE_DATA_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEMO === 'true';
