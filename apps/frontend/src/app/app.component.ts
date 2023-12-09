import { Component } from "@angular/core";
import { RouterLink, RouterModule } from "@angular/router";

@Component({
  standalone: true,
  imports: [RouterModule, RouterLink],
  selector: "pplcrm-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  // #region Properties (1)

  public title = "frontend";

  // #endregion Properties (1)
}
