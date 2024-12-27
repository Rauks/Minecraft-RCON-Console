#[cfg(test)]
mod tests {
    use crate::rcon::request::RconRequestType;
    use test_case::test_case;

    #[test_case(RconRequestType::Command => 2)]
    #[test_case(RconRequestType::Login => 3)]
    fn from_request_type_to_i32(kind: RconRequestType) -> i32 {
        (&kind).into()
    }
}
