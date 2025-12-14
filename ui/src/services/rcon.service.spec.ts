import { HttpClient, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { RconResponse, RconService } from "./rcon.service";

describe("RconService", () => {
    let service: RconService;

    let httpClient: HttpClient;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [RconService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });

        httpClient = TestBed.inject(HttpClient);
        httpTestingController = TestBed.inject(HttpTestingController);
        service = TestBed.inject(RconService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });

    it("sending a command sould call the right endpoint", () => {
        const apiResponse: RconResponse = {
            id: 1,
            payload: "test response",
        };

        service.sendCommand("test").subscribe({
            next: (response) => {
                expect(response).toEqual("test response");
            },
            error: (error) => {
                throw error;
            },
        });

        const req = httpTestingController.expectOne("/api/rcon");
        expect(req.request.method).toEqual("POST");
        expect(req.request.body).toEqual("test");

        req.flush(apiResponse);
        httpTestingController.verify();
    });
});
