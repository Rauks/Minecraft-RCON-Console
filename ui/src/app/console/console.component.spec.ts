import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { RconService } from 'src/services';
import { advance, advanceWithDelay } from 'src/testing';
import { Localizer } from 'src/utils';
import { v4 as uuid } from 'uuid';
import colorCodes from '../../config/minecraft-color-codes.json';
import styleCodes from '../../config/minecraft-style-codes.json';
import { ConsoleComponent, SLOW_COMMAND_DEBOUNCE_TIME } from './console.component';

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

        component.commandForm.setValue({ command: "test" });
        component.onSubmit();

        const currentHsitory = component.commandResultHistory$.value;
        expect(currentHsitory.length).toBe(1);

        expect(currentHsitory[0].sourceCommand).toBe("test");
        expect(currentHsitory[0].matchedStatus).toBe("unknown");
        expect(currentHsitory[0].decodedReply).toEqual(component.decodeResponse("test response"));

        expect(spy).toHaveBeenCalledWith("test");
    });

    it("should count the pending commands", () => {
        const firstResponseSubject = new Subject<string>();
        const secondResponseSubject = new Subject<string>();

        spyOn(component["rconService"], "sendCommand")
            .and
            .returnValues(firstResponseSubject, secondResponseSubject);

        expect(component.pendingCommandsCount$.value).toBe(0);

        component.commandForm.setValue({ command: "test 1" });
        component.onSubmit();
        expect(component.pendingCommandsCount$.value).toBe(1);

        component.commandForm.setValue({ command: "test2" });
        component.onSubmit();
        expect(component.pendingCommandsCount$.value).toBe(2);

        firstResponseSubject.next("test response 1");
        expect(component.pendingCommandsCount$.value).toBe(1);

        secondResponseSubject.next("test response 2");
        expect(component.pendingCommandsCount$.value).toBe(0);
    });

    it("should reset the command form after sending a command", () => {
        spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(new BehaviorSubject("test response"));

        component.commandForm.setValue({ command: "test" });
        component.onSubmit();

        expect(component.commandForm.value.command).toBeNull();
    });

    it("should display a loader when a command reply is pending and is slow", fakeAsync(() => {
        fixture.detectChanges();

        advance(fixture);
        let loader = fixture.nativeElement.querySelector("loader");
        expect(loader).toBeNull();

        component.pendingCommandsCount$.next(1);
        fixture.detectChanges();

        advance(fixture);
        loader = fixture.nativeElement.querySelector("loader");
        expect(loader).toBeNull();

        advanceWithDelay(fixture, SLOW_COMMAND_DEBOUNCE_TIME + 1);
        loader = fixture.nativeElement.querySelector("loader");
        expect(loader).not.toBeNull();
    }));

    it("should add the command result to the top of the history", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValues(
                new BehaviorSubject("test response 1"),
                new BehaviorSubject("test response 2"),
                new BehaviorSubject("test response 3"),
            );

        component.commandForm.setValue({ command: "test 1" });
        component.onSubmit();

        component.commandForm.setValue({ command: "test 2" });
        component.onSubmit();

        component.commandForm.setValue({ command: "test 3" });
        component.onSubmit();

        const currentHsitory = component.commandResultHistory$.value;
        expect(currentHsitory.length).toBe(3);

        expect(currentHsitory[0].sourceCommand).toBe("test 3");
        expect(currentHsitory[1].sourceCommand).toBe("test 2");
        expect(currentHsitory[2].sourceCommand).toBe("test 1");
    });

    it("should display the command result history", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([
            {
                id: uuid(),
                sourceCommand: "test 3",
                matchedStatus: "unknown",
                decodedReply: component.decodeResponse("test response 3"),
            },
            {
                id: uuid(),
                sourceCommand: "test 2",
                matchedStatus: "unknown",
                decodedReply: component.decodeResponse("test response 2"),
            },
            {
                id: uuid(),
                sourceCommand: "test 1",
                matchedStatus: "unknown",
                decodedReply: component.decodeResponse("test response 1"),
            },
        ]);
        fixture.detectChanges();

        const cards = fixture.nativeElement.querySelectorAll(".card");
        expect(cards.length).toBe(3);

        expect(cards[0].querySelector(".card-header").textContent).toBe("test 3");
        expect(cards[0].querySelector(".card-text").textContent).toBe("test response 3");

        expect(cards[1].querySelector(".card-header").textContent).toBe("test 2");
        expect(cards[1].querySelector(".card-text").textContent).toBe("test response 2");

        expect(cards[2].querySelector(".card-header").textContent).toBe("test 1");
        expect(cards[2].querySelector(".card-text").textContent).toBe("test response 1");
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

        component.commandResultHistory$.next([{
            id: uuid(),
            sourceCommand: "test",
            matchedStatus: "unknown",
            decodedReply: component.decodeResponse("test response"),
        }]);
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

        component.commandResultHistory$.next([{
            id: uuid(),
            sourceCommand: "test",
            matchedStatus: "error",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-danger");
    });

    it("should display the command invalid status", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([{
            id: uuid(),
            sourceCommand: "test",
            matchedStatus: "invalid",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-warning");
    });

    it("should display the command success status", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([{
            id: uuid(),
            sourceCommand: "test",
            matchedStatus: "unknown",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-success");
    });

    it("should display the com error status", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([{
            id: uuid(),
            sourceCommand: "test",
            matchedStatus: "com",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.nativeElement.querySelector(".card-header");
        expect(card).toHaveClass("border-danger");
    });
});
