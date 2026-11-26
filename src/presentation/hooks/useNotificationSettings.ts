import { useEffect, useState } from 'react';
import type { NotificationPermissionState } from '../../application/ports';
import { app } from '../../composition-root';
import { getNotificationStatus, type NotificationStatus } from './reminderNotificationLinks';
import { useSettings } from './useSettings';

export interface NotificationSettings {
  status: NotificationStatus;
  /** Must run from a tap: asks the browser and saves the setting when allowed. */
  enable(): Promise<NotificationPermissionState>;
  disable(): Promise<void>;
}

/** Notification setting combined with the browser permission, which the user can revoke at any time. */
export function useNotificationSettings(): NotificationSettings {
  const settings = useSettings();
  const [permission, setPermission] = useState<NotificationPermissionState>(() => app.notifier.getPermission());

  // The permission can change in the browser settings while the app is in the background.
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && setPermission(app.notifier.getPermission());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  return {
    status: getNotificationStatus(settings.notificationsEnabled, permission),
    async enable() {
      const result = await app.notifier.requestPermission();
      setPermission(result);
      if (result === 'granted') await app.settings.save({ notificationsEnabled: true });
      return result;
    },
    disable: () => app.settings.save({ notificationsEnabled: false }),
  };
}
