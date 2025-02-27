use crate::rcon::{RconClient, RconRequest, RconRequestType, RconResponse, RconResponseType};
use rocket::{State, http::Status, post, serde::json::Json};
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use utoipa::ToSchema;

#[derive(Default, Clone)]
pub struct RconManagedState {
    pub client: Arc<Mutex<RconClient>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ApiRconResponse {
    pub id: i32,
    pub payload: String,
}

impl From<RconResponse> for ApiRconResponse {
    fn from(response: RconResponse) -> Self {
        ApiRconResponse {
            id: response.response_id,
            payload: response.response_payload,
        }
    }
}

/// Execute a command on the RCON server and return the response.
///
/// The command is sent to the RCON server and the response is returned.
#[utoipa::path(
    tag = "rcon",
    context_path = "/api", 
    request_body(
        description = "The command to execute on the RCON server",
        content(
            ("text/plain"),
        ),
        example = "help"
    ),
    responses(
        (status = 200, description = "Successful response", description = "Successful response", body = ApiRconResponse),
        (status = 500, description = "Internal error"),
        (status = 502, description = "Unable to connect to the RCON server"),
        (status = 503, description = "The RCON server did not respond as expected"),
        (status = 511, description = "The RCON login failed"),
    )
)]
#[post("/rcon", data = "<rcon_command>")]
pub async fn handle_rcon(
    rcon_state: &State<RconManagedState>,
    rcon_command: String,
) -> Result<Json<ApiRconResponse>, Status> {
    let rcon_client = rcon_state.client.lock().await;

    // Get a new connection
    let mut connection = rcon_client
        .get_connection()
        .await
        .map_err(|_| Status::BadGateway)?;

    let request = RconRequest::new(RconRequestType::ExecCommand, rcon_command);

    // Wrap all calls in a closure to ensure the connection is disconnected regardless of the result.
    let response = {
        connection
            .login()
            .await
            .map(|login_result| {
                if !login_result {
                    // The login is unsuccessful.
                    Err(Status::NetworkAuthenticationRequired)
                } else {
                    Ok(())
                }
            })
            .map_err(|_| Status::ServiceUnavailable)??;

        let response = connection
            .request(&request)
            .await
            .map(|response| {
                if response.response_type == RconResponseType::AuthResponse {
                    // This would happen only if the auth changes between the login and the command.
                    Err(Status::NetworkAuthenticationRequired)
                } else {
                    Ok(response)
                }
            })
            .map_err(|_| Status::ServiceUnavailable)??;

        Ok(response)
    };

    // Disconnect
    connection
        .disconnect()
        .await
        .map_err(|_| Status::InternalServerError)?;

    // Drop the lock faster
    drop(rcon_client);

    // Return the response
    response.map(|response| Json(response.into()))
}
