# Minecraft-RCON

Work in progress.

## Features

- `swagger`: Enable the openapi endpoint and the swagger UI (accessible at `/swagger-ui`).
- `metrics`: Enable the prometheus metrics endpoint (accessible at `/metrics`)

## Warnings

* Provided as it is, **this console has no authentication check**, so anybody with access to this console can run any commands on the Minecraft server.

  Please consider setting up a reverse proxy with an authentification layer in front of this console, or any other security measures, in order to restrict the access to the console.

  Please check at least the documentations below:

  * [Awesome list of reverse proxies](https://awesome-selfhosted.net/tags/web-servers.html)
  * [Awesome list of identity management](https://github.com/awesome-foss/awesome-sysadmin?tab=readme-ov-file#identity-management---single-sign-on-sso)

* Use a strong custom random RCON password (change the default `insecure_password` from the examples) for more security.

* Set up your firewall in order to allow only the console to communicate with the Minecraft server through the RCON port set, for more security.
