# PakwaanCrm VPS Deployment Guide
## Ubuntu 24.04 (Noble) on Hostinger — co-hosted with FreightForwarding

**VPS:** `72.62.192.1` (same VPS as FreightForwarding V3)
**Domain:** `panjatancatering.com` (and `www.panjatancatering.com`) — Let's Encrypt SSL
**Repo:** `https://github.com/MuhammadHaxcan/PakwaanCrm.git` (branch `master`)

### Stack
- **Runtime:** .NET 8 (`dotnet-sdk-8.0`, ASP.NET Core 8 runtime)
- **Database:** PostgreSQL 16 (shared instance with FreightForwarding — separate database `PakwaanCrmDb`)
- **Web tier:** Nginx + Let's Encrypt SSL (shared instance — new server block)
- **Frontend:** Angular 17 (built with Node.js 20, served as static files by Nginx)
- **Backend port:** `5100` (FreightForwarding API uses `5000` — do not change)

### Co-existence with FreightForwarding

This guide assumes the FreightForwarding V3 deployment (`Backend/FreightForwarding.Backend/deployment/DEPLOYMENT_V3.md`) is **already done** on this VPS. That means the following are already installed and **must not be re-installed or reconfigured**:

- PostgreSQL 16 (port 5432, password `1324` for `postgres` user)
- Nginx
- Node.js 20
- Certbot
- UFW firewall (already permits 80 / 443 / OpenSSH)
- GitHub SSH key for the `root` account (Step 7.5 of the V3 guide — `git@github.com` works)

The only **new** runtime requirement is **.NET 8** (FreightForwarding runs on .NET 10). They install side-by-side cleanly.

---

## Step 1: Point DNS to the VPS

**Do this FIRST.** Certbot in Step 9 will fail until DNS resolves to the VPS.

In the registrar's DNS panel for `panjatancatering.com`, set:

| Type | Name | Value          | TTL  |
|------|------|----------------|------|
| A    | `@`  | `72.62.192.1` | 3600 |
| A    | `www`| `72.62.192.1` | 3600 |

Wait for propagation. Verify from anywhere:

```bash
dig +short panjatancatering.com
dig +short www.panjatancatering.com
# Both should return: 72.62.192.1
```

---

## Step 2: Connect to the VPS

```bash
ssh root@72.62.192.1
```

If GitHub SSH auth is **not** already set up on this VPS, follow Step 7.5 of the FreightForwarding V3 guide first. Verify:

```bash
ssh -T git@github.com
# Expected: "Hi MuhammadHaxcan! ..."
```

---

## Step 3: Install .NET 8

The Microsoft package source is already added by the FreightForwarding V3 deploy. Just install the SDK:

```bash
apt update
apt install -y dotnet-sdk-8.0

# Both runtimes should now be visible
dotnet --list-sdks
# Expected: 8.0.x and 10.0.x
```

> **Note:** Installing the SDK (not just the runtime) lets `dotnet publish` run on the VPS during updates, matching the FreightForwarding workflow.

---

## Step 4: Create the PakwaanCrm Database

The PostgreSQL instance is already running. Just add a new database:

```bash
sudo -u postgres psql -c 'CREATE DATABASE "PakwaanCrmDb";'
sudo -u postgres psql -l | grep PakwaanCrmDb   # verify
```

The `postgres` user password is `1324` (set during the FreightForwarding deploy). PakwaanCrm reuses it via the connection string in Step 6.

---

## Step 5: Generate JWT Signing Key

PakwaanCrm's shared `appsettings.json` ships with a placeholder JWT signing key (`CHANGE_THIS_IN_ENV_TO_A_LONG_RANDOM_SECRET_32+`) that Program.cs's `ValidateOnStart` will reject if left as-is. Generate a real key now and save it for Step 7:

```bash
openssl rand -base64 64 | tr -d '\n'
```

Copy the output. You'll paste it into the systemd unit file in Step 7 as `Jwt__SigningKey`.

---

## Step 6: Clone & Publish Backend

```bash
mkdir -p /var/www
cd /var/www

git clone https://github.com/MuhammadHaxcan/PakwaanCrm.git pakwaan-backend
cd pakwaan-backend
git checkout master
```

> Migrations are **committed** to the repo (`PakwaanCrm.Backend/src/PakwaanCrm.API/Migrations/`) and the API auto-applies them on startup via `db.Database.Migrate()` in `Program.cs`. **No manual `dotnet ef` commands are needed.**

Publish:

```bash
cd /var/www/pakwaan-backend/PakwaanCrm.Backend/src/PakwaanCrm.API
dotnet publish -c Release -o /var/www/pakwaan-api

chown -R www-data:www-data /var/www/pakwaan-api
chmod -R 755 /var/www/pakwaan-api
```

---

## Step 7: Create Backend systemd Service

Backend listens on `5100` (so it doesn't collide with FreightForwarding's `5000`). Connection string and JWT signing key are passed via `Environment=` rather than edited into `appsettings.json` — this keeps `git pull` clean and keeps secrets off disk in cleartext config files.

Replace `<PASTE_JWT_KEY_HERE>` with the value from Step 5.

```bash
cat > /etc/systemd/system/pakwaanapi.service << 'EOF'
[Unit]
Description=PakwaanCrm API
After=network.target postgresql.service

[Service]
WorkingDirectory=/var/www/pakwaan-api
ExecStart=/usr/bin/dotnet /var/www/pakwaan-api/PakwaanCrm.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=pakwaanapi
User=www-data

Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5100
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

# Override appsettings.json — double underscore = nested key
Environment=ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=PakwaanCrmDb;Username=postgres;Password=1324
Environment=Jwt__SigningKey=<PASTE_JWT_KEY_HERE>
Environment=CorsSettings__AllowedOrigins__0=https://panjatancatering.com
Environment=CorsSettings__AllowedOrigins__1=https://www.panjatancatering.com

[Install]
WantedBy=multi-user.target
EOF
```

Edit the file and replace the placeholder with the JWT key:

```bash
nano /etc/systemd/system/pakwaanapi.service
# Replace <PASTE_JWT_KEY_HERE> with the value generated in Step 5, save & exit
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable pakwaanapi
systemctl start pakwaanapi
systemctl status pakwaanapi
```

The first start will run all committed migrations against the empty `PakwaanCrmDb`.

For a brand-new production database, add these lines to the service file before the first start so the initial admin can be created explicitly:

```bash
Environment=SeedAdmin__Username=admin
Environment=SeedAdmin__Password=<strong-initial-password>
Environment=SeedAdmin__DisplayName=System Admin
```

After the first admin has been created successfully, remove those three lines and restart the service.

Sanity-check it's listening:

```bash
ss -tlnp | grep 5100
curl http://localhost:5100/swagger/index.html | head -5
```

---

## Step 8: Clone, Build & Deploy Frontend

```bash
cd /var/www
git clone https://github.com/MuhammadHaxcan/PakwaanCrm.git pakwaan-frontend-src

# (Same repo as backend; we just keep a separate working copy for the frontend.)
cd /var/www/pakwaan-frontend-src/PakwaanCrm/pakwaan-crm-frontend

npm install
npm run build

mkdir -p /var/www/pakwaan-frontend
cp -r dist/pakwaan-crm-frontend/browser/* /var/www/pakwaan-frontend/

chown -R www-data:www-data /var/www/pakwaan-frontend
chmod -R 755 /var/www/pakwaan-frontend
```

> **Why `dist/pakwaan-crm-frontend/browser/`?** Angular 17's application builder writes the SPA assets into a `browser/` subdirectory. There is no `dist/index.html` directly.
>
> **Why no `.env`?** The frontend uses relative `/api` URLs (see `src/app/core/services/api.service.ts:8`). Nginx proxies `/api/` to `http://localhost:5100/api/` — no build-time API URL to configure.

---

## Step 9: Issue Let's Encrypt Certificate

DNS must already point at the VPS (Step 1). Stand up a **temporary HTTP-only** Nginx config for `panjatancatering.com` so certbot can complete the HTTP-01 challenge:

```bash
cat > /etc/nginx/sites-available/pakwaancrm << 'EOF'
server {
    listen 80;
    server_name panjatancatering.com www.panjatancatering.com;

    location / {
        root /var/www/pakwaan-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pakwaancrm /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Issue the cert (covers both apex and `www`):

```bash
certbot --nginx \
  -d panjatancatering.com \
  -d www.panjatancatering.com \
  --non-interactive --agree-tos -m your-email@example.com

certbot renew --dry-run    # verify auto-renewal works
```

---

## Step 10: Replace with Full Nginx Config (HTTPS + API proxy)

Now that certbot has placed the certs, swap the temporary HTTP-only block for the full SSL + API-proxy version. **This file does not touch the FreightForwarding server block** (separate file, separate `server_name`).

```bash
cat > /etc/nginx/sites-available/pakwaancrm << 'EOF'
# HTTP -> HTTPS redirect (apex + www)
server {
    listen 80;
    server_name panjatancatering.com www.panjatancatering.com;
    return 301 https://$host$request_uri;
}

# HTTPS — apex
server {
    listen 443 ssl;
    server_name panjatancatering.com www.panjatancatering.com;

    ssl_certificate /etc/letsencrypt/live/panjatancatering.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panjatancatering.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend (Angular SPA)
    location / {
        root /var/www/pakwaan-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5100/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;

        # Voucher / report PDFs can be large — bump body & response timeouts
        client_max_body_size 25m;
        proxy_read_timeout 120s;
    }

    # Swagger (optional — remove these 5 lines to hide it on production)
    location /swagger/ {
        proxy_pass http://localhost:5100/swagger/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;
}
EOF

nginx -t
systemctl reload nginx
```

---

## Step 11: Verify

```bash
systemctl status postgresql
systemctl status pakwaanapi
systemctl status nginx

# Backend up?
curl http://localhost:5100/swagger/index.html | head -5

# Public site reachable over HTTPS?
curl -I https://panjatancatering.com
curl -I https://www.panjatancatering.com

# Login endpoint (should reject empty body with 400, NOT 502)
curl -X POST https://panjatancatering.com/api/auth/login \
     -H "Content-Type: application/json" -d '{}'
```

Open in the browser:
- App: https://panjatancatering.com
- Swagger: https://panjatancatering.com/swagger
- Sign in with `admin / admin` and **change the password immediately**.

---

## Update & Redeploy Script

```bash
cat > /var/www/pakwaan-update.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Updating PakwaanCrm ==="

# Backend
echo "[1/3] Updating backend..."
cd /var/www/pakwaan-backend
git pull origin master

cd PakwaanCrm.Backend/src/PakwaanCrm.API
dotnet publish -c Release -o /var/www/pakwaan-api
chown -R www-data:www-data /var/www/pakwaan-api
chmod -R 755 /var/www/pakwaan-api

# Restart API — migrations auto-apply on startup
echo "[2/3] Restarting API service..."
systemctl restart pakwaanapi

# Frontend
echo "[3/3] Updating frontend..."
cd /var/www/pakwaan-frontend-src/PakwaanCrm/pakwaan-crm-frontend
git pull origin master
npm install
npm run build
rm -rf /var/www/pakwaan-frontend/*
cp -r dist/pakwaan-crm-frontend/browser/* /var/www/pakwaan-frontend/
chown -R www-data:www-data /var/www/pakwaan-frontend
chmod -R 755 /var/www/pakwaan-frontend

systemctl reload nginx

echo "=== Update complete ==="
systemctl status pakwaanapi --no-pager | head -15
EOF

chmod +x /var/www/pakwaan-update.sh
```

To deploy the latest code:

```bash
/var/www/pakwaan-update.sh
```

> Migrations stay in sync automatically: the API runs `db.Database.Migrate()` on startup, and `systemctl restart pakwaanapi` is part of the script.

---

## Useful Commands

```bash
# Live logs
journalctl -u pakwaanapi -f
journalctl -u pakwaanapi -n 100

# Restart
systemctl restart pakwaanapi
systemctl reload nginx

# DB shell
sudo -u postgres psql -d PakwaanCrmDb

# List applied migrations
sudo -u postgres psql -d PakwaanCrmDb -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'

# Check certs
certbot certificates
```

---

## Database Reset (DESTRUCTIVE — wipes all PakwaanCrm data)

```bash
systemctl stop pakwaanapi
sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "PakwaanCrmDb";'
sudo -u postgres psql -c 'CREATE DATABASE "PakwaanCrmDb";'
systemctl start pakwaanapi
# Migrations + seed admin will run again on startup.
```

---

## Troubleshooting

### API not starting
```bash
journalctl -u pakwaanapi -n 80
ss -tlnp | grep 5100
```
Most common causes:
- `Jwt__SigningKey` placeholder still in the unit file → `ValidateOnStart` throws.
- Port 5100 already taken (`ss -tlnp | grep 5100`).
- DB connection refused → check `systemctl status postgresql` and confirm `PakwaanCrmDb` exists.
- No production seed admin was configured for a brand-new database → add the `SeedAdmin__...` environment variables from Step 7, start once, then remove them.

### 502 from `/api/...`
Backend is down. `systemctl status pakwaanapi`, then check `journalctl`.

### 404 on a deep-linked SPA route after refresh
`try_files $uri $uri/ /index.html;` is missing from the `location /` block. Re-apply Step 10 config.

### Certbot fails with "Connection refused" or "DNS problem"
DNS hasn't propagated yet (Step 1). `dig +short panjatancatering.com` must return `72.62.192.1` from the VPS itself before retrying.

### CORS errors in the browser console
The systemd `Environment=CorsSettings__AllowedOrigins__N=...` lines in Step 7 are how you add allowed origins. Restart the API after editing:
```bash
systemctl daemon-reload
systemctl restart pakwaanapi
```

---

## Configuration Files Summary

### Backend
| File | Environment | Notes |
|------|-------------|-------|
| `appsettings.json` | All | Shared defaults only. Keep secrets and real production origins out of this file. |
| `appsettings.Development.json` | Development only | Local DB string, local CORS origins, dev seed admin, Swagger enabled. |
| `appsettings.Production.json` | Production only | Swagger disabled by default. Production secrets and origins should still come from systemd `Environment=` lines. |

### Server
| Path | Purpose |
|------|---------|
| `/etc/systemd/system/pakwaanapi.service` | .NET API systemd unit (port 5100, holds runtime secrets) |
| `/etc/nginx/sites-available/pakwaancrm` | Nginx server block for `panjatancatering.com` (separate from FreightForwarding) |
| `/etc/letsencrypt/live/panjatancatering.com/` | TLS certs (auto-renew via certbot timer) |
| `/var/www/pakwaan-backend/` | Backend git checkout |
| `/var/www/pakwaan-api/` | Published backend (what systemd runs) |
| `/var/www/pakwaan-frontend-src/` | Frontend git checkout |
| `/var/www/pakwaan-frontend/` | Built static SPA (what Nginx serves) |
| `/var/www/pakwaan-update.sh` | One-shot update + redeploy script |

### Port allocation on this VPS
| Service                  | Port  |
|--------------------------|-------|
| FreightForwarding API    | 5000  |
| **PakwaanCrm API**       | **5100** |
| PostgreSQL               | 5432  |
| Nginx (HTTP/HTTPS)       | 80 / 443 |
