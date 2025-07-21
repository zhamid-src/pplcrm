import { Component } from "@angular/core";
import { RouterLink, RouterModule } from "@angular/router";
import { ThemeService } from "@services/theme.service";

@Component({
    imports: [RouterModule],
    selector: "pc-root",
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss"
})
export class AppComponent {
  constructor(protected themeSvc: ThemeService) {}
}
