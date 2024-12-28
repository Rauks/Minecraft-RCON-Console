FROM debian:stable-slim

ENV DEBIAN_FRONTEND=noninteractive

# Minecraft RCON Environment
ENV RCON_HOST=localhost
ENV RCON_PORT=25575
ENV RCON_PASSWORD=insecure_secret
ENV ROOT_CONFIG=/opt/config
ENV ROOT_WWW=/opt/www

# Rocket Environment (https://rocket.rs/guide/v0.5/configuration/#environment-variables)
ENV ROCKET_ADDRESS=0.0.0.0
ENV ROCKET_PORT=8888
ENV ROCKET_LIMITS={json="1 MiB"}

# Rust API
COPY /config /opt/config
COPY /target/release /opt
RUN chmod +x /opt/minecraft-rcon

# Angluar UI
COPY /ui/dist/browser /opt/www

# Environment
ARG VERSION_SLUG
ENV VERSION_SLUG=${VERSION_SLUG}

# Unprivileged user
RUN adduser \
        --uid 2300 \
        --no-create-home \
        --home /opt \
        --disabled-login \
        --shell /sbin/nologin \
        minecraft-rcon \
    && chown -R minecraft-rcon:minecraft-rcon /opt

USER minecraft-rcon

WORKDIR /opt
CMD ["./minecraft-rcon"]