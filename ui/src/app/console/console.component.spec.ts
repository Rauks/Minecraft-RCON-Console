import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { RconService } from 'src/services';
import { ConsoleComponent } from './console.component';

describe('ConsoleComponent', () => {
    let component: ConsoleComponent;
    let fixture: ComponentFixture<ConsoleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConsoleComponent],
            providers: [
                RconService,
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting()
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ConsoleComponent);
        component = fixture.componentInstance;
    });

    it("should be created", () => {
        expect(component).toBeTruthy();
    });

    it("should send a command", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(new BehaviorSubject("test response"));

        component.lastReply$.subscribe((value) => {
            expect(value).toEqual("test response");
        });

        component.commandForm.setValue({ command: "test" });
        component.onSubmit();

        expect(spy).toHaveBeenCalledWith("test");
    });

    it("should display the last reply", () => {
        fixture.detectChanges();

        let lastReplyCard = fixture.nativeElement.querySelector(".card");
        expect(lastReplyCard).toBeNull();

        component.lastReply$.next("test response");
        fixture.detectChanges();

        lastReplyCard = fixture.nativeElement.querySelector(".card");
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.textContent).toBe("test response");
    });

    it("should reset the command form", () => {
        component.commandForm.setValue({ command: "test" });
        component.onReset();

        expect(component.commandForm.value.command).toBeNull();
    });

});
