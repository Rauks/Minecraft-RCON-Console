import { AsyncPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, DOCUMENT, Inject, OnDestroy, OnInit, Renderer2 } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BehaviorSubject, Subscription } from "rxjs";
import { SettingsService, StorageService } from "src/services";
import { CollapseDirective, IconsModule, LoaderComponent, LocalizePipe } from "./core";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, AsyncPipe, LocalizePipe, IconsModule, LoaderComponent, CollapseDirective],
    providers: [SettingsService, StorageService],
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class AppComponent implements OnInit, OnDestroy {
    /**
     * The key for the theme setting.
     */
    private static readonly THEME_SETTING: string = "theme";

    /**
     * Readiness of the application.
     */
    public ready$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    /**
     * Navbar collapsed state.
     */
    public navbarState$: BehaviorSubject<{ collapsed: boolean }> = new BehaviorSubject({ collapsed: true });

    /**
     * Holds the current theme of the application.
     */
    public readonly theme$: BehaviorSubject<string>;

    /**
     * Component subscriptions.
     */
    private readonly subscription: Subscription = new Subscription();

    constructor(
        private readonly settingsService: SettingsService,
        private readonly storageService: StorageService,
        @Inject(DOCUMENT) private readonly document: Document,
        private readonly renderer: Renderer2,
    ) {
        this.theme$ = new BehaviorSubject(this.userPreferredTheme());

        this.subscription.add(
            this.theme$.subscribe((theme: string) => {
                this.settingsService.setSetting(AppComponent.THEME_SETTING, theme);
                this.renderer.setAttribute(document.body, "data-bs-theme", theme);
            }),
        );
    }

    public ngOnInit() {
        this.storageService.reloadAll();

        // The first load is done, we can enable the persistance now
        this.storageService.enablePeristance();

        // Look in the setting if a prefered theme is set
        const userTheme = this.settingsService.getSettingsnapshot(AppComponent.THEME_SETTING);
        if (userTheme != undefined && ["dark", "light"].includes(userTheme)) {
            this.theme$.next(userTheme);
        }

        // The shell is now ready
        this.ready$.next(true);
    }

    /**
     * Toggles the navbar collapse state.
     */
    public toggleNavbarCollapse() {
        this.navbarState$.next({ collapsed: !this.navbarState$.value.collapsed });
    }

    /**
     * Closes the navbar collapse
     */
    public closeNavbarCollapse() {
        this.navbarState$.next({ collapsed: true });
    }

    /**
     * Toggles the theme of the application.
     */
    public toggleTheme(): void {
        switch (this.theme$.value) {
            case "dark":
                this.theme$.next("light");
                break;
            case "light":
            default:
                this.theme$.next("dark");
                break;
        }
    }

    /**
     * Returns the user preferred theme (dark or light, from the browser settings).
     *
     * @returns The user preferred theme.
     */
    public userPreferredTheme(): string {
        const window = this.document.defaultView;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    public ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
