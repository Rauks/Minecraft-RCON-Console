import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CollapseDirective } from "./collapse.directive";

describe("CollapseDirective", () => {
    let component: CollapseComponent;
    let fixture: ComponentFixture<CollapseComponent>;

    @Component({
        template: `<div [collapse]="collapsed">content</div>`,
        imports: [CollapseDirective],
        standalone: true,
    })
    class CollapseComponent {
        public collapsed: boolean = true;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CollapseComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CollapseComponent);
        component = fixture.componentInstance;
    });

    it("should be collapsed", () => {
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector("div").classList).toContain("collapse");
        expect(fixture.nativeElement.querySelector("div").classList).not.toContain("show");
    });

    it("should be expanded", () => {
        fixture.componentInstance.collapsed = false;
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector("div").classList).toContain("collapse");
        expect(fixture.nativeElement.querySelector("div").classList).toContain("show");
    });
});
