#[cfg(test)]
mod tests {
    use crate::rcon::{RconConfiguration, RconError, DEFAULT_RCON_TIMEOUT};
    use serial_test::serial;
    use temp_env::with_vars;

    #[test]
    #[serial(rcon)]
    fn test_get_configuration() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.host, "localhost");
                assert_eq!(configuration.port, 25575);
                assert_eq!(configuration.password, "password");
                assert_eq!(configuration.timeout, DEFAULT_RCON_TIMEOUT);
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_missing_host() {
        with_vars(
            [
                ("RCON_HOST", None),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from("Environment variable 'RCON_HOST' is not set")
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_missing_port() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", None),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from("Environment variable 'RCON_PORT' is not set")
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_invalid_port() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("invalid")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from(
                            "Environment variable 'RCON_PORT' is not a valid number"
                        )
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_missing_password() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", None),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from("Environment variable 'RCON_PASSWORD' is not set")
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_default_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", None),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.timeout, DEFAULT_RCON_TIMEOUT);
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_custom_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("10000")),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.timeout, 10000);
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_invalid_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("invalid")),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_err());

                let error = result.unwrap_err();
                assert_eq!(
                    error,
                    RconError::Configuration {
                        cause: String::from(
                            "Environment variable 'RCON_TIMEOUT' is not a valid number"
                        )
                    }
                );
            },
        );
    }

    #[test]
    #[serial(rcon)]
    fn test_get_configuration_empty_timeout() {
        with_vars(
            [
                ("RCON_HOST", Some("localhost")),
                ("RCON_PORT", Some("25575")),
                ("RCON_PASSWORD", Some("password")),
                ("RCON_TIMEOUT", Some("")),
            ],
            || {
                let result = RconConfiguration::try_new();
                assert!(result.is_ok());

                let configuration = result.unwrap();
                assert_eq!(configuration.timeout, DEFAULT_RCON_TIMEOUT);
            },
        );
    }
}
