import type { EpochMs } from './time';

/** Compressed thumbnail of a prescription, stored only when the user asks for it. */
export interface PrescriptionPhoto {
  id: string;
  dataUrl: string;
  createdAt: EpochMs;
}
