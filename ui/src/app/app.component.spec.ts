import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SettingsService, StorageService } from 'src/services';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [SettingsService, StorageService],
        }).compileComponents();

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
    });

    it("should be created", () => {
        expect(component).toBeTruthy();
    });

    it("should contain the router outlet when ready", () => {
        expect(fixture.debugElement.query(By.css("router-outlet"))).toBeFalsy();

        component.ready$.next(true);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css("router-outlet"))).toBeTruthy();
    });

    it("should contain the navigation when ready", () => {
        expect(fixture.debugElement.query(By.css("nav"))).toBeFalsy();

        component.ready$.next(true);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css("nav"))).toBeTruthy();
    });

    it("should initialize the theme", () => {
        expect(component.theme$).toBeTruthy();
    });

    it("should toggle the theme in order", () => {
        component.theme$.next("light");

        component.toggleTheme();
        expect(component.theme$.value).toEqual("dark");

        component.toggleTheme();
        expect(component.theme$.value).toEqual("light");

        component.toggleTheme();
        expect(component.theme$.value).toEqual("dark");
    });

    it("should toggle the navbar collapse", () => {
        // Should be true by default
        expect(component.navbarState$.value.collapsed).toBeTrue();

        component.toggleNavbarCollapse();
        expect(component.navbarState$.value.collapsed).toBeFalse();
        component.toggleNavbarCollapse();
        expect(component.navbarState$.value.collapsed).toBeTrue();
    });

    it("should close the navbar collapse", () => {
        component.closeNavbarCollapse();
        expect(component.navbarState$.value.collapsed).toBeTrue();
    });

    it("should reload all settings from storage on init", () => {
        spyOn(component["storageService"], "reloadAll").and.callThrough();

        fixture.detectChanges();

        expect(component["storageService"].reloadAll).toHaveBeenCalled();
    });

});
