import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
    selector: "loader",
    templateUrl: "./loader.component.html",
    styleUrls: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true
})
export class LoaderComponent {
    @Input()
    public small: boolean = false;
}
