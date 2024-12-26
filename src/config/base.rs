use rocket::{
    self,
    serde::{json::serde_json, DeserializeOwned},
};
use std::{env, path::PathBuf};
use tokio::fs::read_to_string;

#[derive(Default)]
pub struct Configuration {}

impl Configuration {
    /// Returns the root path for configuration files, either from the environment variable `ROOT_CONFIG`
    /// or a default value of "./config".
    ///
    /// # Returns:
    ///
    /// The root path for configuration files.
    fn get_root_path() -> PathBuf {
        PathBuf::from(env::var("ROOT_CONFIG").unwrap_or_else(|_| String::from("./config")))
    }

    /// Reads a configuration file and deserializes its contents into a specified type, returning
    /// an `Option` containing the deserialized result.
    ///
    /// # Arguments:
    ///
    /// * `file_name` - The name of the configuration file to read.
    ///
    /// # Returns:
    ///
    /// An `Option` containing the deserialized result.
    pub async fn read_configuration<T>(file_name: &str) -> Option<T>
    where
        T: DeserializeOwned,
    {
        let config_path: PathBuf = Configuration::get_root_path().join(file_name);

        if let Ok(raw_config) = read_to_string(config_path).await {
            if let Ok(result) = serde_json::from_str(raw_config.as_str()) {
                Some(result)
            } else {
                None
            }
        } else {
            None
        }
    }
}
