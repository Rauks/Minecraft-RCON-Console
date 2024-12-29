import { Pipe, PipeTransform } from "@angular/core";
import { Localizer } from "src/app/utils";

/**
 * Localize pipe
 */
@Pipe({
    name: "localize",
    standalone: true,
})
export class LocalizePipe implements PipeTransform {
    /**
     * Translates the provided key
     *
     * @param key The translated key
     */
    public transform(key: string): string {
        return Localizer.getInstance().translate(key);
    }
}
