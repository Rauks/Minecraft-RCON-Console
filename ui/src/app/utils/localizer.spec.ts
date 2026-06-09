import { Localizer } from "./localizer";

describe("Localizer", () => {
    let localizer: Localizer;

    beforeEach(() => {
        localizer = new Localizer();
        localizer.loadLocale({
            "tk.test": "Test",
            "tk.test.composed": "Test {0}",
            "tk.test.multiple": "Test {0} {1} {2}",
        });
    });

    it("should have a singleton instance", () => {
        const instance1 = Localizer.getInstance();
        const instance2 = Localizer.getInstance();

        expect(instance1).toBe(instance2);
    });

    it("should translate simple keys", () => {
        expect(localizer.translate("tk.test")).toBe("Test");
    });

    it("should not translate unknown keys", () => {
        expect(localizer.translate("unknown")).toBe("unknown");
    });

    it('should translate undefined keys into "?"', () => {
        expect(localizer.translate(undefined)).toBe("?");
    });

    it("should translate composed keys", () => {
        expect(localizer.translate("tk.test.composed#5")).toBe("Test 5");
    });

    it("should translate composed keys with missing parameter", () => {
        expect(localizer.translate("tk.test.composed")).toBe("Test {0}");
    });

    it("should translate composed keys with extra parameters", () => {
        expect(localizer.translate("tk.test.composed#5#10")).toBe("Test 5");
    });

    it("should translate composed keys respecting parameters order", () => {
        expect(localizer.translate("tk.test.multiple#5#3#7")).toBe("Test 5 3 7");
    });
});
