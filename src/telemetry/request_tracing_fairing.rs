use super::RequestSpan;
use opentelemetry::{global, propagation::Extractor};
use rocket::{
    Data, Request, Response,
    fairing::{Fairing, Info, Kind},
    http::HeaderMap,
};

/// Extracts tracing context from incoming HTTP request headers.
struct RocketHeaderExtractor<'a, 'r>(&'a HeaderMap<'r>);

impl<'a, 'r> Extractor for RocketHeaderExtractor<'a, 'r> {
    fn get(&self, key: &str) -> Option<&str> {
        // Extract from the header map.
        self.0.get_one(key)
    }

    fn keys(&self) -> Vec<&str> {
        // Common header keys used for OpenTelemetry context propagation.
        ["traceparent", "tracestate", "baggage"]
            .into_iter()
            .filter(|key| self.0.contains(key))
            .collect()
    }
}

/// Rocket fairing that extracts OpenTelemetry tracing context from incoming HTTP requests and
/// creates a new tracing span for each request.
///
/// The span is enriched with:
/// - The matched route URI.
/// - The name of the request handler.
/// - The HTTP response status code.
///
/// The span is stored in Rocket's request-local cache, allowing it to be accessed in request
/// handlers using the `RequestSpan` guard.
pub struct TelemetryRequestFairing;

#[rocket::async_trait]
impl Fairing for TelemetryRequestFairing {
    fn info(&self) -> Info {
        Info {
            name: "Telemetry request context",
            kind: Kind::Request | Kind::Response,
        }
    }

    async fn on_request(&self, request: &mut Request<'_>, _data: &mut Data<'_>) {
        // Extract the parent tracing context from the incoming request headers.
        let parent_context = global::get_text_map_propagator(|propagator| {
            propagator.extract(&RocketHeaderExtractor(request.headers()))
        });

        // Store the span in Rocket's request-local cache, allowing it to be accessed in request
        // handlers using the `RequestSpan` guard.
        request.local_cache(|| RequestSpan::new_with_context(request, parent_context));
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        let request_span = request.local_cache(|| RequestSpan::new(request));

        if let Some(route) = request.route() {
            request_span.record("http.route", route.uri.to_string());
            request_span.record("app.handler", route.name.as_deref().unwrap_or("unknown"));
        } else {
            request_span.record("http.route", "unmatched");
            request_span.record("app.handler", "unmatched");
        }

        request_span.record("http.response.status_code", response.status().code);
    }
}
