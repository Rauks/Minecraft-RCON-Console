use super::RequestSpan;
use rocket::Request;
use rocket::request::{FromRequest, Outcome};

#[rocket::async_trait]
impl<'r> FromRequest<'r> for &'r RequestSpan {
    type Error = ();

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        Outcome::Success(
            // Attempt to retrieve the `RequestSpan` from the request-local cache. If it doesn't
            // exist, create a new span indicating a missing request span.
            request.local_cache(|| RequestSpan::new(request)),
        )
    }
}
