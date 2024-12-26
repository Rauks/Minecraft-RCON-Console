#[cfg(test)]
mod tests {

    use crate::config::Configuration;
    use rocket::serde::json::Value;

    #[tokio::test]
    async fn read_configuration_valid() {
        assert!(Configuration::read_configuration::<Value>("commands.json")
            .await
            .is_some())
    }

    #[tokio::test]
    async fn read_configuration_invalid() {
        assert!(Configuration::read_configuration::<Value>("indalid")
            .await
            .is_none())
    }
}
