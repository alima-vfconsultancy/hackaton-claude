import { db } from '../db/db';
import type { DoseLog, Medication, PhotoRecord, Settings } from '../types';

export interface BackupFile {
  app: 'meu-remedio';
  version: 1;
  exportedAt: string;
  medications: Medication[];
  doseLogs: DoseLog[];
  photos: PhotoRecord[];
  settings: Settings | null;
}

export async function buildBackup(): Promise<BackupFile> {
  const [medications, doseLogs, photos, settings] = await Promise.all([
    db.medications.toArray(),
    db.doseLogs.toArray(),
    db.photos.toArray(),
    db.settings.get('app'),
  ]);
  return { app: 'meu-remedio', version: 1, exportedAt: new Date().toISOString(), medications, doseLogs, photos, settings: settings ?? null };
}

/** Valida o conteúdo de um arquivo de backup. Lança Error com mensagem em português. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Este arquivo não é um backup válido. Escolha um arquivo .json exportado pelo MeuRemédio.');
  }
  const d = data as Partial<BackupFile>;
  if (!d || d.app !== 'meu-remedio' || d.version !== 1) {
    throw new Error('Este arquivo não é um backup do MeuRemédio. Escolha o arquivo que você exportou pelo app.');
  }
  if (!Array.isArray(d.medications) || !Array.isArray(d.doseLogs)) {
    throw new Error('O backup está incompleto ou danificado. Tente exportar de novo no aparelho de origem.');
  }
  const okMed = d.medications.every((m) => m && typeof m.id === 'string' && typeof m.name === 'string' && typeof m.startDate === 'string');
  const okDose = d.doseLogs.every((l) => l && typeof l.id === 'string' && typeof l.medicationId === 'string' && typeof l.scheduledAt === 'number');
  if (!okMed || !okDose) throw new Error('O backup contém dados inválidos. Nada foi alterado.');
  return {
    app: 'meu-remedio',
    version: 1,
    exportedAt: d.exportedAt ?? '',
    medications: d.medications,
    doseLogs: d.doseLogs,
    photos: Array.isArray(d.photos) ? d.photos : [],
    settings: d.settings ?? null,
  };
}

/** Substitui TODOS os dados atuais pelos do backup (já validado). */
export async function restoreBackup(b: BackupFile): Promise<void> {
  await db.transaction('rw', db.medications, db.doseLogs, db.photos, db.settings, async () => {
    await Promise.all([db.medications.clear(), db.doseLogs.clear(), db.photos.clear(), db.settings.clear()]);
    await db.medications.bulkAdd(b.medications);
    await db.doseLogs.bulkAdd(b.doseLogs);
    if (b.photos.length) await db.photos.bulkAdd(b.photos);
    if (b.settings) await db.settings.put({ ...b.settings, key: 'app' });
  });
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.medications, db.doseLogs, db.photos, db.settings, async () => {
    await Promise.all([db.medications.clear(), db.doseLogs.clear(), db.photos.clear(), db.settings.clear()]);
  });
}
