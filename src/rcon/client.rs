use std::env;
use thiserror::Error;
use tokio::net::TcpStream;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RconError {
    #[error("Invalid RCON configuration: {cause}")]
    Configuration { cause: String },
    #[error("Failed to connect to the RCON server {cause}")]
    Connection { cause: String },
}

#[derive(Debug, Clone)]
pub struct RconConfiguration {
    pub host: String,
    pub port: u16,
    pub password: String,
    pub timeout: u64,
}

static DEFAULT_TIMEOUT: u64 = 5000;

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
}

#[cfg(test)]
mod tests {
    use crate::rcon::{
        client::{RconError, DEFAULT_TIMEOUT},
        Rcon,
    };
    use serial_test::serial;
    use std::env;

    #[tokio::test]
    #[serial(rcon_environment)]
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
    async fn test_connect() {
        let result = Rcon::connect().await;
        assert!(result.is_ok());
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
