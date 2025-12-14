import { ChangeDetectionStrategy, Component, EventEmitter, Output } from "@angular/core";
import { IconLookup, IconName } from "@fortawesome/angular-fontawesome";
import { RconService } from "src/services";
import shortcuts from "../../config/shortcuts.json";
import { IconsModule } from "../core";

export type Shortcut = {
    readonly name: string;
    readonly icon: IconName | IconLookup;
    readonly color: string;
    readonly command: string;
};

@Component({
    selector: "shortcuts",
    imports: [IconsModule],
    providers: [RconService],
    templateUrl: "./shortcuts.component.html",
    styleUrl: "./shortcuts.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ShortcutsComponent {
    /**
     * The list of shortcuts to display.
     */
    public readonly shortcuts: Shortcut[] = shortcuts;

    @Output()
    public readonly shortcutClicked: EventEmitter<Shortcut> = new EventEmitter<Shortcut>();

    constructor() {}

    /**
     * Handles the click event on a shortcut.
     *
     * @param shortcut The shortcut that was clicked.
     */
    public onClick(shortcut: Shortcut): void {
        this.shortcutClicked.emit(shortcut);
    }

    public getTagClass(shortcut: Shortcut): string {
        return `badge bg-${shortcut.color}`;
    }
}
