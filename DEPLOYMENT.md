# Deployment

Production runs on the Colman CS machine (`hopIn.cs.colman.ac.il`, external IP
`193.106.55.82`). SSH to that machine is reachable only over the college's
SSL VPN, which GitHub-hosted Actions runners cannot join. So instead of
GitHub SSHing in to deploy, a **self-hosted GitHub Actions runner lives on
the machine itself** and pulls jobs from GitHub over outbound port 443
(already allowed by the firewall). No inbound port changes are required.

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
# Let the runner (and you) use docker without sudo
sudo usermod -aG docker cs107
# log out/in (or `newgrp docker`) for the group change to take effect

# Directory nginx will serve the client SPA from
sudo mkdir -p /var/www/hopin-client
sudo chown cs107:cs107 /var/www/hopin-client
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

Install the nginx site config (from this repo, after first checkout/clone,
or scp it over):

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hopin
sudo ln -s /etc/nginx/sites-available/hopin /etc/nginx/sites-enabled/hopin
sudo rm -f /etc/nginx/sites-enabled/default   # if present, avoid a conflicting default_server
sudo nginx -t && sudo systemctl reload nginx
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
up once here rather than by the GitHub Actions workflow):

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
the MinIO console — just make sure `PROD_ENV_FILE` (below) has
`S3_ENDPOINT=http://localhost:9000`, `S3_FORCE_PATH_STYLE=true`, and
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set to `minioadmin`/`minioadmin`
(the SDK reuses the AWS env var names even though this isn't AWS).

If you'd rather use real AWS S3 instead, skip this and put real AWS
credentials + a blank/omitted `S3_ENDPOINT` in `PROD_ENV_FILE` instead.

## 3. Install the self-hosted GitHub Actions runner

Both repos live under the `HopIn-Organization` GitHub org, so install **one
runner at the org level** (Settings → Actions → Runners → New runner, under
`github.com/organizations/HopIn-Organization/settings/actions/runners`) and
give it the label `hopin-prod` (matches `runs-on: [self-hosted, hopin-prod]`
in both workflows). Follow GitHub's generated download/config commands, e.g.:

```bash
mkdir ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L <url-from-github-ui>
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/HopIn-Organization --token <token-from-github-ui> --labels hopin-prod

# Install as a systemd service so it survives reboots/logout
sudo ./svc.sh install
sudo ./svc.sh start
```

If you'd rather not grant org-wide runner access, register two separate
runners (one per repo, same steps but with each repo's URL/token) and reuse
the `hopin-prod` label on both.

## 4. Configure GitHub for this repo

In `Hopin-Server` → Settings → Environments, create an environment named
**`production`** (the workflow deploys to it). Optionally add required
reviewers here if you want a manual approval gate before deploys run.

In that environment, add each of the following individually (Secrets for
anything sensitive, Variables for everything else — variables stay visible
and editable in place, so this is worth doing right rather than dumping
everything into Secrets). Editing any one of these later only touches that
one value, no re-pasting the rest.

GitHub App vars are named `GH_*` here — GitHub rejects secret/variable names
starting with `GITHUB_` — and get remapped to their real `GITHUB_APP_*` env
var names inside the workflow (see the "Write production .env" step).

**Variables** (Settings → Environments → production → Variables, or repo-level):

| Name | Value |
|---|---|
| `PORT` | `3000` |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USERNAME` | `postgres` |
| `DB_NAME` | `hopin_prod` |
| `DB_SYNCHRONIZE` | `false` (use migrations in prod, not auto-sync) |
| `DB_LOGGING` | `false` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `REFRESH_TOKEN_TTL_DAYS` | `7` |
| `LANGFUSE_HOST` | `https://api.langfuse.com` |
| `LANGFUSE_PUBLIC_KEY` | your prod Langfuse public key (not secret by design) |
| `LANGFUSE_ENABLED` | `true` |
| `AWS_REGION` | `us-east-1` (MinIO ignores it, SDK requires one set) |
| `S3_BUCKET_NAME` | `hopin-project-documents` |
| `S3_ENDPOINT` | `http://localhost:9000` |
| `S3_FORCE_PATH_STYLE` | `true` |
| `PINECONE_INDEX_NAME` | your Pinecone index name |
| `GH_APP_ID` | your GitHub App's numeric ID |
| `GH_APP_SLUG` | your GitHub App's slug |
| `GH_APP_CALLBACK_URL` | `https://hopIn.cs.colman.ac.il/api/github/callback` (must exactly match the Setup URL configured in the GitHub App settings) |
| `CLIENT_ORIGIN` | `https://hopIn.cs.colman.ac.il` |

**Secrets** (Settings → Environments → production → Secrets, or repo-level):

| Name | Value |
|---|---|
| `DB_PASSWORD` | the postgres password IT gave you, or whatever you rotated it to |
| `JWT_ACCESS_SECRET` | generate fresh — don't reuse the dev value |
| `JWT_REFRESH_SECRET` | generate fresh — don't reuse the dev value |
| `LANGFUSE_SECRET_KEY` | your prod Langfuse secret key |
| `AWS_ACCESS_KEY_ID` | `minioadmin` (or your MinIO root user, if you changed it) |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` (or your MinIO root password) |
| `GEMINI_API_KEY` | your Gemini API key |
| `PINECONE_API_KEY` | your Pinecone API key |
| `GH_APP_PRIVATE_KEY` | your GitHub App's private key (`.pem` contents, newlines escaped as `\n`) |
| `GH_WEBHOOK_SECRET` | your GitHub App's webhook secret |

A separate Langfuse project for prod (vs. dev) is a good idea so traces
don't mix.

## 5. How it works

On every push to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
runs on the runner installed above: installs deps, lints, builds, assembles
`.env` from the individual secrets/variables configured above, runs TypeORM migrations against the
native Postgres, builds a Docker image, and replaces the running
`hopin-server` container (`--network host`, so it talks to Postgres over
`localhost:5432` and nginx reaches it over `localhost:3000`). It health-checks
`/health` after starting and automatically rolls back to the previous image
tag if the health check fails.

Pull requests instead run [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
on a normal GitHub-hosted runner against a throwaway Postgres service
container — it never touches the production machine.

### Manual rollback

```bash
docker stop hopin-server && docker rm hopin-server
docker run -d --name hopin-server --network host --env-file .env --restart unless-stopped hopin-server:previous
```
