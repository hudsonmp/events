# Events Frontend - RSVP System

A Next.js frontend application for managing event RSVPs and viewing upcoming and past events from Supabase.

## Features

- **My Events Page**: View your upcoming and past events
- **RSVP Management**: Join or leave events with real-time updates
- **Event Cards**: Beautiful event display with date, location, and status
- **Authentication**: Secure user authentication with Supabase Auth
- **Responsive Design**: Works on desktop and mobile devices

## Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- A Supabase project with the required database schema

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd events/frontend/nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application expects the following Supabase tables:

- `events`: Main events table with event details
- `event_attendees`: Junction table linking users to events they're attending
- `users`: User profiles linked to Supabase Auth
- `schools`: School information for organizing events

See `/instagram/extraction/supabase.sql` for the complete schema.

## Project Structure

```
events/frontend/nextjs/
├── app/                    # Next.js App Router pages
│   ├── my-events/         # RSVP page showing user's events
│   ├── layout.tsx         # Root layout with auth provider
│   ├── page.tsx           # Home page (redirects to my-events)
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (buttons, cards, etc.)
│   └── event-card.tsx    # Event display component
├── lib/                  # Utility functions and configurations
│   ├── contexts/         # React contexts
│   ├── supabase/         # Supabase client configuration
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── package.json          # Dependencies and scripts
```

## Key Components

### EventCard
Displays individual events with:
- Event name, description, and status badges
- Date, time, and location information
- RSVP buttons for joining/leaving events
- Different styling for upcoming vs. past events

### My Events Page
- **Upcoming Tab**: Shows events the user has RSVP'd to that haven't occurred yet
- **Past Tab**: Shows events the user attended in the past
- **Empty States**: Helpful messages when no events are found
- **Error Handling**: Graceful error display with retry options

### Authentication
- Uses Supabase Auth for user authentication
- AuthProvider context manages user state across the app
- Protected routes redirect to sign-in when needed

## Usage

1. **View Your Events**: Navigate to `/my-events` to see your RSVP'd events
2. **Manage RSVPs**: Use the "Join Event" or "Leave Event" buttons on upcoming events
3. **Browse Events**: Use the navigation to browse all available events (requires additional event listing page)

## Development

### Adding New Features

1. **New Components**: Add to `/components` directory
2. **New Pages**: Add to `/app` directory using Next.js App Router
3. **Database Queries**: Use the Supabase client in `/lib/supabase`
4. **Styling**: Use Tailwind CSS classes and the design system in `/components/ui`

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your preferred platform (Vercel, Netlify, etc.)

3. Set environment variables in your deployment platform

## Contributing

This project follows modern React and Next.js best practices:
- TypeScript for type safety
- Tailwind CSS for styling
- Component composition with Radix UI
- Server and client components appropriately separated
- Error boundaries and loading states