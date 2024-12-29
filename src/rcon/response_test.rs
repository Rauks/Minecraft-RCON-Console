#[cfg(test)]
mod tests {
    use crate::rcon::response::RconResponseType;
    use test_case::test_case;

    #[test_case(0 => matches Ok(RconResponseType::ResponseValue); "response_value")]
    #[test_case(2 => matches Ok(RconResponseType::AuthResponse); "auth_response")]
    #[test_case(1 => matches Err(_); "invalid")]
    fn try_from_i32_to_reponse_type(code: i32) -> Result<RconResponseType, String> {
        code.try_into()
    }
}
