import type { FileDownloader } from '../../application/ports';

/** Saves a Blob as a file through a temporary link (works without a server). */
export const createBrowserFileDownloader = (): FileDownloader => ({
  download(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
});
