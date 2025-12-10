import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { RconService } from 'src/services';
import { Localizer } from 'src/utils';
import colorCodes from '../../config/minecraft-color-codes.json';
import styleCodes from '../../config/minecraft-style-codes.json';
import { ConsoleComponent, SLOW_COMMAND_DEBOUNCE_TIME } from './console.component';

describe('ConsoleComponent', () => {
    let component: ConsoleComponent;
    let fixture: ComponentFixture<ConsoleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConsoleComponent, NoopAnimationsModule],
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

    it("should generate a different and incremental uid", () => {
        const first = component["uid"]();
        const second = component["uid"]();
        const third = component["uid"]();

        expect(first).toBe(1);
        expect(second).toBe(2);
        expect(third).toBe(3);
    });

    it("should send a command", () => {
        const spy = vi.spyOn(component["rconService"], "sendCommand").mockReturnValue(new BehaviorSubject("test response"));

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

        vi.spyOn(component["rconService"], "sendCommand").mockReturnValueOnce(firstResponseSubject).mockReturnValueOnce(secondResponseSubject);

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
        vi.spyOn(component["rconService"], "sendCommand").mockReturnValue(new BehaviorSubject("test response"));

        component.commandForm.setValue({ command: "test" });
        component.onSubmit();

        expect(component.commandForm.value.command).toBeNull();
    });

    it("should display a loader when a command reply is pending and is slow", () => {
        vi.useFakeTimers();

        fixture.detectChanges();

        // No pending command, no loader
        let loader = fixture.debugElement.query(By.css("loader"));
        expect(loader).toBeNull();

        // Simulating a pending command
        component.pendingCommandsCount$.next(1);
        fixture.detectChanges();

        // Before debounce time, no loader
        vi.advanceTimersByTime(SLOW_COMMAND_DEBOUNCE_TIME - 1);
        fixture.detectChanges();
        loader = fixture.debugElement.query(By.css("loader"));
        expect(loader).toBeNull();

        // Loader should show up
        vi.advanceTimersByTime(2);
        fixture.detectChanges();
        loader = fixture.debugElement.query(By.css("loader"));
        expect(loader).not.toBeNull();

        vi.useRealTimers();
    });

    it("should add the command result to the top of the history", () => {
        const spy = vi.spyOn(component["rconService"], "sendCommand").mockReturnValueOnce(new BehaviorSubject("test response 1")).mockReturnValueOnce(new BehaviorSubject("test response 2")).mockReturnValueOnce(new BehaviorSubject("test response 3"));

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
                id: 1,
                sourceCommand: "test 3",
                matchedStatus: "unknown",
                decodedReply: component.decodeResponse("test response 3"),
            },
            {
                id: 2,
                sourceCommand: "test 2",
                matchedStatus: "unknown",
                decodedReply: component.decodeResponse("test response 2"),
            },
            {
                id: 3,
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
        const spy = vi.spyOn(component["rconService"], "sendCommand").mockReturnValue(new BehaviorSubject("test response"));

        component.onSubmit();

        expect(spy).toHaveBeenCalledWith(component.placeholderCommand);
    });

    it("should send the placeholder command if the command is only spaces", () => {
        const spy = vi.spyOn(component["rconService"], "sendCommand").mockReturnValue(new BehaviorSubject("test response"));

        component.commandForm.setValue({ command: "    " });
        component.onSubmit();

        expect(spy).toHaveBeenCalledWith(component.placeholderCommand);
    });

    it("should display the last decoded reply", () => {
        fixture.detectChanges();

        let lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).toBeNull();

        component.commandResultHistory$.next([{
            id: 1,
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
        const spy = vi.spyOn(component["rconService"], "sendCommand").mockReturnValue(throwError(() => new Error("this is a com error")));

        fixture.detectChanges();

        component.onSubmit();

        fixture.detectChanges();

        let lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.nativeElement.textContent).toBe("this is a com error");

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement.classList.contains("border-danger")).toBe(true);
    });

    it("should display a generic communcation error in case of http error without message", () => {
        const spy = vi.spyOn(component["rconService"], "sendCommand").mockReturnValue(throwError(() => null));

        fixture.detectChanges();

        component.onSubmit();

        fixture.detectChanges();

        let lastReplyCard = fixture.debugElement.query(By.css(".card-text"));
        expect(lastReplyCard).not.toBeNull();
        expect(lastReplyCard.nativeElement.textContent).toBe(Localizer.getInstance().translate("tk.error.com.unknown"));

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement.classList.contains("border-danger")).toBe(true);
    });

    it("should reset the command form", () => {
        component.commandForm.setValue({ command: "test" });
        component.onReset();

        expect(component.commandForm.value.command).toBeNull();
    });

    it("should decode the color codes", () => {
        for (let colorCode of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"]) {
            expect(component.decodeResponse(`§${colorCode}test§r`)).toEqual(`<span style="color: ${colorCodes[colorCode]};">test</span>`);
        }
        ;
    });

    it("should decode the style codes", () => {
        for (let styleCode of ["k", "l", "m", "n", "o"]) {
            expect(component.decodeResponse(`§${styleCode}test§r`)).toEqual(`<span style="${styleCodes[styleCode]};">test</span>`);
        }
        ;
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
            id: 1,
            sourceCommand: "test",
            matchedStatus: "error",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement.classList.contains("border-danger")).toBe(true);
    });

    it("should display the command invalid status", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([{
            id: 1,
            sourceCommand: "test",
            matchedStatus: "invalid",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement.classList.contains("border-warning")).toBe(true);
    });

    it("should display the command success status", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([{
            id: 1,
            sourceCommand: "test",
            matchedStatus: "unknown",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement.classList.contains("border-success")).toBe(true);
    });

    it("should display the com error status", () => {
        fixture.detectChanges();

        component.commandResultHistory$.next([{
            id: 1,
            sourceCommand: "test",
            matchedStatus: "com",
            decodedReply: component.decodeResponse("test response"),
        }]);
        fixture.detectChanges();

        let card = fixture.debugElement.query(By.css(".card-header"));
        expect(card.nativeElement.classList.contains("border-danger")).toBe(true);
    });

    it("should prefill the command form", () => {
        component.prefillCommand("test");

        expect(component.commandForm.value.command).toBe("test");

        component.prefillCommand("test updated");

        expect(component.commandForm.value.command).toBe("test updated");
    });

    it("should prefill the command form when a shortcut is clicked", () => {
        component.prefillCommand = vi.fn();

        component.onShortcutClicked({ command: "test" });

        expect(component.prefillCommand).toHaveBeenCalledWith("test");

        component.onShortcutClicked({ command: "test updated" });

        expect(component.prefillCommand).toHaveBeenCalledWith("test updated");
    });

    it("should remove the command result from the history", () => {
        expect(component.commandResultHistory$.value.length).toBe(0);

        const id = 1;
        component.commandResultHistory$.next([
            { id, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);
        expect(component.commandResultHistory$.value.length).toBe(1);

        component.removeFromHistory(0);
        expect(component.commandResultHistory$.value.length).toBe(1);

        component.removeFromHistory(id);
        expect(component.commandResultHistory$.value.length).toBe(0);
    });

    it("should disable the resend button if the reply status means the command is not resendable", () => {
        component.commandResultHistory$.next([
            { id: 1, sourceCommand: "test unknown", matchedStatus: "unknown", decodedReply: "test unknown response" },
            { id: 2, sourceCommand: "test error", matchedStatus: "error", decodedReply: "test error response" },
            { id: 3, sourceCommand: "test invalid", matchedStatus: "invalid", decodedReply: "test invalid response" },
            { id: 4, sourceCommand: "test com", matchedStatus: "com", decodedReply: "test com response" },
        ]);

        fixture.detectChanges();

        let buttons = fixture.debugElement.queryAll(By.css(".reply-resend"));
        expect(buttons[0].nativeElement.classList.contains("disabled")).toBe(false); // unknown
        expect(buttons[1].nativeElement.classList.contains("disabled")).toBe(true); // error
        expect(buttons[2].nativeElement.classList.contains("disabled")).toBe(true); // invalid
        expect(buttons[3].nativeElement.classList.contains("disabled")).toBe(false); // com
    });

    it("should resend the command when the resent button is clicked", () => {
        const prefillSpy = vi.spyOn(component, "prefillCommand");
        const sendSpy = vi.spyOn(component, "onSubmit");

        component.commandResultHistory$.next([
            { id: 1, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-resend"));
        button.nativeElement.click();

        expect(prefillSpy).toHaveBeenCalledWith("test");
        expect(sendSpy).toHaveBeenCalled();
    });

    it("should not resend the command when the resent button is clicked and the status is not resendable", () => {
        const prefillSpy = vi.spyOn(component, "prefillCommand");
        const sendSpy = vi.spyOn(component, "onSubmit");

        component.commandResultHistory$.next([
            { id: 1, sourceCommand: "test", matchedStatus: "error", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-resend"));
        button.nativeElement.click();

        expect(prefillSpy).not.toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("should autofill the command form when the autofill button is clicked", () => {
        const prefillSpy = vi.spyOn(component, "prefillCommand");

        component.commandResultHistory$.next([
            { id: 1, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-autofill"));
        button.nativeElement.click();

        expect(prefillSpy).toHaveBeenCalledWith("test");
    });

    it("should not send the command when the autofill button is clicked", () => {
        const sendSpy = vi.spyOn(component, "onSubmit");

        component.commandResultHistory$.next([
            { id: 1, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-autofill"));
        button.nativeElement.click();

        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("should remove the command result from the history when the remove button is clicked", () => {
        const removeSpy = vi.spyOn(component, "removeFromHistory");

        const id = 1;
        component.commandResultHistory$.next([
            { id, sourceCommand: "test", matchedStatus: "unknown", decodedReply: "test response" },
        ]);

        fixture.detectChanges();

        let button = fixture.debugElement.query(By.css(".reply-remove"));
        button.nativeElement.click();

        expect(removeSpy).toHaveBeenCalledWith(id);
    });

});
