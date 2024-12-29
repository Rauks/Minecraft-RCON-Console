import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

export declare interface RconResponse {
    id: number;
    payload: string;
}

/**
 * Singleton service
 */
@Injectable({
    providedIn: "root",
})
export class RconService {
    constructor(protected readonly httpClient: HttpClient) { }

    /**
     * Send a command to the RCON server
     * 
     * @param command The command to send
     */
    public sendCommand(command: string): Observable<string> {
        return this.httpClient
            .post("/api/rcon", command)
            .pipe(
                map((response: RconResponse) => response.payload)
            );
    }
}
