# syntax=docker/dockerfile:1

# hotloop.io, served by nginx on the mothership.
#
# The site is built outside the image (the release workflow runs the build and its audits), then staged:
#
#   npm ci && npm run build
#   VERSION=1.0.0 REVISION=$(git rev-parse HEAD) node scripts/stage-image.mjs dist stage
#   docker build -t hotloop-io-site .          (podman build works the same)
FROM nginxinc/nginx-unprivileged:alpine

LABEL org.opencontainers.image.title="HotLoop website" \
      org.opencontainers.image.description="The hotloop.io website" \
      org.opencontainers.image.vendor="HotLoop" \
      org.opencontainers.image.source="https://github.com/HotLoop-io/HotLoop-io.github.io"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --chmod=755 docker/30-resolver.sh /docker-entrypoint.d/30-resolver.sh
COPY stage/redirects.conf /etc/nginx/conf.d/00-redirects.conf
COPY stage/site /usr/share/nginx/html

# A config nginx would refuse fails the build here instead of the rollout.
RUN printf 'resolver 127.0.0.1;\n' > /tmp/resolver.conf && nginx -t && rm -f /tmp/resolver.conf

# nginx-unprivileged already runs as uid 101 (nginx).
EXPOSE 3000
