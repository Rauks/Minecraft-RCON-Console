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
            .unwrap_or_else(|_| DEFAULT_TIMEOUT.to_string())
            .parse::<u64>()
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

    async fn send(request: &RconRequest) -> Result<RconResponse, RconError> {
        let bytes = request.to_rcon_bytes();

        if bytes.len() > MAX_REQUEST_SIZE {
            return Err(RconError::Send {
                cause: String::from("Request size exceeds the maximum size"),
            });
        }

        // Connect to the server
        let mut stream = Rcon::connect().await?;

        // Send the request
        stream
            .write_all(&bytes)
            .await
            .map_err(|err| RconError::Send {
                cause: err.to_string(),
            })?;

        // Receive the response
        let mut response_buffer = [0u8; MAX_RESPONSE_SIZE];
        stream
            .read_exact(&mut response_buffer)
            .await
            .map_err(|err| RconError::Receive {
                cause: err.to_string(),
            })?;

        // Close connection
        stream.shutdown().await.map_err(|err| RconError::Shutdown {
            cause: err.to_string(),
        })?;

        let response = RconResponse::try_from_rcon_bytes(&response_buffer).map_err(|err| {
            RconError::Receive {
                cause: err.to_string(),
            }
        })?;

        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use crate::rcon::{
        client::{RconError, DEFAULT_TIMEOUT},
        Rcon, RconRequest, RconRequestType, RconResponseType,
    };
    use serial_test::serial;
    use std::env;
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    #[serial(rcon_environment)]
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
    #[serial(rcon_environment)]
    #[ignore]
    async fn test_connect_invalid() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "25575");
        env::set_var("RCON_PASSWORD", "password");
        env::set_var("RCON_TIMEOUT", "500");

        let result = Rcon::connect().await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert!(matches!(error, RconError::Connection { .. }));
    }

    #[tokio::test]
    #[serial(rcon_environment)]
    #[ignore]
    async fn test_send_login() {
        let password = env::var("RCON_PASSWORD").unwrap();

        let request = RconRequest::new(RconRequestType::Login, password);

        let result = Rcon::send(&request).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.response_id, request.request_id);
        assert!(matches!(
            response.response_type,
            RconResponseType::MultiPacketResponse
        ));
        assert_eq!(response.response_payload, String::from("Login successful"));
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "25575");
        env::set_var("RCON_PASSWORD", "password");
        env::remove_var("RCON_TIMEOUT");

        let result = Rcon::get_configuration();
        assert!(result.is_ok());

        let configuration = result.unwrap();
        assert_eq!(configuration.host, "localhost");
        assert_eq!(configuration.port, 25575);
        assert_eq!(configuration.password, "password");
        assert_eq!(configuration.timeout, DEFAULT_TIMEOUT);
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_missing_host() {
        env::remove_var("RCON_HOST");
        env::set_var("RCON_PORT", "25575");
        env::set_var("RCON_PASSWORD", "password");

        let result = Rcon::get_configuration();
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(
            error,
            RconError::Configuration {
                cause: String::from("Environment variable 'RCON_HOST' is not set")
            }
        );
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_missing_port() {
        env::set_var("RCON_HOST", "localhost");
        env::remove_var("RCON_PORT");
        env::set_var("RCON_PASSWORD", "password");

        let result = Rcon::get_configuration();
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(
            error,
            RconError::Configuration {
                cause: String::from("Environment variable 'RCON_PORT' is not set")
            }
        );
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_invalid_port() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "invalid");
        env::set_var("RCON_PASSWORD", "password");

        let result = Rcon::get_configuration();
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(
            error,
            RconError::Configuration {
                cause: String::from("Environment variable 'RCON_PORT' is not a valid number")
            }
        );
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_missing_password() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "25575");
        env::remove_var("RCON_PASSWORD");

        let result = Rcon::get_configuration();
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(
            error,
            RconError::Configuration {
                cause: String::from("Environment variable 'RCON_PASSWORD' is not set")
            }
        );
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_default_timeout() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "25575");
        env::set_var("RCON_PASSWORD", "password");
        env::remove_var("RCON_TIMEOUT");

        let result = Rcon::get_configuration();
        assert!(result.is_ok());

        let configuration = result.unwrap();
        assert_eq!(configuration.timeout, DEFAULT_TIMEOUT);
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_custom_timeout() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "25575");
        env::set_var("RCON_PASSWORD", "password");
        env::set_var("RCON_TIMEOUT", "10000");

        let result = Rcon::get_configuration();
        assert!(result.is_ok());

        let configuration = result.unwrap();
        assert_eq!(configuration.timeout, 10000);
    }

    #[test]
    #[serial(rcon_environment)]
    fn test_get_configuration_invalid_timeout() {
        env::set_var("RCON_HOST", "localhost");
        env::set_var("RCON_PORT", "25575");
        env::set_var("RCON_PASSWORD", "password");
        env::set_var("RCON_TIMEOUT", "invalid");

        let result = Rcon::get_configuration();
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(
            error,
            RconError::Configuration {
                cause: String::from("Environment variable 'RCON_TIMEOUT' is not a valid number")
            }
        );
    }
}
