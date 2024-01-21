import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PersonDetailComponent } from '../person-detail/PersonDetail.component';

@Component({
  selector: 'pc-view-person',
  standalone: true,
  imports: [CommonModule, PersonDetailComponent],
  templateUrl: './viewPerson.component.html',
  styleUrl: './viewPerson.component.scss',
})
export class ViewPersonComponent {}
