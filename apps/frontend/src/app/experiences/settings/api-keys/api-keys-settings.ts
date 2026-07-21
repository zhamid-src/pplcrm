import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { SettingsService } from '../services/settings-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { EmptyState } from '@uxcommon/components/empty-state/empty-state';
import { DatePipe, NgIf } from '@angular/common';
import { AuthService } from '../../../auth/auth-service';

interface ApiKeyInfo {
  preview: string;
  createdAt: string;
  lastUsedAt: string | null;
}

@Component({
  selector: 'pc-api-keys-settings',
  imports: [EmptyState, Icon, DatePipe, NgIf],
  template: `
    <div class="api-keys-container">
      @if (!loaded()) {
        <div class="skeleton"></div>
      } @else {
        <div class="settings-section">
          <div class="section-header">
            <h3>Workspace API Key</h3>
            <p class="description">
              One key for server-side integrations: submit form responses, event RSVPs, and volunteer signups from your
              own backend, or connect Zapier. Keep it secret — never embed it in a public web page.
            </p>
          </div>

          @if (keyInfo()) {
            <div class="key-info-card">
              <div class="key-display">
                <div class="key-label">Current Key</div>
                <div class="key-value">
                  <code>{{ keyInfo()!.preview }}***</code>
                </div>
              </div>

              <div class="key-metadata">
                <div class="metadata-item">
                  <span class="label">Created</span>
                  <span class="value">
                    {{ keyInfo()!.createdAt | date: 'MMM d, y' }}
                  </span>
                </div>
                @if (keyInfo()!.lastUsedAt) {
                  <div class="metadata-item">
                    <span class="label">Last used</span>
                    <span class="value">
                      {{ keyInfo()!.lastUsedAt | date: 'MMM d, y · h:mm a' }}
                    </span>
                  </div>
                }
              </div>

              <div class="actions">
                <button (click)="onRegenerateKey()" [disabled]="regenerating()" class="btn btn-secondary">
                  <pc-icon name="arrow-path" [size]="4"></pc-icon>
                  {{ regenerating() ? 'Regenerating...' : 'Regenerate Key' }}
                </button>
              </div>
            </div>

            @if (showNewKey()) {
              <div class="new-key-banner">
                <div class="banner-content">
                  <pc-icon name="exclamation-circle" [size]="5"></pc-icon>
                  <div class="banner-text">
                    <p class="banner-title">Save your new API key</p>
                    <p class="banner-message">
                      This is the only time your key will be displayed. Store it securely — you won't be able to
                      retrieve it again.
                    </p>
                  </div>
                </div>
                <div class="key-box">
                  <div class="key-display-new">
                    <code>{{ newKey() }}</code>
                  </div>
                  <button (click)="onCopyKey()" class="btn-copy">
                    <pc-icon name="document-duplicate" [size]="4"></pc-icon>
                    Copy
                  </button>
                </div>
              </div>
            }
          } @else {
            <div class="empty-key-card">
              <p>No API key generated yet.</p>
              <button (click)="onGenerateKey()" [disabled]="generating()" class="btn btn-primary">
                <pc-icon name="plus" [size]="4"></pc-icon>
                {{ generating() ? 'Generating...' : 'Generate API Key' }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .api-keys-container {
      max-width: 600px;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: hsl(var(--base-content));
    }

    .description {
      margin: 0;
      font-size: 14px;
      color: hsl(var(--base-content) / 0.7);
    }

    .key-info-card {
      border: 1px solid hsl(var(--base-300));
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: hsl(var(--base-100));
    }

    .key-display {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .key-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: hsl(var(--base-content) / 0.6);
    }

    .key-value code {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      padding: 8px 12px;
      background: hsl(var(--base-200));
      border-radius: 4px;
      word-break: break-all;
      color: hsl(var(--base-content));
    }

    .key-metadata {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid hsl(var(--base-300));
      border-bottom: 1px solid hsl(var(--base-300));
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .metadata-item .label {
      color: hsl(var(--base-content) / 0.6);
    }

    .metadata-item .value {
      font-weight: 500;
      color: hsl(var(--base-content));
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: hsl(var(--primary));
      color: hsl(var(--primary-content));
    }

    .btn-primary:hover:not(:disabled) {
      background: hsl(var(--primary) / 0.9);
    }

    .btn-secondary {
      background: hsl(var(--base-200));
      color: hsl(var(--base-content));
    }

    .btn-secondary:hover:not(:disabled) {
      background: hsl(var(--base-300));
    }

    .empty-key-card {
      border: 2px dashed hsl(var(--base-300));
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .empty-key-card p {
      margin: 0;
      color: hsl(var(--base-content) / 0.7);
      font-size: 14px;
    }

    .new-key-banner {
      border: 1px solid hsl(var(--warning) / 0.3);
      background: hsl(var(--warning) / 0.05);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .banner-content {
      display: flex;
      gap: 12px;
    }

    .banner-content pc-icon {
      color: hsl(var(--warning));
      flex-shrink: 0;
    }

    .banner-text {
      flex: 1;
    }

    .banner-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: hsl(var(--base-content));
    }

    .banner-message {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: hsl(var(--base-content) / 0.7);
      line-height: 1.4;
    }

    .key-box {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .key-display-new {
      flex: 1;
      min-width: 0;
    }

    .key-display-new code {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      padding: 12px;
      background: hsl(var(--base-100));
      border: 1px solid hsl(var(--base-300));
      border-radius: 4px;
      display: block;
      word-break: break-all;
      color: hsl(var(--base-content));
    }

    .btn-copy {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      background: hsl(var(--base-200));
      color: hsl(var(--base-content));
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-copy:hover {
      background: hsl(var(--base-300));
    }

    .skeleton {
      height: 200px;
      background: hsl(var(--base-200));
      border-radius: 8px;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `,
})
export class ApiKeysSettingsComponent implements OnInit {
  private readonly settingsSvc = inject(SettingsService);
  private readonly authSvc = inject(AuthService);
  private readonly alerts = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly loaded = this._loading.loaded;

  protected readonly generating = signal(false);
  protected readonly regenerating = signal(false);
  protected readonly showNewKey = signal(false);
  protected readonly newKey = signal('');

  protected readonly keyInfo = computed<ApiKeyInfo | null>(() => {
    const user = this.authSvc.getUser();
    return (user as any)?.workspace_api_key_preview || null;
  });

  ngOnInit() {
    const end = this._loading.begin();
    // Settings are typically pre-loaded by the settings page, so just mark loaded
    end();
  }

  protected onGenerateKey() {
    this.generating.set(true);
    this.settingsSvc
      .generateApiKey()
      .then((result: any) => {
        this.newKey.set(result.key);
        this.showNewKey.set(true);
        this.alerts.showSuccess('API key generated successfully');
        // Refresh user data to show the new preview
        void this.authSvc.getCurrentUser();
      })
      .catch((err: any) => {
        this.alerts.showError('Failed to generate API key: ' + (err.message || String(err)));
      })
      .finally(() => {
        this.generating.set(false);
      });
  }

  protected onRegenerateKey() {
    void this.dialogs
      .confirm({
        title: 'Regenerate API Key',
        message:
          'Your current API key will stop working immediately. Make sure all integrations are updated with the new key.',
        variant: 'danger',
        confirmText: 'Regenerate',
      })
      .then((confirmed: any) => {
        if (!confirmed) return;

        this.regenerating.set(true);
        this.settingsSvc
          .regenerateApiKey()
          .then((result: any) => {
            this.newKey.set(result.key);
            this.showNewKey.set(true);
            this.alerts.showSuccess('API key regenerated successfully');
            // Refresh user data to show the new preview
            void this.authSvc.getCurrentUser();
          })
          .catch((err: any) => {
            this.alerts.showError('Failed to regenerate API key: ' + (err.message || String(err)));
          })
          .finally(() => {
            this.regenerating.set(false);
          });
      });
  }

  protected onCopyKey() {
    const key = this.newKey();
    if (!key) return;

    void navigator.clipboard.writeText(key).then(() => {
      this.alerts.showSuccess('API key copied to clipboard');
    });
  }
}
