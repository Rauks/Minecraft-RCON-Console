import { FaIconLibrary } from "@fortawesome/angular-fontawesome";
import { IconsModule } from "./icons.module";

describe("IconsModule", () => {
    it("should be created", () => {
        const iconsModule = new IconsModule(new FaIconLibrary());

        expect(iconsModule).toBeTruthy();
    });
});
