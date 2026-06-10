import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { map, Observable } from "rxjs";

export declare interface RconResponse {
    id: number;
    payload: string;
}

/**
 * Singleton service
 */
@Service()
export class RconService {
    protected readonly httpClient: HttpClient = inject(HttpClient);

    /**
     * Send a command to the RCON server
     *
     * @param command The command to send
     */
    public sendCommand(command: string): Observable<string> {
        return this.httpClient
            .post<RconResponse>("/api/rcon", command)
            .pipe(map((response: RconResponse) => response.payload));
    }
}
