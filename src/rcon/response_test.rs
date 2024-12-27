#[cfg(test)]
mod tests {
    use crate::rcon::response::RconResponseType;
    use test_case::test_case;

    #[test_case(0 => matches Ok(RconResponseType::MultiPacketResponse))]
    #[test_case(2 => matches Err(_))]
    fn try_from_i32_to_reponse_type(code: i32) -> Result<RconResponseType, String> {
        code.try_into()
    }
}
