mod api;
mod app;
mod rcon;

use api::RconManagedState;
use app::ui;
use dotenvy::dotenv;
use rocket::{Build, Rocket, launch, routes};

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
    let rcon = RconManagedState::default();

    // Prepare the webserver
    #[allow(unused_mut)]
    let mut rocket = rocket::build()
        .manage(rcon)
        .mount("/api", routes![api::handle_rcon])
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
            use api::ApiRconResponse;
            use utoipa::OpenApi;
            use utoipa_swagger_ui::{Config as SwaggerConfig, SwaggerUi};

            // Initialize the OpenAPI
            #[derive(OpenApi)]
            #[openapi(
                info(
                    title = "Minecraft RCON"
                ),
                paths(
                    api::handle_rcon,
                ),
                components(
                    schemas(
                        ApiRconResponse,
                    )
                )
            )]
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

#[cfg(test)]
mod tests {
    use rocket::http::Status;
    use rocket::local::asynchronous::Client;
    use serial_test::serial;

    #[tokio::test]
    #[serial(rcon)]
    async fn api_rcon() {
        let rocket = crate::rocket().await;
        let client = Client::tracked(rocket).await.unwrap();

        let response = client.post("/api/rcon").body("help").dispatch().await;

        assert_eq!(response.status(), Status::Ok);
    }
}
