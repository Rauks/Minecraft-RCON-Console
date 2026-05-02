mod request_span;
mod request_tracing_guard;

pub use request_span::*;

cfg_if::cfg_if! {
    if #[cfg(feature = "opentelemetry")] {
        mod init;
        mod request_tracing_fairing;

        pub use request_tracing_fairing::*;

        #[allow(unused)]
        pub use init::*;
    }
}
