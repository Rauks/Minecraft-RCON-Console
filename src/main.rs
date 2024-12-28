mod app;
mod config;
mod rcon;

use app::ui;
use dotenvy::dotenv;
use rcon::RconClient;
use rocket::{launch, routes, Build, Rocket};

#[launch]
/// Sets up a web server using the Rocket framework and mounts routes for serving
/// static files and handling API requests.
///
/// # Returns:
///
/// A `Rocket<Build>` instance.
async fn rocket() -> Rocket<Build> {
    // Load environment
    dotenv().ok();

    // Rcon client
    let rcon = RconClient::default();

    // Prepare the webserver
    let mut rocket = rocket::build()
        .manage(rcon)
        .mount("/api", routes![])
        .mount("/", routes![ui::files]);

    cfg_if::cfg_if! {
        if #[cfg(feature = "metrics")] {
            use rocket_prometheus::PrometheusMetrics;

            // Metrics
            let prometheus = PrometheusMetrics::new();

            // Set the metrics endpoint
            rocket = rocket
                .attach(prometheus.to_owned())
                .mount("/metrics", prometheus);
        }
    }

    cfg_if::cfg_if! {
        if #[cfg(feature = "swagger")] {
            use utoipa::OpenApi;
            use utoipa_swagger_ui::{Config as SwaggerConfig, SwaggerUi};

            // Initialize the OpenAPI
            #[derive(OpenApi)]
            #[openapi(info(title = "Minecraft RCON"), paths(), components(schemas()))]
            struct ApiDoc;

            let mut openapi = ApiDoc::openapi();

            // The `VERSION_SLUG` environment variable should be set by the CI/CD pipeline.
            if let Some(version) = option_env!("VERSION_SLUG") {
                openapi.info.version = version.to_string();
            }

            rocket = rocket
                .mount(
                    "/",
                    SwaggerUi::new("/swagger-ui/<_..>")
                        .url("/api-docs/openapi.json", openapi)
                        .config(
                            SwaggerConfig::default()
                                .use_base_layout()
                                .display_request_duration(true),
                        ),
                )
        }
    }

    rocket
}
