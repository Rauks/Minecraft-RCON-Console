import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, throwError } from 'rxjs';
import { RconService } from 'src/services';
import { Localizer } from 'src/utils';
import colorCodes from '../../config/minecraft-color-codes.json';
import styleCodes from '../../config/minecraft-style-codes.json';
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

        component.commandResult$.subscribe((value) => {
            expect(value.sourceCommand).toBe("test");
            expect(value.matchedStatus).toBe("unknown");
            expect(value.decodedReply).toEqual(component.decodeResponse("test response"));
        });

        component.commandForm.setValue({ command: "test" });
        component.onSubmit();

        expect(spy).toHaveBeenCalledWith("test");
    });

    it("should send the placeholder command if no command is entered", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(new BehaviorSubject("test response"));

        component.onSubmit();

        expect(spy).toHaveBeenCalledWith(component.placeholderCommand);
    });

    it("should send the placeholder command if the command is only spaces", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(new BehaviorSubject("test response"));

        component.commandForm.setValue({ command: "    " });
        component.onSubmit();

        expect(spy).toHaveBeenCalledWith(component.placeholderCommand);
    });

    it("should display the last decoded reply", () => {
        fixture.detectChanges();

        let lastReplyCard = fixture.nativeElement.querySelector(".card-text");
        expect(lastReplyCard).toBeNull();

        component.commandResult$.next({
            sourceCommand: "test",
            matchedStatus: "unknown",
            decodedReply: component.decodeResponse("test response"),
        });
        fixture.detectChanges();

        lastReplyCard = fixture.nativeElement.querySelector(".card-text");
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.textContent).toBe("test response");
    });

    it("should display a com error in case of http error", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(throwError(() => new Error("this is a com error")));

        fixture.detectChanges();

        component.onSubmit();

        fixture.detectChanges();

        let lastReplyCard = fixture.nativeElement.querySelector(".card-text");
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.textContent).toBe("this is a com error");

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-danger");
    });

    it("should display a generic communcation error in case of http error without message", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(throwError(() => null));

        fixture.detectChanges();

        component.onSubmit();

        fixture.detectChanges();

        let lastReplyCard = fixture.nativeElement.querySelector(".card-text");
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.textContent).toBe(Localizer.getInstance().translate("tk.error.com.unknown"));

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-danger");
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

    it("should match the unknown status", () => {
        expect(component.matchStatus("test")).toBe("unknown");
    });

    it("should match the invalid status", () => {
        expect(component.matchStatus("Unknown or incomplete command, see below for error\nwhitelist<--[HERE]")).toBe("invalid");
    });

    it("should match the error status", () => {
        expect(component.matchStatus("The tick count must not be less than 0, found -1\n...ime set -1<--[HERE]")).toBe("error");
    });

    it("should display the command error status", () => {
        fixture.detectChanges();

        component.commandResult$.next({
            sourceCommand: "test",
            matchedStatus: "error",
            decodedReply: component.decodeResponse("test response"),
        });
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-danger");
    });

    it("should display the command invalid status", () => {
        fixture.detectChanges();

        component.commandResult$.next({
            sourceCommand: "test",
            matchedStatus: "invalid",
            decodedReply: component.decodeResponse("test response"),
        });
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-warning");
    });

    it("should display the command success status", () => {
        fixture.detectChanges();

        component.commandResult$.next({
            sourceCommand: "test",
            matchedStatus: "unknown",
            decodedReply: component.decodeResponse("test response"),
        });
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-success");
    });

    it("should display the com error status", () => {
        fixture.detectChanges();

        component.commandResult$.next({
            sourceCommand: "test",
            matchedStatus: "com",
            decodedReply: component.decodeResponse("test response"),
        });
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-danger");
    });

});
