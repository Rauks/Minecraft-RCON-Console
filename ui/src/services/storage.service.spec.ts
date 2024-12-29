import { TestBed } from "@angular/core/testing";
import { SettingsService } from "./settings.service";
import { StorageService } from "./storage.service";

describe("StorageService", () => {
    let service: StorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [StorageService],
        });

        service = TestBed.inject(StorageService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });

    it("should enable persistence", () => {
        service.enablePeristance();

        expect(service["isPersistanceEnabled"]).toBeTrue();
    });

    it("should disable persistence", () => {
        service.disablePeristance();
        expect(service["isPersistanceEnabled"]).toBeFalse();
    });

    it("should persist the settings", () => {
        // Reset to be sure that the local storage is empty
        localStorage.clear();
        service.disablePeristance();

        // Persistance is disabled, so the settings should not be persisted
        const settingsService: SettingsService = TestBed.inject(SettingsService);
        settingsService.setSetting("test-key", "test-value");
        expect(JSON.parse(localStorage.getItem(StorageService["LS_SETTINGS"]))).toBeNull();

        // Enable persistance, the settings should be persisted now
        service.enablePeristance();
        settingsService.setSetting("test-key", "test-value");
        expect(JSON.parse(localStorage.getItem(StorageService["LS_SETTINGS"]))).toBeTruthy();

        // Reload from storage
        spyOn(settingsService, "setSettings");

        service.reloadAll();

        expect(settingsService.setSettings).toHaveBeenCalledWith({
            "test-key": "test-value",
        });
    });
});
