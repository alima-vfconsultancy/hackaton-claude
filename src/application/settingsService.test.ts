import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { createInMemoryPorts } from './testing/inMemoryPorts';
import { createSettingsService } from './settingsService';

describe('SettingsService', () => {
  it('returns the defaults until something is saved', async () => {
    const { settings } = createInMemoryPorts();
    expect(await createSettingsService(settings).get()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial change into the current settings', async () => {
    const ports = createInMemoryPorts();
    const service = createSettingsService(ports.settings);

    await service.save({ fontScale: 'large' });
    await service.save({ snoozeMinutes: 30 });

    expect(await service.get()).toEqual({ ...DEFAULT_SETTINGS, fontScale: 'large', snoozeMinutes: 30 });
  });
});
