# The historical Community images are no longer publicly pullable. Build the
# exact public release instead of depending on an unversioned third-party image.
FROM golang:1.24.3-bookworm AS build
ARG MINIO_RELEASE=RELEASE.2025-04-22T22-12-26Z
RUN git clone --depth 1 --branch ${MINIO_RELEASE} https://github.com/minio/minio.git /source
WORKDIR /source
RUN CGO_ENABLED=0 go build -p 2 -trimpath -o /out/minio .

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /source/LICENSE /usr/share/licenses/minio/LICENSE
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
