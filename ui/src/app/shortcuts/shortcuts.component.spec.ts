import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RconService } from 'src/services';
import { ShortcutsComponent } from './shortcuts.component';

describe('ShortcutsComponent', () => {
    let component: ShortcutsComponent;
    let fixture: ComponentFixture<ShortcutsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ShortcutsComponent],
            providers: [
                RconService,
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting()
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ShortcutsComponent);
        component = fixture.componentInstance;
    });

    it("should be created", () => {
        expect(component).toBeTruthy();
    });

    it("should display the shortcuts", () => {
        fixture.detectChanges();

        const shortcuts = fixture.debugElement.queryAll(By.css("span"));
        expect(shortcuts.length).toBe(component.shortcuts.length);

        component.shortcuts.forEach((shortcut, index) => {
            const shortcutElement = shortcuts[index].nativeElement;
            expect(shortcutElement.textContent).toBe(shortcut.name);
        });
    });

    it("should emit the shortcut when clicked", () => {
        const spy = vi.spyOn(component.shortcutClicked, "emit");

        fixture.detectChanges();
        const shortcut = component.shortcuts[0];
        const shortcutElement = fixture.debugElement.query(By.css("span"));
        shortcutElement.nativeElement.click();

        expect(spy).toHaveBeenCalledWith(shortcut);
    });

    it("should get the tag class", () => {
        const shortcut = component.shortcuts[0];
        const tagClass = component.getTagClass(shortcut);
        expect(tagClass).toBe(`badge bg-${shortcut.color}`);
    });
});
