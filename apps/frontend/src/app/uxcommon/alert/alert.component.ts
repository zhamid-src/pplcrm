import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ALERTTYPE, AlertService } from '@services/alert.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
    selector: 'pc-alert',
    imports: [CommonModule, IconsComponent],
    templateUrl: './alert.component.html',
    styleUrl: './alert.component.scss'
})
export class AlertComponent {
  position = signal<'top' | 'bottom' | 'relative'>('relative');
  protected alerts() {
    return this.position() === 'top'
      ? this.alertSvc.alerts.slice().reverse()
      : this.alertSvc.alerts;
  }

  constructor(protected alertSvc: AlertService) {}

  public OKBtnClick(text: string) {
    this.alertSvc.OKBtnCallback(text);
    this.alertSvc.dismiss(text);
  }

  public btn2Click(text: string) {
    this.alertSvc.btn2Callback(text);
    this.alertSvc.dismiss(text);
  }

  public icon(type: ALERTTYPE) {
    return type === 'success'
      ? 'check-circle'
      : type === 'warning'
        ? 'exclamation-triangle'
        : type === 'error'
          ? 'x-circle'
          : 'exclamation-circle';
  }
}
