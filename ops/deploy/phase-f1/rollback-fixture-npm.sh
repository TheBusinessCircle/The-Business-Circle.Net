#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/bin:/bin
export PATH
exec /usr/bin/node /usr/local/bin/rollback-fixture-npm-command.mjs "$@"
