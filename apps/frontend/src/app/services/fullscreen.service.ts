import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FullScreenService {
  /** True iff the document is actually in fullscreen (kept in sync by events) */
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

  /** Public read */
  public isFullScreenMode(): boolean {
    return this._isFullScreen();
  }

  /** Toggle based on current actual state */
  public async toggleFullScreen(): Promise<void> {
    if (this.hasFsElement()) {
      await this.exitFullScreen();
    } else {
      await this.enterFullScreen();
    }
  }

  /** Request browser fullscreen on the whole app */
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
    }
  }

  /** Exit browser fullscreen if currently in it */
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
    }
  }

  /** Cross-browser check for current fullscreen element */
  private hasFsElement(): boolean {
    const doc = document as unknown as Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    return !!(document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
  }
}
