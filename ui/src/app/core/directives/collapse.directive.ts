import { ChangeDetectorRef, Directive, HostBinding, Input } from "@angular/core";

@Directive({
    selector: "[collapse]",
    standalone: true,
})
export class CollapseDirective {
    @HostBinding("class.collapse")
    public enableCollapse = true;

    @HostBinding("class.show")
    public show = false;

    @Input("collapse")
    set collapsed(value: boolean) {
        this.show = !value;
        this.changeDetector.markForCheck();
    }

    constructor(private readonly changeDetector: ChangeDetectorRef) { }
}
