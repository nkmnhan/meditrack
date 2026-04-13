#!/bin/sh
set -e

# Install the mkcert dev CA into the system trust store so .NET's SslStream
# trusts TLS certs signed by the dev CA (identity-api, patient-api, etc.).
#
# Accepts both filenames:
#   rootCA.pem  — output of setup-certs.cmd (canonical name going forward)
#   ca.crt      — legacy name that may exist from earlier manual cert generation
#
# Production containers never mount /certs — this block is a strict no-op.
CA_FILE=""
if   [ -f /certs/rootCA.pem ]; then CA_FILE=/certs/rootCA.pem
elif [ -f /certs/ca.crt ];     then CA_FILE=/certs/ca.crt
fi

if [ -n "$CA_FILE" ]; then
    cp "$CA_FILE" /usr/local/share/ca-certificates/mkcert-rootCA.crt
    update-ca-certificates 2>/dev/null || true
fi

exec "$@"
