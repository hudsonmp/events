# Localhost Authentication Setup

This document explains how to set up authentication for local development.

## Environment Configuration

For local development, you need to use the `.env.local` file which has been created with:
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

This ensures that OAuth redirects work correctly when developing locally.

## Supabase Configuration

Make sure your Supabase project has the following redirect URLs configured in the Auth settings:

### Allowed Redirect URLs
Add these URLs to your Supabase dashboard under Authentication > URL Configuration:
- `http://localhost:3000/auth/callback` (for local development)
- `https://henryai.org/auth/callback` (for production)

### How to Configure in Supabase:
1. Go to your Supabase dashboard
2. Navigate to Authentication > URL Configuration
3. Add `http://localhost:3000/auth/callback` to the "Redirect URLs" list
4. Save the configuration

## How It Works

The auth flow now has improved fallback logic:
1. **Primary**: Uses `window.location.origin` when available (works for both localhost and production)
2. **Fallback 1**: Uses development mode detection (`NODE_ENV === "development"`) → defaults to localhost:3000
3. **Fallback 2**: Uses `NEXT_PUBLIC_SITE_URL` environment variable
4. **Final Fallback**: Uses hardcoded production URL

## Testing
- Start your development server: `npm run dev`
- Navigate to `http://localhost:3000`
- Try signing in with Google
- Should redirect back to `http://localhost:3000` after successful authentication

## Troubleshooting
- Check browser console for auth redirect logs (they start with 🔐)
- Verify `.env.local` exists and has the correct localhost URL
- Ensure Supabase has localhost callback URL configured
