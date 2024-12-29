import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { RconService } from 'src/services';
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

    public readonly commandForm: FormGroup<{
        command: FormControl<string | null>
    }> = new FormGroup({
        command: new FormControl(null),
    });

    public readonly lastReply$: Subject<string> = new Subject();

    constructor(
        private readonly rconService: RconService,
    ) {

    }

    public onSubmit(): void {
        const command = this.commandForm.value.command;

        this.rconService.sendCommand(command).subscribe((reply: string) => {
            this.lastReply$.next(reply);
        });
    }

    /**
     * Resets the send control
     */
    public onReset(): void {
        this.commandForm.reset();
    }
}
