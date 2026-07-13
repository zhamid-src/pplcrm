import { inject, signal, Service } from '@angular/core';

import { AlertService } from '@uxcommon/components/alerts/alert-service';

@Service()
export class FullScreenService {
  private readonly alertSvc = inject(AlertService);
  private readonly _isFullScreen = signal<boolean>(false);

  constructor() {
    // Initialize state
    this._isFullScreen.set(this.hasFsElement());

    // Keep state in sync with the browser
    document.addEventListener('fullscreenchange', () => {
      this._isFullScreen.set(this.hasFsElement());
    });

    // Safari (older WebKit) – vendor event
    document.addEventListener('webkitfullscreenchange' as unknown as keyof DocumentEventMap, () => {
      this._isFullScreen.set(this.hasFsElement());
    });
  }

  public isFullScreenMode(): boolean {
    return this._isFullScreen();
  }

  public async toggleFullScreen(): Promise<void> {
    if (this.hasFsElement()) {
      await this.exitFullScreen();
    } else {
      await this.enterFullScreen();
    }
  }

  private async enterFullScreen(): Promise<void> {
    const elem = document.documentElement as unknown as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen(); // Safari
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen(); // IE/legacy Edge
      }
      // state will be updated by the fullscreenchange listener
    } catch (e) {
      console.error('Failed to enter fullscreen:', e);
      this.alertSvc.showError('Could not enter full screen. Your browser blocked the request.');
    }
  }

  private async exitFullScreen(): Promise<void> {
    try {
      if (!this.hasFsElement()) return; // avoid "Not in fullscreen" errors

      const doc = document as unknown as Document & {
        webkitExitFullscreen?: () => Promise<void>;
        msExitFullscreen?: () => Promise<void>;
      };
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen(); // Safari
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen(); // IE/legacy Edge
      }
      // state will be updated by the fullscreenchange listener
    } catch (e) {
      console.error('Failed to exit fullscreen:', e);
      this.alertSvc.showError('Could not exit full screen.');
    }
  }

  private hasFsElement(): boolean {
    const doc = document as unknown as Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    return !!(document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
  }
}
