use rocket::Request;
use std::ops::Deref;
use tracing::{Span, info_span};

cfg_if::cfg_if! {
    if #[cfg(feature = "opentelemetry")] {
        use opentelemetry::Context;
        use tracing_opentelemetry::OpenTelemetrySpanExt;
        use tracing::trace;
    }
}

/// Wrapper around a `tracing::Span` to be stored in Rocket's request-local cache, allowing it to be
/// retrieved in request handlers and used for tracing the request lifecycle.
pub struct RequestSpan(pub Span);

impl RequestSpan {
    pub fn span(&self) -> &Span {
        &self.0
    }
}

impl Deref for RequestSpan {
    type Target = Span;

    fn deref(&self) -> &Self::Target {
        self.span()
    }
}

impl RequestSpan {
    /// Create a new `RequestSpan`, using the provided parent context to link it to any upstream
    /// spans that may exist.
    #[cfg(feature = "opentelemetry")]
    pub fn new_with_context(request: &Request<'_>, parent_context: Context) -> Self {
        // Create a new tracing span for the incoming request.
        let span = RequestSpan::new(request);

        // Set the parent context for the span, allowing it to be linked to any upstream spans that
        // may exist (from Traefik).
        span.set_parent(parent_context)
            .inspect_err(|err| {
                trace!("Failed to set parent context for span: {:?}", err);
            })
            .ok();

        span
    }

    /// Create a new `RequestSpan`.
    pub fn new(request: &Request<'_>) -> Self {
        RequestSpan(info_span!(
            "RocketRequest",

            url.path = %request.uri().path(),

            http.request.method = %request.method(),
            http.route = tracing::field::Empty,
            http.response.status_code = tracing::field::Empty,

            app.component = "http",
            app.handler = tracing::field::Empty,
        ))
    }
}
