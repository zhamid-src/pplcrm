import { Component, effect } from "@angular/core";
import { RouterLink, RouterModule } from "@angular/router";
import { ThemeService } from "@services/theme.service";

@Component({
  standalone: true,
  imports: [RouterModule, RouterLink],
  selector: "pc-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected theme = this.themeSvc.theme;

  public title = "pplcrm";

  constructor(private themeSvc: ThemeService) {
    effect(() => {
      this.theme = this.themeSvc.theme;
    });
  }
}
