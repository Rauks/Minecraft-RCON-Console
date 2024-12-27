use std::str::from_utf8;

use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RconResponseError {
    #[error("Failed to decode RCON response: {cause}")]
    Decode { cause: String },
}

#[derive(Debug, Clone)]
pub struct RconResponse {
    pub response_id: i32,
    pub response_type: RconResponseType,
    pub response_payload: String,
}

impl RconResponse {
    /// Attempts to create an `RconResponse` from a byte slice.
    ///
    /// # Arguments
    ///
    /// * `rcon_bytes` - The byte slice to attempt to decode.
    ///
    /// # Returns
    ///
    /// An `RconResponse` if the decoding was successful, otherwise a `RconResponseError`.
    pub fn try_from_rcon_bytes(rcon_bytes: &[u8]) -> Result<Self, RconResponseError> {
        // Remember to use little endian
        let response_size: i32 = i32::from_le_bytes(rcon_bytes[0..4].try_into().map_err(|_| {
            RconResponseError::Decode {
                cause: String::from("Failed to decode response size"),
            }
        })?);

        let response_id: i32 = i32::from_le_bytes(rcon_bytes[4..8].try_into().map_err(|_| {
            RconResponseError::Decode {
                cause: String::from("Failed to decode response id"),
            }
        })?);

        let response_type: RconResponseType =
            i32::from_le_bytes(rcon_bytes[8..12].try_into().map_err(|_| {
                RconResponseError::Decode {
                    cause: String::from("Failed to decode response type"),
                }
            })?)
            .try_into()
            .map_err(|e| RconResponseError::Decode { cause: e })?;

        let last_payload_byte = response_size as usize
            // Null terminator for the packet
            - 1
            // Null terminator for the payload
            - 1;

        let response_payload: String =
            String::from(from_utf8(&rcon_bytes[12..last_payload_byte]).map_err(|_| {
                RconResponseError::Decode {
                    cause: String::from("Failed to decode response payload"),
                }
            })?);

        Ok(RconResponse {
            response_id,
            response_type,
            response_payload,
        })
    }
}

#[derive(Debug, Clone)]
pub enum RconResponseType {
    MultiPacketResponse,
}

impl TryFrom<i32> for RconResponseType {
    type Error = String;

    fn try_from(code: i32) -> Result<RconResponseType, Self::Error> {
        match code {
            0 => Ok(RconResponseType::MultiPacketResponse),
            _ => Err(format!("Unknown RCON response type: {}", code)),
        }
    }
}
