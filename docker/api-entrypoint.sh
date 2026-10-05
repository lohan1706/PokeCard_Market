#!/bin/sh
set -eu
cd /repo/apps/api
./node_modules/.bin/prisma migrate deploy
exec "$@"
