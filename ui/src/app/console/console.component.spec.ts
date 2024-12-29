import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { RconService } from 'src/services';
import colorCodes from '../../config/color-codes.json';
import styleCodes from '../../config/style-codes.json';
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

        component.lastDecodedReply$.subscribe((value) => {
            expect(value).toEqual(component.decodeResponse("test response"));
        });

        component.commandForm.setValue({ command: "test" });
        component.onSubmit();

        expect(spy).toHaveBeenCalledWith("test");
    });

    it("should display the last decoded reply", () => {
        fixture.detectChanges();

        let lastReplyCard = fixture.nativeElement.querySelector(".card");
        expect(lastReplyCard).toBeNull();

        component.lastDecodedReply$.next(component.decodeResponse("test response"));
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

    it("should decode the color codes", () => {
        for (let colorCode of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"]) {
            expect(component.decodeResponse(`§${colorCode}test§r`)).toEqual(`<span style="color: ${colorCodes[colorCode]};">test</span>`);
        };
    });

    it("should decode the style codes", () => {
        for (let styleCode of ["k", "l", "m", "n", "o"]) {
            expect(component.decodeResponse(`§${styleCode}test§r`)).toEqual(`<span style="${styleCodes[styleCode]};">test</span>`);
        };
    });

    it("should decode new lines", () => {
        expect(component.decodeResponse("test\ntest")).toEqual("test<br>test");
    });

});
