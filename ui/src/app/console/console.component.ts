import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { minimatch } from 'minimatch';
import { BehaviorSubject } from 'rxjs';
import { RconService } from 'src/services';
import { Localizer } from 'src/utils';
import { v4 as uuid } from 'uuid';
import colorCodes from '../../config/minecraft-color-codes.json';
import statusMatchers from '../../config/minecraft-status-matchers.json';
import styleCodes from '../../config/minecraft-style-codes.json';
import { IconsModule, LocalizePipe } from '../core';

export type CommandResultStatus = "unknown" | "error" | "invalid" | "com";

@Component({
    selector: 'console',
    imports: [AsyncPipe, LocalizePipe, IconsModule, ReactiveFormsModule],
    providers: [RconService],
    templateUrl: './console.component.html',
    styleUrl: './console.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ConsoleComponent {
    /**
     * Bypasses the security of the HTML, to be user in the view
     * only for the decoded reply.
     */
    public readonly bypassSecurityTrustHtml: (value: string) => SafeHtml;

    /**
     * The placeholder command to display and use if no command is entered.
     */
    public readonly placeholderCommand = "help";

    /**
     * The form to send commands to the RCON server.
     */
    public readonly commandForm: FormGroup<{
        command: FormControl<string | null>
    }> = new FormGroup({
        command: new FormControl(null),
    });

    /**
     * The history of the command results.
     */
    public readonly commandResultHistory$: BehaviorSubject<{
        id: string,
        sourceCommand: string,
        matchedStatus: CommandResultStatus,
        decodedReply: string | null
    }[]> = new BehaviorSubject([]);

    constructor(
        private readonly rconService: RconService,
        private readonly sanitizer: DomSanitizer,
    ) {
        this.bypassSecurityTrustHtml = this.sanitizer.bypassSecurityTrustHtml.bind(this.sanitizer);
    }

    /**
     * Decodes the response from the RCON server
     * 
     * @param text The text to decode
     * 
     * @returns The decoded text
     */
    public decodeResponse(text: string): string {

        // Replace new lines with <br> tags
        text = text.replace(/\n/g, "<br>");

        // Replace color codes with spans
        text = text.replace(/§([0-9a-f])/g, (match, group) => {
            return `<span style="color: ${colorCodes[group]};">`;
        });

        // Replace style codes with spans
        text = text.replace(/§([k-o])/g, (match, group) => {
            return `<span style="${styleCodes[group]};">`;
        });

        // Replace reset code with closing span
        text = text.replace(/§r/g, "</span>");

        return text;
    }

    /**
     * Matches the reply to a status
     * 
     * @param reply The reply to match
     * 
     * @returns The status of the reply
     */
    public matchStatus(reply: string): CommandResultStatus {
        for (const [status, matchers] of Object.entries(statusMatchers)) {
            for (const matcher of matchers) {

                console.log(reply, matcher);
                if (minimatch(reply, matcher)) {
                    return status as CommandResultStatus;
                }
            }
        }
        return "unknown";
    }

    /**
     * Sends the command to the RCON server
     */
    public onSubmit(): void {
        const rawCommand = (this.commandForm.value.command ?? "").trim();
        const command = rawCommand.length > 0 ? rawCommand : this.placeholderCommand;

        // Send the command
        this.rconService.sendCommand(command).subscribe({
            next: (reply) => {
                this.commandResultHistory$.next([
                    {
                        id: uuid(),
                        sourceCommand: command,
                        matchedStatus: this.matchStatus(reply),
                        decodedReply: this.decodeResponse(reply),
                    },
                    ...this.commandResultHistory$.value
                ]);
            },
            error: (error) => {
                this.commandResultHistory$.next([
                    {
                        id: uuid(),
                        sourceCommand: command,
                        matchedStatus: "com",
                        decodedReply: error?.message
                            ?? Localizer.getInstance().translate("tk.error.com.unknown"),
                    },
                    ...this.commandResultHistory$.value
                ]);
            }
        });

        // Reset the form
        this.commandForm.reset();
    }

    /**
     * Resets the send control
     */
    public onReset(): void {
        this.commandForm.reset();
    }
}
