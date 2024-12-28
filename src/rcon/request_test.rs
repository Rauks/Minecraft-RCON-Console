#[cfg(test)]
mod tests {
    use crate::rcon::request::RconRequestType;
    use test_case::test_case;

    #[test_case(RconRequestType::ExecCommand => 2; "exec_command")]
    #[test_case(RconRequestType::Auth => 3; "auth")]
    fn from_request_type_to_i32(kind: RconRequestType) -> i32 {
        (&kind).into()
    }
}
