#[cfg(test)]
mod tests {
    use crate::api::ApiRconResponse;
    use crate::rcon::{RconResponse, RconResponseType};

    #[test]
    fn try_from_rcon_response_to_api_rcon_response() {
        let response_mock = RconResponse {
            response_id: 1,
            response_type: RconResponseType::ResponseValue,
            response_payload: String::from("Herobrine"),
        };

        let response: ApiRconResponse = response_mock.into();

        assert_eq!(response.id, 1);
        assert_eq!(response.payload, "Herobrine");
    }
}
