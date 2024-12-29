import { Injectable, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { Settings, SettingsService } from "./settings.service";

/**
 * Singleton service used to manage the local storage
 */
@Injectable({
    providedIn: "root",
})
export class StorageService implements OnDestroy {
    /**
     * Local storage key for the settings.
     */
    private static readonly LS_SETTINGS: string = "settings";

    /**
     * Flag to enable or disable the persistance of the settings
     * in the local storage.
     */
    private isPersistanceEnabled: boolean = false;

    /** 
     * Component subscriptions.
     */
    private readonly persistSubscription: Subscription = new Subscription();

    constructor(
        protected readonly settingsService: SettingsService,
    ) {
        this.persistSubscription.add(
            this.settingsService.getSettings().subscribe((value) => {
                // On any change in the settings, persist them.
                this.persist(StorageService.LS_SETTINGS, value);
            }),
        );
    }

    /**
     * Enable the persistance of the settings in the local storage.
     */
    public enablePeristance(): void {
        if (this.isPersistanceAvailable()) {
            this.isPersistanceEnabled = true;
        }
    }

    /**
     * Disable the persistance of the settings in the local storage.
     */
    public disablePeristance(): void {
        this.isPersistanceEnabled = false;
    }

    /**
     * Reload all the data from the local storage.
     */
    public reloadAll(): void {
        if (this.isPersistanceAvailable()) {
            this.settingsService.setSettings(this.reload<Settings>(StorageService.LS_SETTINGS));
        }
    }

    /**
     * Check if the persistance is available.
     * 
     * @returns True if the persistance is available, false otherwise
     */
    private isPersistanceAvailable(): boolean {
        try {
            const x = "__storage_test__";
            localStorage.setItem(x, x);
            localStorage.removeItem(x);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Persist the data in the local storage.
     * 
     * @param key The key of the data to persist
     * @param value The data to persist
     */
    private persist<T>(key: string, value: T): void {
        if (this.isPersistanceEnabled) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }

    /**
     * Reload the data from the local storage.
     * 
     * @param key The key of the data to reload
     * 
     * @returns The reloaded data
     */
    private reload<T>(key: string): T {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (error) {
            if (console) {
                console.warn(error);
            }
        }
        return undefined;
    }

    public ngOnDestroy() {
        this.persistSubscription.unsubscribe();
    }
}
