import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
        let loader = fixture.debugElement.query(By.css("loader"));
        expect(loader).toBeNull();

        component.pendingCommandsCount$.next(1);
        fixture.detectChanges();

        advance(fixture);
        loader = fixture.debugElement.query(By.css("loader"));
        expect(loader).toBeNull();

        advanceWithDelay(fixture, SLOW_COMMAND_DEBOUNCE_TIME + 1);
        loader = fixture.debugElement.query(By.css("loader"));
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

        let lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).toBeNull();

        component.commandResultHistory$.next([{
            id: uuid(),
            sourceCommand: "test",
            matchedStatus: "unknown",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.nativeElement.textContent).toBe("test response");
    });

    it("should display a com error in case of http error", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(throwError(() => new Error("this is a com error")));

        fixture.detectChanges();

        component.onSubmit();

        fixture.detectChanges();

        let lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.nativeElement.textContent).toBe("this is a com error");

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement).toHaveClass("border-danger");
    });

    it("should display a generic communcation error in case of http error without message", () => {
        const spy = spyOn(component["rconService"], "sendCommand")
            .and
            .returnValue(throwError(() => null));

        fixture.detectChanges();

        component.onSubmit();

        fixture.detectChanges();

        let lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.nativeElement.textContent).toBe(Localizer.getInstance().translate("tk.error.com.unknown"));

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement).toHaveClass("border-danger");
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

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement).toHaveClass("border-danger");
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

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement).toHaveClass("border-warning");
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

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement).toHaveClass("border-success");
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

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement).toHaveClass("border-danger");
    });

    it("should prefill the command form", () => {
        component.prefillCommand("test");

        expect(component.commandForm.value.command).toBe("test");

        component.prefillCommand("test updated");

        expect(component.commandForm.value.command).toBe("test updated");
    });

    it("should prefill the command form when a shortcut is clicked", () => {
        component.prefillCommand = jasmine.createSpy("prefillCommand");

        component.onShortcutClicked({ command: "test" });

        expect(component.prefillCommand).toHaveBeenCalledWith("test");

        component.onShortcutClicked({ command: "test updated" });

        expect(component.prefillCommand).toHaveBeenCalledWith("test updated");
    });

    it("should remove the command result from the history", () => {
        expect(component.commandResultHistory$.value.length).toBe(0);

        const id = uuid();
        component.commandResultHistory$.next([
            { id, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);
        expect(component.commandResultHistory$.value.length).toBe(1);

        component.removeFromHistory(uuid());
        expect(component.commandResultHistory$.value.length).toBe(1);

        component.removeFromHistory(id);
        expect(component.commandResultHistory$.value.length).toBe(0);
    });

    it("should disable the resend button if the reply status means the command is not resendable", () => {
        component.commandResultHistory$.next([
            { id: uuid(), sourceCommand: "test unknown", matchedStatus: "unknown", decodedReply: "test unknown response" },
            { id: uuid(), sourceCommand: "test error", matchedStatus: "error", decodedReply: "test error response" },
            { id: uuid(), sourceCommand: "test invalid", matchedStatus: "invalid", decodedReply: "test invalid response" },
            { id: uuid(), sourceCommand: "test com", matchedStatus: "com", decodedReply: "test com response" },
        ]);

        fixture.detectChanges();

        let buttons = fixture.debugElement.queryAll(By.css(".reply-resend"));
        expect(buttons[0].nativeElement).not.toHaveClass("disabled"); // unknown
        expect(buttons[1].nativeElement).toHaveClass("disabled"); // error
        expect(buttons[2].nativeElement).toHaveClass("disabled"); // invalid
        expect(buttons[3].nativeElement).not.toHaveClass("disabled"); // com
    });

    it("should resend the command when the resent button is clicked", () => {
        const prefillSpy = spyOn(component, "prefillCommand").and.callThrough();
        const sendSpy = spyOn(component, "onSubmit");

        component.commandResultHistory$.next([
            { id: uuid(), sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-resend"));
        button.nativeElement.click();

        expect(prefillSpy).toHaveBeenCalledWith("test");
        expect(sendSpy).toHaveBeenCalled();
    });

    it("should not resend the command when the resent button is clicked and the status is not resendable", () => {
        const prefillSpy = spyOn(component, "prefillCommand").and.callThrough();
        const sendSpy = spyOn(component, "onSubmit");

        component.commandResultHistory$.next([
            { id: uuid(), sourceCommand: "test", matchedStatus: "error", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-resend"));
        button.nativeElement.click();

        expect(prefillSpy).not.toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("should autofill the command form when the autofill button is clicked", () => {
        const prefillSpy = spyOn(component, "prefillCommand").and.callThrough();

        component.commandResultHistory$.next([
            { id: uuid(), sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-autofill"));
        button.nativeElement.click();

        expect(prefillSpy).toHaveBeenCalledWith("test");
    });

    it("should not send the command when the autofill button is clicked", () => {
        const sendSpy = spyOn(component, "onSubmit");

        component.commandResultHistory$.next([
            { id: uuid(), sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-autofill"));
        button.nativeElement.click();

        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("should remove the command result from the history when the remove button is clicked", () => {
        const removeSpy = spyOn(component, "removeFromHistory").and.callThrough();

        const id = uuid();
        component.commandResultHistory$.next([
            { id, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-remove"));
        button.nativeElement.click();

        expect(removeSpy).toHaveBeenCalledWith(id);
    });

});
