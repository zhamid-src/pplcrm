import { Component, inject } from "@angular/core";
import { RouterModule } from "@angular/router";
import { ThemeService } from "@services/theme.service";

@Component({
  imports: [RouterModule],
  selector: "pc-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  protected themeSvc = inject(ThemeService);
}
