use super::RconError;
use log::debug;
use std::env;

/// Default timeout for requests in milliseconds.
#[allow(unused)]
pub const DEFAULT_RCON_TIMEOUT: u64 = 5000;

#[derive(Debug, Clone)]
pub struct RconConfiguration {
    pub host: String,
    pub port: u16,
    pub password: String,
    pub timeout: u64,
}

impl RconConfiguration {
    /// Returns the configuration from environment variables.
    ///
    /// # Returns:
    ///
    /// The configuration.
    pub fn try_new() -> Result<RconConfiguration, RconError> {
        debug!("Attempting to create RCON configuration from environment variables...");

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
                    Ok(DEFAULT_RCON_TIMEOUT)
                } else {
                    value.parse::<u64>()
                }
            })
            .unwrap_or_else(|_| Ok(DEFAULT_RCON_TIMEOUT))
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
}
