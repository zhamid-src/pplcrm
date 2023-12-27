import { Injectable, effect, signal } from "@angular/core";

export type ALERTTYPE = "info" | "error" | "warning" | "success";
export interface AlertMessage {
  text: string;
  title?: string;
  OKBtn?: string;
  btn2?: string;
  type: ALERTTYPE;
}

interface AlertMessageWithMeta extends AlertMessage {
  createdAt: number;
}

@Injectable({
  providedIn: "root",
})
export class AlertService {
  private duration = 2500;

  private _newAlert = signal<AlertMessageWithMeta | null>(null);
  public get newAlert() {
    return this._newAlert();
  }

  private _alerts: AlertMessageWithMeta[] = [];
  public get alerts() {
    return this._alerts;
  }

  constructor() {
    effect(() => {
      const alert = this._newAlert();
      if (!alert) return;
      setTimeout(
        () => {
          if (
            this._alerts.find((m) => m.text === alert.text) &&
            Date.now() > alert.createdAt + 1500
          ) {
            this.removeAlert(alert);
          }
        },
        this.duration,
        alert,
      );
    });
  }

  public show(
    text: string,
    type: ALERTTYPE = "info",
    title?: string,
    OKBtn?: string,
    btn2?: string,
  ) {
    // Ignore if duplicate
    if (this._alerts.find((m) => m.text === text && m.type === type)) {
      return;
    }
    const messageWithMeta: AlertMessageWithMeta = {
      text,
      type,
      title,
      OKBtn,
      btn2,
      createdAt: Date.now(),
    };
    this._alerts.push(messageWithMeta);
    this._newAlert.set(messageWithMeta);
  }

  public dismiss(text: string) {
    // The last two don't matter, just the text
    this.removeAlert({ text, type: "info", createdAt: 0 });
  }

  private removeAlert(alert: AlertMessageWithMeta) {
    const index = this._alerts.indexOf(alert);
    this._alerts.splice(index, 1);
    this._newAlert.set(null);
  }
}
