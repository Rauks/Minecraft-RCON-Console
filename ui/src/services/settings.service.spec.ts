import { TestBed } from "@angular/core/testing";
import { Settings, SettingsService } from "./settings.service";

describe("StorageService", () => {
    let service: SettingsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SettingsService],
        });

        service = TestBed.inject(SettingsService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });

    it("should set and get settings", () => {
        const settings: Settings = {
            setting1: "value1",
            setting2: "value2",
        };

        service.setSettings(settings);

        expect(service.getSettings().value).toEqual(settings);
    });

    it("should get a snapshot of a setting", () => {
        const settings: Settings = {
            setting1: "value1",
            setting2: "value2",
        };

        service.setSettings(settings);

        expect(service.getSettingsnapshot("setting1")).toEqual("value1");
    });
});
