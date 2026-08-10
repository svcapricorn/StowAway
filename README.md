# SailMed Safe Haven

## Project Info

Medical inventory tracking and identifying application.

## Development

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Install dependencies
npm install

# Step 2: Set up the frontend environment variables
# Create a .env file in the project root with:
# VITE_SUPABASE_URL=https://your-project-ref.supabase.co
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# VITE_API_URL=http://localhost:3001/api/inventory
# VITE_OPENAI_API_KEY=your_key_here

# Step 3: Set up the server environment variables
# Create server/.env with:
# SUPABASE_URL=https://your-project-ref.supabase.co
# SUPABASE_JWT_AUDIENCE=authenticated
# DATABASE_URL=your_database_connection_string

# Step 4: Start the development server
npm run dev

# Step 5: In a second terminal, start the API server
npm run server
```

## Supabase Auth Setup

1. Create a Supabase project.
2. In Supabase, go to Authentication > URL Configuration.
3. Set Site URL to your deployed frontend URL.
4. Add these Redirect URLs:
	- http://localhost:8080/login
	- your production URL ending in /login
5. In Authentication > Providers, enable Email.
6. If you want passwordless login, keep Magic Link enabled.
7. Copy the project URL and anon key into the frontend .env file.
8. Copy the project URL into server/.env as SUPABASE_URL.

## Notes

- The frontend login screen supports email/password and magic-link sign-in.
- The backend verifies Supabase bearer tokens with the project's JWKS endpoint.
- For local-only bypass during development, VITE_MOCK_AUTH=true still skips hosted auth.
