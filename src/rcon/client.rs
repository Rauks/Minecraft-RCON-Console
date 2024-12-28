use super::{RconConfiguration, RconError, RconRequest, RconResponse};
use std::env;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
};

/// Maximum packet size for sending data.
///
/// # Note:
///
/// The maximum length of the payload is 1446 bytes.
/// The message lenght is 4 bytes.
/// The request ID is 4 bytes.
/// The request type is 4 bytes.
/// The null terminator for the payload is 1 byte.
/// The null terminator for the packet is 1 byte.
///
/// Total: 1446 + 4 + 4 + 4 + 1 + 1 = 1460
///
/// - [Fragmentation](https://minecraft.wiki/w/RCON#Fragmentation)
/// - [Packet format](https://minecraft.wiki/w/RCON#Packet_format)
const MAX_RCON_REQUEST_SIZE: usize = 1460;

/// Maximum packet size for receiving data.
///     
/// # Note:
///
/// The maximum length of the payload is 4096 bytes.
/// The message lenght is 4 bytes.
/// The request ID is 4 bytes.
/// The request type is 4 bytes.
/// The null terminator for the payload is 1 byte.
/// The null terminator for the packet is 1 byte.
///
/// Total: 4096 + 4 + 4 + 4 + 1 + 1 = 4110
///
/// - [Fragmentation](https://minecraft.wiki/w/RCON#Fragmentation)
/// - [Packet format](https://minecraft.wiki/w/RCON#Packet_format)
const MAX_RCON_RESPONSE_SIZE: usize = 4110;

#[derive(Default, Debug)]
pub struct RconClient {}

impl RconClient {
    /// Connects to the server.
    ///
    /// # Returns:
    ///
    /// A connected `TcpStream` instance.
    pub async fn get_connection(&self) -> Result<ConnectedRconClient, RconError> {
        let configuration = RconConfiguration::try_new()?;

        let stream = TcpStream::connect(format!("{}:{}", configuration.host, configuration.port))
            .await
            .map_err(|err| RconError::Connection {
                cause: err.to_string(),
            })?;

        Ok(ConnectedRconClient { stream })
    }
}

#[derive(Debug)]
pub struct ConnectedRconClient {
    stream: TcpStream,
}

impl ConnectedRconClient {
    /// Sends a request to the server and receives a response.
    ///
    /// # Parameters
    ///
    /// - `request`: The request to send to the server.
    ///
    /// # Returns
    ///
    /// The response from the server.
    pub async fn request(&mut self, request: &RconRequest) -> Result<RconResponse, RconError> {
        // Send the request
        self.send(request).await?;

        // Receive the response
        let response = self.receive().await?;

        Ok(response)
    }

    /// Closes the connection to the server.
    ///
    /// # Returns
    ///
    /// A result indicating the success of the operation.
    pub async fn disconnect(&mut self) -> Result<(), RconError> {
        self.stream
            .shutdown()
            .await
            .map_err(|err| RconError::Shutdown {
                cause: err.to_string(),
            })
    }

    /// Sends a request to the server.
    ///
    /// # Parameters
    ///
    /// - `request`: The request to send to the server.
    ///
    /// # Returns
    ///
    /// A result indicating the success of the operation.
    async fn send(&mut self, request: &RconRequest) -> Result<(), RconError> {
        println!("{:?}", request);

        let bytes = request.to_rcon_bytes();

        println!("{:?}", bytes);

        if bytes.len() > MAX_RCON_REQUEST_SIZE {
            return Err(RconError::Send {
                cause: String::from("Request size exceeds the maximum size"),
            });
        }

        self.stream
            .write_all(&bytes)
            .await
            .map_err(|err| RconError::Send {
                cause: err.to_string(),
            })?;

        self.stream.flush().await.map_err(|err| RconError::Send {
            cause: err.to_string(),
        })
    }

    /// Receives a response from the server.
    ///
    /// # Returns
    ///
    /// The response from the server.
    async fn receive(&mut self) -> Result<RconResponse, RconError> {
        let mut response_buffer = [0u8; MAX_RCON_RESPONSE_SIZE];

        self.stream
            .read(&mut response_buffer)
            .await
            .map_err(|err| RconError::Receive {
                cause: err.to_string(),
            })?;

        println!("{:?}", response_buffer);

        let response = RconResponse::try_from_rcon_bytes(&response_buffer).map_err(|err| {
            RconError::Receive {
                cause: err.to_string(),
            }
        })?;

        println!("{:?}", response);

        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use crate::rcon::{
        RconClient, RconConfiguration, RconError, RconRequest, RconRequestType, RconResponseType,
    };
    use serial_test::serial;
    use temp_env::async_with_vars;

    #[tokio::test]
    #[serial(rcon)]
    #[ignore]
    async fn test_connect() {
        // Get a new connection
        let connection_result = RconClient::default().get_connection().await;
        assert!(connection_result.is_ok());

        // Ensure the client is connected
        let mut connection = connection_result.unwrap();
        assert!(connection.stream.peer_addr().is_ok());

        // Disconnect the client
        let result = connection.disconnect().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[serial(rcon)]
    #[ignore]
    async fn test_connect_invalid() {
        async_with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("500")),
            ],
            async {
                // Get a new connection
                let connection_result = RconClient::default().get_connection().await;
                assert!(connection_result.is_err());

                let error = connection_result.unwrap_err();
                assert!(matches!(error, RconError::Connection { .. }));
            },
        )
        .await;
    }

    #[tokio::test]
    #[serial(rcon)]
    #[ignore]
    async fn test_request_login() {
        let mut connection = RconClient::default().get_connection().await.unwrap();
        let configuration = RconConfiguration::try_new().unwrap();
        let request = RconRequest::new(RconRequestType::Auth, configuration.password);

        let request_result = connection.request(&request).await;
        assert!(request_result.is_ok());

        connection.disconnect().await.ok();

        let response = request_result.unwrap();

        assert!(matches!(
            response.response_type,
            RconResponseType::AuthResponse
        ));
        assert!(response.response_payload.is_empty());

        // If authentication was successful, the ID assigned by the request.
        // If auth failed, -1.
        assert_eq!(response.response_id, request.request_id);
    }
}
