#[cfg(test)]
mod tests {
    use crate::rcon::{RconClient, RconError, RconRequest, RconRequestType, RconResponseType};
    use serial_test::serial;
    use temp_env::async_with_vars;

    #[tokio::test]
    #[serial(rcon)]
    async fn test_connect_invalid() {
        async_with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("500")),
            ],
            async {
                // Get a new connection
                let connection_result = RconClient::default().get_connection().await;
                assert!(connection_result.is_err());

                let error = connection_result.unwrap_err();
                assert!(matches!(error, RconError::Connection { .. }));
            },
        )
        .await;
    }

    #[tokio::test]
    #[serial(rcon)]
    async fn test_login() {
        let mut connection = RconClient::default().get_connection().await.unwrap();

        let login_result = connection.login().await;
        assert!(login_result.is_ok());

        let is_login_valid = login_result.unwrap();
        assert!(is_login_valid);

        connection.disconnect().await.ok();
    }

    #[tokio::test]
    #[serial(rcon)]
    async fn test_login_wrong_password() {
        async_with_vars([("RCON_PASSWORD", Some("wrong_password"))], async {
            let mut connection = RconClient::default().get_connection().await.unwrap();

            let login_result = connection.login().await;
            assert!(login_result.is_ok());

            let is_login_valid = login_result.unwrap();
            assert!(!is_login_valid);

            connection.disconnect().await.ok();
        })
        .await;
    }

    #[tokio::test]
    #[serial(rcon)]
    async fn test_double_login() {
        let mut connection = RconClient::default().get_connection().await.unwrap();

        let first_login_result = connection.login().await;
        assert!(first_login_result.is_ok());

        let is_first_login_valid = first_login_result.unwrap();
        assert!(is_first_login_valid);

        let second_login_result = connection.login().await;
        assert!(second_login_result.is_ok());

        let is_second_login_valid = second_login_result.unwrap();
        assert!(is_second_login_valid);

        connection.disconnect().await.ok();
    }

    #[tokio::test]
    #[serial(rcon)]
    async fn test_request_with_login() {
        let mut connection = RconClient::default().get_connection().await.unwrap();
        connection.login().await.ok();

        let request = RconRequest::new(RconRequestType::ExecCommand, String::from("help"));
        let response_result = connection.request(&request).await;
        assert!(response_result.is_ok());

        let response = response_result.unwrap();

        // If authentication was successful, the ID assigned by the request.
        // If auth failed, -1.
        //
        // - [RCON Auth Response](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#SERVERDATA_AUTH_RESPONSE)
        assert_eq!(response.response_type, RconResponseType::ResponseValue);
        assert_eq!(response.response_id, request.request_id);

        connection.disconnect().await.ok();
    }

    #[tokio::test]
    #[serial(rcon)]
    async fn test_request_without_login() {
        let mut connection = RconClient::default().get_connection().await.unwrap();

        let request = RconRequest::new(RconRequestType::ExecCommand, String::from("help"));
        let response_result = connection.request(&request).await;
        assert!(response_result.is_ok());

        let response = response_result.unwrap();

        // If authentication was successful, the ID assigned by the request.
        // If auth failed, -1.
        //
        // - [RCON Auth Response](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#SERVERDATA_AUTH_RESPONSE)
        assert_eq!(response.response_type, RconResponseType::AuthResponse);
        assert_eq!(response.response_id, -1);

        connection.disconnect().await.ok();
    }
}
