use rand::Rng;

#[derive(Debug, Clone)]
pub struct RconRequest {
    pub request_id: i32,
    pub request_type: RconRequestType,
    pub request_payload: String,
}

impl RconRequest {
    /// Create a new RCON request
    ///
    /// # Arguments
    ///
    /// * `request_type` - The type of request to create.
    /// * `request_payload` - The payload of the request.
    ///
    /// # Returns
    ///
    /// A new `RconRequest`.
    pub fn new(request_type: RconRequestType, request_payload: String) -> Self {
        RconRequest {
            request_id: rand::rng().random::<i32>(),
            request_type,
            request_payload,
        }
    }

    /// Convert the RCON request to a byte vector.
    ///
    /// # Returns
    ///
    /// A byte vector representing the RCON request.
    pub fn to_rcon_bytes(&self) -> Vec<u8> {
        let request_id: i32 = self.request_id;
        let request_type: i32 = (&self.request_type).into();
        let request_payload: &[u8] = self.request_payload.as_bytes();

        let request_size: i32 =
            // Request ID size
            4 +
            // Request type size
            4 +
            // Request payload size
            request_payload.len() as i32 +
            // Null terminator for the payload
            1 +
            // Null terminator for the packet
            1;

        let mut bytes: Vec<u8> = vec![];

        // Remember to use little endian
        bytes.extend_from_slice(&request_size.to_le_bytes());
        bytes.extend_from_slice(&request_id.to_le_bytes());
        bytes.extend_from_slice(&request_type.to_le_bytes());
        bytes.extend_from_slice(request_payload);
        bytes.push(0u8);
        bytes.push(0u8);

        bytes
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum RconRequestType {
    ExecCommand,
    Auth,
}

impl From<&RconRequestType> for i32 {
    /// Convert the RCON request type to an integer.
    ///
    /// # Arguments
    ///
    /// * `kind` - The RCON request type to convert.
    ///
    /// # Returns
    ///
    /// An integer representing the RCON request type.
    ///
    /// # Notes
    ///
    /// - [Minecraft types codes](https://minecraft.wiki/w/RCON#Packet_format)
    /// - [RCON packets types](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#Packet_Type)
    fn from(kind: &RconRequestType) -> i32 {
        match kind {
            RconRequestType::ExecCommand => 2,
            RconRequestType::Auth => 3,
        }
    }
}
