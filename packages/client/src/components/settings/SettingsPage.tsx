import { GitHubConnectionPanel } from './GitHubConnectionPanel';
import { NotificationPrefs } from './NotificationPrefs';
import { WebhookConfig } from './WebhookConfig';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Manage your account and notification preferences</p>
      </div>

      <div className="space-y-6">
        <GitHubConnectionPanel />
        <NotificationPrefs />
        <WebhookConfig />
      </div>
    </div>
  );
}
