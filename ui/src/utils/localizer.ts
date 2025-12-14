import defaultLocale from "./locales/strings.json";

export class Localizer {
    /**
     * Returns the localizer instance
     */
    public static getInstance(): Localizer {
        return Localizer.instance;
    }

    /**
     * The localizer instance
     */
    private static readonly instance: Localizer = new Localizer();

    /**
     * Available locales
     */
    private locales: { [key: string]: string } = defaultLocale;

    /**
     * Overrides the default locale with the provided one
     *
     * @param locale The locale to load
     */
    public loadLocale(locale: { [key: string]: string }): void {
        this.locales = locale;
    }

    /**
     * Translates the provided key
     *
     * @param key The translation
     */
    public translate(key: string): string {
        if (key == undefined) {
            return "?";
        }
        if (key.includes("#")) {
            const parts: string[] = key.split("#");
            const translation: string = this.getTranslation(parts.shift());
            return parts.reduce((tr: string, part: string, currentIndex: number): string => {
                return tr.replace(`{${currentIndex}}`, part);
            }, translation);
        }
        return this.getTranslation(key);
    }

    /**
     * Sanitizes the given term (removes diacritics and lowercases it)
     *
     * @param term The term to sanitize
     *
     * @returns The sanitized term
     */
    public static sanitize(term: undefined): undefined;
    public static sanitize(term: string): string;
    public static sanitize(term: string | undefined): string | undefined {
        return term
            ?.normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase();
    }

    private getTranslation(key: string): string {
        if (this.locales[key] != undefined) {
            return this.locales[key];
        }
        return key;
    }
}
