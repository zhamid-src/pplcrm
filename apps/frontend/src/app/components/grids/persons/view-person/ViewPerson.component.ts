import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'pc-view-person',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ViewPerson.component.html',
  styleUrl: './ViewPerson.component.scss',
})
export class ViewPersonComponent {
  protected id: string | null;
  constructor(private route: ActivatedRoute) {
    this.id = this.route.snapshot.paramMap.get('id');
  }
}
