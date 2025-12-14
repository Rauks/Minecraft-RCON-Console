import { Routes } from "@angular/router";
import { ConsoleComponent } from "./console/console.component";

export const routes: Routes = [{ path: "**", component: ConsoleComponent }];
