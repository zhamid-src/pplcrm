import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcomeComponent } from './temp';

@Component({
  standalone: true,
  imports: [NxWelcomeComponent, RouterModule],
  selector: 'pplcrm-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'frontend';
}
