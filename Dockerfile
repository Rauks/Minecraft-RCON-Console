FROM alpine:3.21.0

# Unprivileged user settings
ENV USER_ID=65535
ENV GROUP_ID=65535
ENV USER_NAME=minecraft-rcon
ENV GROUP_NAME=minecraft-rcon

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

# Environment
ARG VERSION_SLUG
ENV VERSION_SLUG=${VERSION_SLUG}

# Unprivileged user
RUN addgroup \
        -g $GROUP_ID \
        $GROUP_NAME \
    && adduser \
        --shell /sbin/nologin \
        --disabled-password \
        --no-create-home \
        --uid $USER_ID \
        --ingroup $GROUP_NAME \
        $USER_NAME

USER $USER_NAME

WORKDIR /opt
CMD ["./minecraft-rcon"]