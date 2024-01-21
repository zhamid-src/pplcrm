import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PersonDetailComponent } from '../person-detail/PersonDetail.component';

@Component({
  selector: 'pc-add-person',
  standalone: true,
  imports: [CommonModule, PersonDetailComponent],
  templateUrl: './add-person.component.html',
  styleUrl: './add-person.component.scss',
})
export class AddPersonComponent {}
