import { Localizer } from "src/app/utils";
import { LocalizePipe } from "./localize.pipe";

describe("LocalizePipe", () => {
    let pipe: LocalizePipe;

    beforeEach(() => {
        pipe = new LocalizePipe();

        Localizer.getInstance().loadLocale({
            "tk.test": "Test",
            "tk.test.composed": "Test {0}",
            "tk.test.multiple": "Test {0} {1} {2}"
        });
    });

    it("should translate simple keys", () => {
        expect(pipe.transform("tk.test")).toBe("Test");
    });

    it("should not translate unknown keys", () => {
        expect(pipe.transform("unknown")).toBe("unknown");
    });

    it('should translate undefined keys into "?"', () => {
        expect(pipe.transform(undefined)).toBe("?");
    });

    it("should translate composed keys", () => {
        expect(pipe.transform("tk.test.composed#5")).toBe("Test 5");
    });

    it("should translate composed keys with missing parameter", () => {
        expect(pipe.transform("tk.test.composed")).toBe("Test {0}");
    });

    it("should translate composed keys with extra parameters", () => {
        expect(pipe.transform("tk.test.composed#5#10")).toBe("Test 5");
    });

    it("should translate composed keys respecting parameters order", () => {
        expect(pipe.transform("tk.test.multiple#5#3#7")).toBe("Test 5 3 7");
    });
});
