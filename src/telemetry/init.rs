use opentelemetry::{global, trace::TracerProvider};
use opentelemetry_otlp::{SpanExporter, WithExportConfig};
use opentelemetry_sdk::{Resource, propagation::TraceContextPropagator, trace::SdkTracerProvider};
use std::env;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

/// Initializes logs and traces for the application.
///
/// - Logs will be displayed in JSON format on stdout.
/// - Traces will be pushed to the provided OTLP endpoint.
///
/// # Environment Variables:
///
/// - `RUST_LOG`: Configures the log level (e.g., "info", "debug", "error"). Defaults to "info" if
///    not set.
/// - `OTEL_EXPORTER_OTLP_ENDPOINT`: Enables OTLP tracing to the specified endpoint. If not set,
///   traces will not be exported.
/// - `OTEL_SERVICE_NAME`: Specifies the service name for OTLP traces. Defaults to the crate name.
///
/// # Returns:
///
/// An optional `SdkTracerProvider` instance if OTLP tracing is enabled, otherwise `None`. To be
/// used for graceful shutdown of the tracer provider when OTLP tracing is enabled.
/// Failing to properly shut down the tracer provider may result in lost traces.
#[allow(unused)]
pub fn init_telemetry() -> Option<SdkTracerProvider> {
    // Configure the environment filter from the value of the `RUST_LOG` environment variable.
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    // Configure the formatted layer to output logs in JSON format with additional context.
    let fmt_layer = fmt::layer()
        .json()
        .with_current_span(true)
        .with_span_list(true)
        .with_file(true)
        .with_line_number(true);

    // Check if the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable is set to determine if OTLP
    // tracing should be enabled.
    if let Ok(endpoint) = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT") {
        // Endpoint is set, so we will initialize OTLP tracing.
        global::set_text_map_propagator(TraceContextPropagator::new());

        // Initialize the OTLP exporter and tracer provider.
        let exporter = SpanExporter::builder()
            // Enable gRPC support.
            .with_tonic()
            // Use the provided endpoint.
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to build OTLP exporter");
        let provider = SdkTracerProvider::builder()
            .with_batch_exporter(exporter)
            .with_resource(
                Resource::builder()
                    .with_service_name(
                        env::var("OTEL_SERVICE_NAME")
                            .unwrap_or_else(|_| String::from(env!("CARGO_PKG_NAME"))),
                    )
                    .build(),
            )
            .build();
        let tracer = provider.tracer(env!("CARGO_PKG_NAME"));

        let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);

        // Initialize the tracing subscriber with both the OTLP layer and the formatted layer for
        // stdout.
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt_layer)
            .with(otel_layer)
            .init();

        Some(provider)
    } else {
        // Initialize the tracing subscriber with only the formatted layer for stdout.
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt_layer)
            .init();

        None
    }
}
