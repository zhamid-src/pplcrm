import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-event-type-selector',
  imports: [RouterLink, Icon],
  templateUrl: './event-type-selector.html',
  styles: [`:host { display: block; min-height: 100%; }`],
})
export class EventTypeSelectorComponent {}
