# PakwaanCrm VPS Deployment Guide
## Ubuntu VPS with repo-based production config

This guide matches the real repo structure you showed on the VPS:

```text
/var/www/pakwaancrm
  PakwaanCrm.Backend/
    src/
      PakwaanCrm.API/
  pakwaan-crm-frontend/
```

This version does not use a `.env` file.
Production configuration comes from:

```text
PakwaanCrm.Backend/src/PakwaanCrm.API/appsettings.Production.json
```

## What is already configured in `appsettings.Production.json`

The backend production config now already includes:

- PostgreSQL connection string:
  `Host=localhost;Port=5432;Database=PakwaanCrmDb;Username=postgres;Password=1324`
- CORS for:
  `https://panjatancatering.online`
  `https://www.panjatancatering.online`
- JWT config
- Seed admin:
  `admin / admin`
- Swagger disabled in production

Important:

- Change the JWT signing key before going live.
- Log in with `admin / admin` only once, then change the password immediately.

---

## Step 1: SSH into the VPS

```bash
ssh root@YOUR_VPS_IP
```

---

## Step 2: Point DNS to the VPS

Create these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `YOUR_VPS_IP` |
| A | `www` | `YOUR_VPS_IP` |

Verify from the VPS:

```bash
dig +short panjatancatering.online
dig +short www.panjatancatering.online
```

Both should return your VPS IP.

---

## Step 3: Clone the repo

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/MuhammadHaxcan/PakwaanCrm.git pakwaancrm
cd /var/www/pakwaancrm
git checkout master
```

If the repo already exists:

```bash
cd /var/www/pakwaancrm
git pull origin master
```

---

## Step 4: Create the PostgreSQL database

```bash
sudo -u postgres psql -c 'CREATE DATABASE "PakwaanCrmDb";'
sudo -u postgres psql -l | grep PakwaanCrmDb
```

If it already exists, PostgreSQL will tell you.

---

## Step 5: Update production appsettings before publish

Go to the backend API folder:

```bash
cd /var/www/pakwaancrm/PakwaanCrm.Backend/src/PakwaanCrm.API
```

Edit production config:

```bash
nano appsettings.Production.json
```

At minimum, make sure `Jwt:SigningKey` is changed from the placeholder value to a strong secret.

If you want to generate a new key:

```bash
openssl rand -base64 64 | tr -d '\n'
```

Paste that into `appsettings.Production.json` as the JWT signing key.

Current expected production config shape:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=PakwaanCrmDb;Username=postgres;Password=1324"
  },
  "CorsSettings": {
    "AllowedOrigins": [
      "https://panjatancatering.online",
      "https://www.panjatancatering.online"
    ]
  },
  "Jwt": {
    "Issuer": "PakwaanCrm",
    "Audience": "PakwaanCrmClient",
    "SigningKey": "REPLACE_WITH_A_REAL_LONG_SECRET",
    "AccessTokenMinutes": 60,
    "RefreshTokenDays": 7
  },
  "SeedAdmin": {
    "Username": "admin",
    "Password": "admin",
    "DisplayName": "System Admin"
  },
  "Swagger": {
    "Enabled": false
  }
}
```

---

## Step 6: Publish the backend

```bash
cd /var/www/pakwaancrm/PakwaanCrm.Backend/src/PakwaanCrm.API
dotnet publish -c Release -o /var/www/pakwaancrm/published/api

chown -R www-data:www-data /var/www/pakwaancrm/published/api
chmod -R 755 /var/www/pakwaancrm/published/api
```

No manual migration command is needed.
The API runs EF Core migrations automatically on startup.

---

## Step 7: Create the systemd service

```bash
cat > /etc/systemd/system/pakwaanapi.service << 'EOF'
[Unit]
Description=PakwaanCrm API
After=network.target postgresql.service

[Service]
WorkingDirectory=/var/www/pakwaancrm/published/api
ExecStart=/usr/bin/dotnet /var/www/pakwaancrm/published/api/PakwaanCrm.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=pakwaanapi
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5100
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable pakwaanapi
systemctl start pakwaanapi
systemctl status pakwaanapi --no-pager
```

Check logs if needed:

```bash
journalctl -u pakwaanapi -n 100 --no-pager
```

Check the backend port:

```bash
ss -tlnp | grep 5100
curl http://localhost:5100/swagger/index.html | head -5
```

---

## Step 8: Build and deploy the frontend

```bash
cd /var/www/pakwaancrm/pakwaan-crm-frontend
npm install
npm run build

mkdir -p /var/www/pakwaancrm/published/frontend
rm -rf /var/www/pakwaancrm/published/frontend/*
cp -r dist/pakwaan-crm-frontend/browser/* /var/www/pakwaancrm/published/frontend/

chown -R www-data:www-data /var/www/pakwaancrm/published/frontend
chmod -R 755 /var/www/pakwaancrm/published/frontend
```

The frontend already uses relative `/api`, so no frontend environment setup is needed.

---

## Step 9: Temporary Nginx config for certificate issuance

```bash
cat > /etc/nginx/sites-available/pakwaancrm << 'EOF'
server {
    listen 80;
    server_name panjatancatering.online www.panjatancatering.online;

    location / {
        root /var/www/pakwaancrm/published/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pakwaancrm /etc/nginx/sites-enabled/pakwaancrm
nginx -t
systemctl reload nginx
```

---

## Step 10: Issue SSL certificate

```bash
certbot --nginx \
  -d panjatancatering.online \
  -d www.panjatancatering.online \
  --non-interactive --agree-tos -m your-email@example.com
```

Verify renewal:

```bash
certbot renew --dry-run
```

---

## Step 11: Replace Nginx config with final HTTPS config

```bash
cat > /etc/nginx/sites-available/pakwaancrm << 'EOF'
server {
    listen 80;
    server_name panjatancatering.online www.panjatancatering.online;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name panjatancatering.online www.panjatancatering.online;

    ssl_certificate /etc/letsencrypt/live/panjatancatering.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panjatancatering.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        root /var/www/pakwaancrm/published/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

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
        client_max_body_size 25m;
        proxy_read_timeout 120s;
    }

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

## Step 12: Verify everything

```bash
systemctl status postgresql --no-pager
systemctl status nginx --no-pager
systemctl status pakwaanapi --no-pager

curl http://localhost:5100/swagger/index.html | head -5
curl -I https://panjatancatering.online
curl -I https://www.panjatancatering.online
curl -X POST https://panjatancatering.online/api/auth/login -H "Content-Type: application/json" -d '{}'
```

Expected:

- Backend is reachable on `localhost:5100`
- Site loads over HTTPS
- Login endpoint returns an application response, not `502`

Then open:

- `https://panjatancatering.online`
- `https://panjatancatering.online/swagger`

Sign in with:

- Username: `admin`
- Password: `admin`

Change the password immediately after first login.

---

## Update and redeploy commands

```bash
cd /var/www/pakwaancrm
git pull origin master

cd /var/www/pakwaancrm/PakwaanCrm.Backend/src/PakwaanCrm.API
dotnet publish -c Release -o /var/www/pakwaancrm/published/api
chown -R www-data:www-data /var/www/pakwaancrm/published/api
chmod -R 755 /var/www/pakwaancrm/published/api
systemctl restart pakwaanapi

cd /var/www/pakwaancrm/pakwaan-crm-frontend
npm install
npm run build
rm -rf /var/www/pakwaancrm/published/frontend/*
cp -r dist/pakwaan-crm-frontend/browser/* /var/www/pakwaancrm/published/frontend/
chown -R www-data:www-data /var/www/pakwaancrm/published/frontend
chmod -R 755 /var/www/pakwaancrm/published/frontend
systemctl reload nginx
```

---

## Optional update script

```bash
cat > /var/www/pakwaancrm/update.sh << 'EOF'
#!/bin/bash
set -e

cd /var/www/pakwaancrm
git pull origin master

cd /var/www/pakwaancrm/PakwaanCrm.Backend/src/PakwaanCrm.API
dotnet publish -c Release -o /var/www/pakwaancrm/published/api
chown -R www-data:www-data /var/www/pakwaancrm/published/api
chmod -R 755 /var/www/pakwaancrm/published/api
systemctl restart pakwaanapi

cd /var/www/pakwaancrm/pakwaan-crm-frontend
npm install
npm run build
rm -rf /var/www/pakwaancrm/published/frontend/*
cp -r dist/pakwaan-crm-frontend/browser/* /var/www/pakwaancrm/published/frontend/
chown -R www-data:www-data /var/www/pakwaancrm/published/frontend
chmod -R 755 /var/www/pakwaancrm/published/frontend
systemctl reload nginx
EOF

chmod +x /var/www/pakwaancrm/update.sh
```

Run:

```bash
/var/www/pakwaancrm/update.sh
```

---

## Useful commands

```bash
journalctl -u pakwaanapi -f
journalctl -u pakwaanapi -n 100 --no-pager
systemctl restart pakwaanapi
systemctl reload nginx
sudo -u postgres psql -d PakwaanCrmDb
sudo -u postgres psql -d PakwaanCrmDb -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'
certbot certificates
```

---

## Troubleshooting

### API fails to start

```bash
journalctl -u pakwaanapi -n 100 --no-pager
ss -tlnp | grep 5100
```

Common causes:

- `Jwt:SigningKey` in `appsettings.Production.json` is still weak or malformed
- PostgreSQL is down
- Database `PakwaanCrmDb` does not exist
- Port `5100` is already in use

### 502 on `/api`

```bash
systemctl status pakwaanapi --no-pager
journalctl -u pakwaanapi -n 100 --no-pager
```

### SPA route refresh gives 404

Make sure this exists in Nginx:

```nginx
try_files $uri $uri/ /index.html;
```

### CORS issues

Make sure these production origins exist in `appsettings.Production.json`:

```json
"CorsSettings": {
  "AllowedOrigins": [
    "https://panjatancatering.online",
    "https://www.panjatancatering.online"
  ]
}
```
