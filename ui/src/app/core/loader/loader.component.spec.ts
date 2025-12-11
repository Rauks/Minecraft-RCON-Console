import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoaderComponent } from "./loader.component";

describe("LoaderComponent", () => {
    let component: LoaderComponent;
    let fixture: ComponentFixture<LoaderComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LoaderComponent],
        });

        fixture = TestBed.createComponent(LoaderComponent);
        component = fixture.componentInstance;
    });

    it("should be created", () => {
        expect(component).toBeTruthy();
    });

    it("should have small mode disabled by default", () => {
        expect(component.small).toBe(false);
    });
});
