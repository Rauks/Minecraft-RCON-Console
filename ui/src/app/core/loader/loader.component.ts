import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { LocalizePipe } from "../pipes";

@Component({
    selector: "loader",
    imports: [LocalizePipe],
    templateUrl: "./loader.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true
})
export class LoaderComponent {
    @Input()
    public small: boolean = false;
}
