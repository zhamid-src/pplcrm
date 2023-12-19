import { Component, effect } from "@angular/core";
import { RouterLink, RouterModule } from "@angular/router";
import { ThemeService } from "./services/theme.service";

@Component({
  standalone: true,
  imports: [RouterModule, RouterLink],
  selector: "pplcrm-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  // #region Properties (1)

  public title = "pplcrm";
  protected theme = this.themeSvc.theme;

  constructor(private themeSvc: ThemeService) {
    effect(() => {
      this.theme = this.themeSvc.theme;
    });
  }

  // #endregion Properties (1)
}
