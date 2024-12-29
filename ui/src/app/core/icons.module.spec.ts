import { FaIconLibrary } from "@fortawesome/angular-fontawesome";
import { IconsModule } from "./icons.module";

describe("IconsModule", () => {
    it("should be created", () => {
        let iconsModule = new IconsModule(new FaIconLibrary());

        expect(iconsModule).toBeTruthy();
    });
});
