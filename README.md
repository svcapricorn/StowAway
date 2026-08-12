# StowAway Safe Haven

## Project Info

Medical inventory tracking and identifying application.

## Local Development

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Install dependencies
npm install

# Step 2: Set up the frontend environment variables
# Create a .env file in the project root with:
# VITE_SUPABASE_URL=https://your-project-ref.supabase.co
# VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
# VITE_API_URL=http://localhost:3001/api/inventory

# Step 3: Set up the server environment variables
# Create server/.env with:
# SUPABASE_URL=https://your-project-ref.supabase.co
# SUPABASE_JWT_AUDIENCE=authenticated
# DATABASE_URL=your_database_connection_string
# OPENAI_API_KEY=your_openai_api_key

# Step 4: Start the development server
npm run dev

# Step 5: In a second terminal, start the API server
npm run server
```

## Production Architecture

- Frontend: static build on S3 + CloudFront
- Backend API: Node/Express on AWS Lightsail (Ubuntu + PM2 + Nginx)
- Auth + database: Supabase

## Lightsail First-Time Setup

Run these on your Lightsail instance after SSH login:

```sh
sudo apt update
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Clone and build the server:

```sh
cd ~
git clone https://github.com/svcapricorn/seamed-safe-haven.git
cd seamed-safe-haven/server
npm install --include=dev
npm run build
```

Create runtime env vars on the server:

```sh
sudo tee /etc/stowaway.env > /dev/null <<'EOF'
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
DATABASE_URL=postgresql://postgres:your_db_password@db.your-project-ref.supabase.co:6543/postgres?sslmode=require
PORT=3001
OPENAI_API_KEY=your_openai_api_key
EOF

sudo chown root:ubuntu /etc/stowaway.env
sudo chmod 640 /etc/stowaway.env
```

Start the API with PM2:

```sh
cd ~/seamed-safe-haven/server
set -a
source /etc/stowaway.env
set +a

pm2 start dist/index.js --name stowaway-api
pm2 save
pm2 startup
```

Verify API is healthy:

```sh
curl http://127.0.0.1:3001/health
```

### Nginx + HTTPS

Create Nginx site config for your API domain:

```sh
sudo tee /etc/nginx/sites-available/seamed-api > /dev/null <<'EOF'
server {
	listen 80;
	server_name api.your-domain.com;
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl http2;
	server_name api.your-domain.com;

	ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
	include /etc/letsencrypt/options-ssl-nginx.conf;
	ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

	location / {
		proxy_pass http://127.0.0.1:3001;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
EOF

sudo ln -sf /etc/nginx/sites-available/seamed-api /etc/nginx/sites-enabled/seamed-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Install certbot and issue certificate:

```sh
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

Verify public endpoint:

```sh
curl -i https://api.your-domain.com/health
```

## Day-to-Day Server Commands (Lightsail)

Restart API:

```sh
cd ~/seamed-safe-haven/server
set -a
source /etc/stowaway.env
set +a
pm2 restart stowaway-api --update-env
```

Update server code after local push:

```sh
cd ~/seamed-safe-haven
git fetch origin
git reset --hard origin/main
cd server
npm install --include=dev
npm run build
pm2 restart stowaway-api --update-env
```

Logs and status:

```sh
pm2 status
pm2 logs stowaway-api --lines 100
```

## Frontend Deploy (S3 + CloudFront)

Set frontend env vars before build:

```sh
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
VITE_API_URL=https://api.your-domain.com/api/inventory
```

Build and deploy:

```sh
npm run build
```

Upload `dist/` to your S3 bucket, then create a CloudFront invalidation.

### Required: SPA routing on CloudFront

This is a client-side routed app. Unlike Vercel (which uses `vercel.json` rewrites), CloudFront does not know about routes like `/login` or `/auth/callback` and will return S3's raw 403/404 response for a direct hit on those paths (for example, when a user clicks a Supabase confirmation-email link). That breaks email confirmation and magic-link sign-in.

Fix it once in the CloudFront distribution:

1. Open the distribution > **Error pages** tab.
2. Create a custom error response for **403** (or **404**, depending on your S3 origin type):
	- HTTP Response Code: `200`
	- Response Page Path: `/index.html`
3. Repeat for the other status code (403 and 404) so both are covered.
4. Save changes and create a CloudFront invalidation for `/*`.

Without this, any deep link (email confirmation, magic link, bookmarked page, browser refresh on a route) will fail with a raw S3 error page instead of loading the app.

## Supabase Auth Setup

1. Create a Supabase project.
2. In Supabase, go to Authentication > URL Configuration.
3. Set Site URL to your deployed frontend URL.
4. Add these Redirect URLs:
	- http://localhost:8080/login
	- http://localhost:8080/auth/callback
	- your production URL ending in /login
	- your production URL ending in /auth/callback
5. In Authentication > Providers, enable Email.
6. If you want passwordless login, keep Magic Link enabled.
7. Copy the project URL and anon key into the frontend .env file.
8. Copy the project URL into server/.env as SUPABASE_URL.

## Notes

- The frontend login screen supports email/password and magic-link sign-in.
- The backend verifies Supabase bearer tokens with the project's JWKS endpoint.
- For local-only bypass during development, VITE_MOCK_AUTH=true still skips hosted auth.
- Do not commit `.env` or `server/.env` files; commit only `.env.example` templates.
