#!/bin/sh
set -e

# Install the mkcert dev CA into the system trust store.
# This allows .NET's SslStream to validate TLS certs signed by the dev CA,
# including the cert used by identity-api (which covers container hostnames).
#
# Production containers never have /certs/rootCA.pem mounted — this block
# is a strict no-op in staging and production.
if [ -f /certs/rootCA.pem ]; then
    cp /certs/rootCA.pem /usr/local/share/ca-certificates/mkcert-rootCA.crt
    update-ca-certificates 2>/dev/null || true
fi

exec "$@"
