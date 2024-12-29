import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";

export declare interface Settings {
    [key: string]: string;
}

/**
 * Singleton service
 */
@Injectable({
    providedIn: "root",
})
export class SettingsService {
    private readonly settings$: BehaviorSubject<Settings> = new BehaviorSubject<Settings>({});

    /**
     * Set the settings
     * 
     * @param settings The settings to set
     */
    public setSettings(settings: Settings): void {
        if (settings != undefined) {
            this.settings$.next({
                ...this.settings$.value,
                ...settings,
            });
        }
    }

    /**
     * Set a setting
     * 
     * @param key The key of the setting
     * @param value The value of the setting
     */
    public setSetting(key: string, value: string): void {
        this.setSettings({ [key]: value });
    }

    /**
     * Get the settings as an observable
     * 
     * @returns The settings as an observable
     */
    public getSettings(): BehaviorSubject<Settings> {
        return this.settings$;
    }

    /**
     * Get a setting
     * 
     * @param key The key of the setting
     * 
     * @returns The setting
     */
    public getSetting(key: string): Observable<string> {
        return this.settings$.pipe(
            map((settings: Settings) => {
                return settings[key];
            }),
        );
    }

    /**
     * Get a instant snapshot of a setting
     * 
     * @param key The key of the setting
     * 
     * @returns The setting snapshot
     */
    public getSettingsnapshot(key: string): string | undefined {
        return this.settings$.value[key];
    }
}
