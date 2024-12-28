use super::{RconRequest, RconResponse};
use std::env;
use thiserror::Error;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
};

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RconError {
    #[error("Invalid RCON configuration: {cause}")]
    Configuration { cause: String },
    #[error("Failed to connect to the RCON server: {cause}")]
    Connection { cause: String },
    #[error("Failed to send data to the RCON server: {cause}")]
    Send { cause: String },
    #[error("Failed to receive data from the RCON server: {cause}")]
    Receive { cause: String },
    #[error("Failed to shutdown the RCON connection: {cause}")]
    Shutdown { cause: String },
}

#[derive(Debug, Clone)]
pub struct RconConfiguration {
    pub host: String,
    pub port: u16,
    pub password: String,
    pub timeout: u64,
}

/// Default timeout for requests in milliseconds.
const DEFAULT_TIMEOUT: u64 = 5000;

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
const MAX_REQUEST_SIZE: usize = 1460;

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
const MAX_RESPONSE_SIZE: usize = 4110;

#[derive(Default)]
pub struct Rcon {}

impl Rcon {
    /// Returns the configuration from environment variables.
    ///
    /// # Returns:
    ///
    /// The configuration.
    fn get_configuration() -> Result<RconConfiguration, RconError> {
        let host = env::var("RCON_HOST").map_err(|_| RconError::Configuration {
            cause: String::from("Environment variable 'RCON_HOST' is not set"),
        })?;
        let port = env::var("RCON_PORT")
            .map_err(|_| RconError::Configuration {
                cause: String::from("Environment variable 'RCON_PORT' is not set"),
            })?
            .parse::<u16>()
            .map_err(|_| RconError::Configuration {
                cause: String::from("Environment variable 'RCON_PORT' is not a valid number"),
            })?;
        let password = env::var("RCON_PASSWORD").map_err(|_| RconError::Configuration {
            cause: String::from("Environment variable 'RCON_PASSWORD' is not set"),
        })?;
        let timeout = env::var("RCON_TIMEOUT")
            .map(|value| {
                if value.is_empty() {
                    Ok(DEFAULT_TIMEOUT)
                } else {
                    value.parse::<u64>()
                }
            })
            .unwrap_or_else(|_| Ok(DEFAULT_TIMEOUT))
            .map_err(|_| RconError::Configuration {
                cause: String::from("Environment variable 'RCON_TIMEOUT' is not a valid number"),
            })?;

        Ok(RconConfiguration {
            host,
            port,
            password,
            timeout,
        })
    }

    async fn request(request: &RconRequest) -> Result<RconResponse, RconError> {
        // Connect to the server
        let mut stream = Rcon::connect().await?;

        // Send the request
        Rcon::send(request, &mut stream).await?;

        // Receive the response
        let response = Rcon::receive(&mut stream).await?;

        // Close connection
        Rcon::shutdown(stream).await?;

        Ok(response)
    }

    /// Connects to the server.
    ///
    /// # Returns:
    ///
    /// A connected `TcpStream` instance.
    async fn connect() -> Result<TcpStream, RconError> {
        let configuration = Rcon::get_configuration()?;

        TcpStream::connect(format!("{}:{}", configuration.host, configuration.port))
            .await
            .map_err(|err| RconError::Connection {
                cause: err.to_string(),
            })
    }

    /// Sends a request to the server.
    ///
    /// # Arguments
    ///
    /// * `request` - The request to send.
    /// * `stream` - The stream to send the request to.
    ///
    /// # Returns
    ///
    /// A result indicating the success of the operation.
    async fn send(request: &RconRequest, stream: &mut TcpStream) -> Result<(), RconError> {
        println!("{:?}", request);

        let bytes = request.to_rcon_bytes();

        println!("{:?}", bytes);

        if bytes.len() > MAX_REQUEST_SIZE {
            return Err(RconError::Send {
                cause: String::from("Request size exceeds the maximum size"),
            });
        }

        stream
            .write_all(&bytes)
            .await
            .map_err(|err| RconError::Send {
                cause: err.to_string(),
            })?;

        stream.flush().await.map_err(|err| RconError::Send {
            cause: err.to_string(),
        })
    }

    /// Receives a response from the server.
    ///
    /// # Arguments
    ///
    /// * `stream` - The stream to receive the response from.
    ///
    /// # Returns
    ///
    /// The response from the server.
    async fn receive(stream: &mut TcpStream) -> Result<RconResponse, RconError> {
        let mut response_buffer = [0u8; MAX_RESPONSE_SIZE];

        stream
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

    /// Shuts down the connection to the server.
    ///
    /// # Arguments
    ///
    /// * `stream` - The stream to shut down.
    ///
    /// # Returns
    ///
    /// A result indicating the success of the operation.
    async fn shutdown(mut stream: TcpStream) -> Result<(), RconError> {
        stream.shutdown().await.map_err(|err| RconError::Shutdown {
            cause: err.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::rcon::{
        client::{RconError, DEFAULT_TIMEOUT},
        Rcon, RconRequest, RconRequestType, RconResponseType,
    };
    use serial_test::serial;
    use temp_env::{async_with_vars, with_vars};
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    #[serial(rcon)]
    #[ignore]
    async fn test_connect() {
        let result = Rcon::connect().await;
        assert!(result.is_ok());

        let mut stream = result.unwrap();
        assert!(stream.peer_addr().is_ok());

        // Close the stream
        stream.shutdown().await.ok();
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
                let result = Rcon::connect().await;
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert!(matches!(error, RconError::Connection { .. }));
            },
        )
        .await;
    }

    #[tokio::test]
    #[serial(rcon)]
    #[ignore]
    async fn test_request_login() {
        let configuration = Rcon::get_configuration().unwrap();
        let request = RconRequest::new(RconRequestType::Auth, configuration.password);

        let result = Rcon::request(&request).await;

        assert!(result.is_ok());

        let response = result.unwrap();

        assert!(matches!(
            response.response_type,
            RconResponseType::AuthResponse
        ));
        assert!(response.response_payload.is_empty());

        // If authentication was successful, the ID assigned by the request.
        // If auth failed, -1.
        assert_eq!(response.response_id, request.request_id);
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.host, "localhost");
                assert_eq!(configuration.port, 25575);
                assert_eq!(configuration.password, "password");
                assert_eq!(configuration.timeout, DEFAULT_TIMEOUT);
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_missing_host() {
        with_vars(
            [
                ("RCON_HOST", None),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from("Environment variable 'RCON_HOST' is not set")
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_missing_port() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", None),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from("Environment variable 'RCON_PORT' is not set")
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_invalid_port() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("invalid")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from(
                            "Environment variable 'RCON_PORT' is not a valid number"
                        )
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_missing_password() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", None),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from("Environment variable 'RCON_PASSWORD' is not set")
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_default_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.timeout, DEFAULT_TIMEOUT);
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_custom_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("10000")),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.timeout, 10000);
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_invalid_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("invalid")),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from(
                            "Environment variable 'RCON_TIMEOUT' is not a valid number"
                        )
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_empty_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("")),
            ],
            || {
                let result = Rcon::get_configuration();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.timeout, DEFAULT_TIMEOUT);
            },
        );
    }
}
