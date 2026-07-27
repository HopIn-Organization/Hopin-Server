# Deployment

Production runs on the Colman CS machine (`hopIn.cs.colman.ac.il`, external IP
`193.106.55.82`). SSH to that machine is reachable only over the college's
SSL VPN, which GitHub-hosted Actions runners cannot join. Rather than
GitHub SSHing in to deploy, deploys are done **from the machine itself**:
you (or a cron/systemd timer running as `cs107`) `git pull` and run
[`deploy/deploy.sh`](deploy/deploy.sh) locally on the box. No self-hosted
GitHub Actions runner, no inbound port changes required.

This doc covers one-time server setup. It's shared infrastructure for both
`Hopin-Server` and `HopIn-Client` — see [`HopIn-Client/DEPLOYMENT.md`](../HopIn-Client/DEPLOYMENT.md)
for the client-specific pieces once this is done.

## 0. Before anything else: rotate the shared credentials

The SSH password, Postgres password, and Mongo password for this machine
were sent in plaintext over email by IT. Once you can log in, change the
`cs107` account password and the Postgres `postgres` password, and store the
new ones in a password manager (not in git, not in chat/email history).

## 1. Connect to the machine

1. Set up the SSL VPN per IT's guide (link was in their email, per-OS).
2. `ssh cs107@10.10.248.82`

## 2. One-time host prep

```bash
# Let you use docker without sudo
sudo usermod -aG docker cs107
# log out/in (or `newgrp docker`) for the group change to take effect

# Directory nginx will serve the client SPA from
sudo mkdir -p /var/www/hopin-client
sudo chown cs107:cs107 /var/www/hopin-client

# Clone both repos side by side
mkdir -p ~/hopin && cd ~/hopin
git clone https://github.com/HopIn-Organization/Hopin-Server.git
git clone https://github.com/HopIn-Organization/HopIn-Client.git
```

The cert/key in `/etc/ssl/cs` are `CSB.crt` and `myserver.key` (already
wired up in `deploy/nginx.conf`). Worth checking `CSB.crt` includes the full
chain, not just the leaf cert — if browsers warn about an incomplete chain
after enabling this, the intermediate CA cert needs to be concatenated onto
`CSB.crt`:

```bash
openssl x509 -in /etc/ssl/cs/CSB.crt -noout -text | grep -A2 "Issuer:"
openssl crl2pkcs7 -nocrl -certfile /etc/ssl/cs/CSB.crt | openssl pkcs7 -print_certs -noout
# second command should list 2+ certs (leaf + intermediate) if the chain is complete
```

Install the nginx site config. This box's nginx is the official nginx.org
package, which uses `/etc/nginx/conf.d/*.conf` (included directly from
`nginx.conf`) rather than Debian's `sites-available`/`sites-enabled`
convention — confirm with `grep include /etc/nginx/nginx.conf` if unsure:

```bash
sudo rm -f /etc/nginx/conf.d/default.conf   # stock placeholder, conflicts with our server_name
sudo cp ~/hopin/Hopin-Server/deploy/nginx.conf /etc/nginx/conf.d/hopin.conf
sudo nginx -t && sudo systemctl reload nginx
```

Verify it actually took effect — this should show `hopIn.cs.colman.ac.il`,
not `localhost`:

```bash
sudo nginx -T | grep -A3 "server_name"
```

Confirm DNS: `hopIn.cs.colman.ac.il` should resolve to `193.106.55.82`. If
it doesn't yet, that's on IT/DNS, not this repo.

Postgres is already installed and running on this host per IT (port 5432,
user `postgres`). The app connects with that same `postgres` superuser
(simpler than a dedicated role — fine for a single-team project machine;
just means the app has full instance privileges, not scoped to its own DB).
Still need a database for it though:

```bash
sudo -u postgres psql -c "CREATE DATABASE hopin_prod;"
```

### MinIO (document storage)

The app talks to S3 through a generic `S3Client` pointed at `S3_ENDPOINT`
(see `src/document/s3.service.ts`), so it works against either real AWS S3
or a self-hosted MinIO — dev already uses MinIO. Unless you specifically
want to pay for AWS S3, run MinIO on the same host as a long-lived
container (this is infrastructure, not part of the app deploy, so it's set
up once here rather than by `deploy.sh`):

```bash
docker volume create minio_data
docker run -d \
  --name minio \
  --network host \
  --restart unless-stopped \
  -v minio_data:/data \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Same `minioadmin`/`minioadmin` creds as dev — fine here since `--network
host` means MinIO is only reachable at `localhost:9000` (from the
`hopin-server` container, same trick as Postgres) and is **not** exposed to
the internet: ports 9000/9001 aren't in IT's list of externally-reachable
ports, so nothing further to lock down. The app auto-creates its bucket on
boot (`S3Service.ensureBucketExists()`), so you don't need to click through
the MinIO console — just make sure `.env` (below) has
`S3_ENDPOINT=http://localhost:9000`, `S3_FORCE_PATH_STYLE=true`, and
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set to `minioadmin`/`minioadmin`
(the SDK reuses the AWS env var names even though this isn't AWS).

If you'd rather use real AWS S3 instead, skip this and put real AWS
credentials + a blank/omitted `S3_ENDPOINT` in `.env` instead.

## 3. Create the production `.env`

There's no CI system injecting secrets anymore — `.env` lives directly on
the machine, next to the code, and is never committed (it's already
gitignored). Copy `.env.example` to `.env` in `~/hopin/Hopin-Server` and
fill in real values (SFTP the file up, or `nano .env` directly over SSH —
either way, over the VPN, never over plain email/chat):

| Variable                                      | Production value                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                        | `3000`                                                                                                                       |
| `DB_HOST`                                     | `localhost`                                                                                                                  |
| `DB_PORT`                                     | `5432`                                                                                                                       |
| `DB_USERNAME`                                 | `postgres`                                                                                                                   |
| `DB_PASSWORD`                                 | the (rotated) postgres password                                                                                              |
| `DB_NAME`                                     | `hopin_prod`                                                                                                                 |
| `DB_SYNCHRONIZE`                              | `false` (use migrations in prod, not auto-sync)                                                                              |
| `DB_LOGGING`                                  | `false`                                                                                                                      |
| `JWT_ACCESS_SECRET`                           | generate fresh — don't reuse the dev value                                                                                   |
| `JWT_REFRESH_SECRET`                          | generate fresh — don't reuse the dev value                                                                                   |
| `JWT_ACCESS_EXPIRES_IN`                       | `15m`                                                                                                                        |
| `JWT_REFRESH_EXPIRES_IN`                      | `7d`                                                                                                                         |
| `REFRESH_TOKEN_TTL_DAYS`                      | `7`                                                                                                                          |
| `LANGFUSE_HOST`                               | `https://api.langfuse.com`                                                                                                   |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | your prod Langfuse keys (a separate prod project vs. dev is a good idea)                                                     |
| `LANGFUSE_ENABLED`                            | `true`                                                                                                                       |
| `AWS_REGION`                                  | `us-east-1` (MinIO ignores it, SDK requires one set)                                                                         |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `minioadmin` / `minioadmin` (or your MinIO root creds, if changed)                                                           |
| `S3_BUCKET_NAME`                              | `hopin-project-documents`                                                                                                    |
| `S3_ENDPOINT`                                 | `http://localhost:9000`                                                                                                      |
| `S3_FORCE_PATH_STYLE`                         | `true`                                                                                                                       |
| `GEMINI_API_KEY`                              | your Gemini API key                                                                                                          |
| `PINECONE_API_KEY` / `PINECONE_INDEX_NAME`    | your Pinecone key/index                                                                                                      |
| `GITHUB_APP_ID` / `GITHUB_APP_SLUG`           | your GitHub App's ID/slug                                                                                                    |
| `GITHUB_APP_PRIVATE_KEY`                      | your GitHub App's private key (`.pem` contents, newlines escaped as `\n`)                                                    |
| `GITHUB_WEBHOOK_SECRET`                       | your GitHub App's webhook secret                                                                                             |
| `GITHUB_APP_CALLBACK_URL`                     | `https://hopIn.cs.colman.ac.il/api/github/callback` (must exactly match the Setup URL configured in the GitHub App settings) |
| `CLIENT_ORIGIN`                               | `https://hopIn.cs.colman.ac.il`                                                                                              |

`deploy/deploy.sh` refuses to run if this file is missing, and never
overwrites it — pulling new code never touches your secrets.

## 4. Deploying

```bash
cd ~/hopin/Hopin-Server
./deploy/deploy.sh
```

This pulls `main`, installs deps, lints, builds, runs TypeORM migrations
against the native Postgres, builds a Docker image, and replaces the
running `hopin-server` container (`--network host`, so it talks to Postgres
over `localhost:5432` and nginx reaches it over `localhost:3000`). It
health-checks `/health` after starting and automatically rolls back to the
previous image tag if the health check fails.

Run it by hand over SSH whenever you want to ship, or automate it with a
cron/systemd timer, e.g. every 5 minutes:

```
*/5 * * * * cd /home/cs107/hopin/Hopin-Server && ./deploy/deploy.sh >> /home/cs107/hopin/deploy.log 2>&1
```

(`deploy.sh` is idempotent-ish but not a no-op — if you want it to skip
entirely when there's nothing new, guard it with a `git fetch` + compare
against `HEAD` before running.)

Pull requests still run [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
on a normal GitHub-hosted runner against a throwaway Postgres service
container — it never touches the production machine.

### Manual rollback

```bash
docker stop hopin-server && docker rm hopin-server
docker run -d --name hopin-server --network host --env-file .env --restart unless-stopped hopin-server:previous
```
