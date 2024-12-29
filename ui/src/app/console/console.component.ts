import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { RconService } from 'src/services';
import colorCodes from '../../config/color-codes.json';
import styleCodes from '../../config/style-codes.json';
import { IconsModule, LocalizePipe } from '../core';

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

    public readonly bypassSecurityTrustHtml: (value: string) => SafeHtml;

    public readonly commandForm: FormGroup<{
        command: FormControl<string | null>
    }> = new FormGroup({
        command: new FormControl(null),
    });

    public readonly lastDecodedReply$: Subject<string> = new Subject();

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
     * Sends the command to the RCON server
     */
    public onSubmit(): void {
        const command = this.commandForm.value.command;

        this.rconService.sendCommand(command).subscribe((reply: string) => {
            this.lastDecodedReply$.next(this.decodeResponse(reply));
        });
    }

    /**
     * Resets the send control
     */
    public onReset(): void {
        this.commandForm.reset();
    }
}
