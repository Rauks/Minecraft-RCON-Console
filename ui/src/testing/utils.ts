import { ComponentFixture, tick } from "@angular/core/testing";

/**
 * Wait a tick, then detect changes
 */
export function advance(f: ComponentFixture<any>): void {
    tick();
    f.detectChanges();
}

/**
 * Wait a tick, then detect changes
 */
export function advanceWithDelay(f: ComponentFixture<any>, delay: number): void {
    tick(delay);
    f.detectChanges();
}
