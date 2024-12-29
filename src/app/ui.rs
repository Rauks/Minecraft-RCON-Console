use rocket::{self, fs::NamedFile, get};
use std::{env, path::PathBuf, sync::OnceLock};

#[get("/<path..>")]
/// Serve the files from the `ROOT_WWW` directory.
///
/// # Arguments
///
/// * `path` - The path to the file to serve.
///
/// # Returns
///
/// The file to serve.
///
/// # Notes
///
/// If the file is not found, the `index.html` file is served.
pub async fn files(path: PathBuf) -> Option<NamedFile> {
    static ROOT_WWW: OnceLock<PathBuf> = OnceLock::new();

    let root_www = ROOT_WWW.get_or_init(|| {
        PathBuf::from(env::var("ROOT_WWW").unwrap_or_else(|_| String::from("./ui/dist/browser")))
    });

    let mut path = root_www.join(path);
    if path.is_dir() {
        path.push("index.html");
    }

    match NamedFile::open(path).await {
        Ok(named_file) => Some(named_file),
        Err(_) => NamedFile::open(root_www.join("index.html")).await.ok(),
    }
}
