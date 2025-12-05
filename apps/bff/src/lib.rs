use worker::*;

mod cache;
mod error;
mod handlers;
mod middleware;
mod models;
mod router;
mod seo;
mod services;

pub use error::BffError;

#[event(fetch)]
async fn fetch(req: Request, env: Env, ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    router::handle_request(req, env, ctx).await
}
