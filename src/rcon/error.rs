use thiserror::Error;

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
