import { Injectable, signal } from "@angular/core";

export type ALERTTYPE = "info" | "error" | "warning" | "success";
export interface AlertMessage {
  text: string;
  title?: string;
  OKBtn?: string;
  btn2?: string;
  type?: ALERTTYPE;
}

@Injectable({
  providedIn: "root",
})
export class AlertService {
  private duration = 2500;

  private _alerts = signal<AlertMessage[]>([]);
  public get alerts() {
    return this._alerts();
  }

  public show(alert: AlertMessage) {
    // Ignore if duplicate
    if (this.alerts.find((m) => m.text === alert.text)) {
      return;
    }
    const messageWithMeta = { ...alert, createdAt: Date.now() };

    this._alerts.update((arr: AlertMessage[]) => {
      arr.unshift(messageWithMeta);
      return arr.slice(0);
    });

    // start the timer to remove
    setTimeout(
      () => this.removeAlert(messageWithMeta),
      this.duration,
      messageWithMeta,
    );
  }

  public dismiss(text: string) {
    this.removeAlert({ text });
  }

  private removeAlert(alert: AlertMessage) {
    const alertToRemove = this.alerts.find((m) => m.text === alert.text);
    if (!alertToRemove) return;

    const index = this.alerts.indexOf(alertToRemove);
    this._alerts.update((arr) => {
      arr.splice(index, 1);
      return arr.slice(0);
    });
  }
}
