# PHHS Events iOS App

A native iOS app for Patrick Henry High School events, built with SwiftUI and Supabase.

## Features

- 📱 **Native iOS Experience** - Built with SwiftUI for smooth performance and native feel
- 🎫 **Event Discovery** - Browse and search through school events
- 🔍 **Smart Filtering** - Filter events by categories (academic, athletics, arts, etc.)
- 📅 **Event Details** - Rich event information with images, dates, locations, and descriptions
- ✅ **RSVP System** - RSVP to events and manage your attendance
- 👤 **User Authentication** - Sign in with email/password or Google OAuth
- 📱 **My Events** - View your upcoming and past events
- 🎨 **Beautiful UI** - Clean, modern design matching the web app

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd events/frontend/swift
   ```

2. **Open in Xcode**
   ```bash
   open "PHHS Events.xcodeproj"
   ```

3. **Configure Environment Variables**
   
   Add your Supabase configuration to your environment or update the `SupabaseManager.swift` file:
   ```swift
   private let supabaseURL = "YOUR_SUPABASE_URL"
   private let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
   ```

4. **Add Dependencies (Optional)**
   
   To add Supabase Swift SDK via Swift Package Manager:
   - Go to File → Add Package Dependencies
   - Add `https://github.com/supabase/supabase-swift`
   
   For Google Sign-In:
   - Add `https://github.com/google/GoogleSignIn-iOS`

5. **Build and Run**
   - Select your target device or simulator
   - Press `Cmd+R` to build and run

## Architecture

The app follows MVVM architecture with SwiftUI:

```
PHHS Events/
├── PHHSEventsApp.swift          # App entry point
├── ContentView.swift            # Main tab navigation
├── Views/                       # SwiftUI views
│   ├── EventsView.swift        # Main events feed
│   ├── EventDetailView.swift   # Event detail modal
│   ├── MyEventsView.swift      # User's events
│   └── AuthView.swift          # Authentication
├── Components/                  # Reusable UI components
│   └── EventCard.swift         # Event card component
├── Models/                      # Data models
│   └── Models.swift            # Event, User, etc.
├── Services/                    # Business logic
│   ├── SupabaseManager.swift   # API calls
│   └── AuthManager.swift       # Authentication
└── Assets.xcassets/            # App icons and colors
```

## API Integration

The app uses the same Supabase backend as the web version:

- **Events API** - Fetch events with filtering and search
- **Authentication** - Email/password and OAuth sign-in
- **RSVP System** - Manage event attendance
- **User Management** - Profile and event history
- **Storage** - Event images and profile pictures

## Key Components

### EventsView
- Main events feed with search and filtering
- Category-based filtering
- Pull-to-refresh functionality
- Infinite scroll loading

### EventCard
- Displays event information
- RSVP functionality
- Image loading with caching
- Category tags and event type

### EventDetailView
- Full event details modal
- Image gallery for multiple photos
- RSVP management
- Organizer information
- External links

### AuthView
- Beautiful gradient authentication UI
- Email/password and Google OAuth
- Form validation and error handling
- Tab-based sign in/sign up

### MyEventsView
- Upcoming and past events tabs
- RSVP status indicators
- Event management

## Deployment

To deploy to the App Store:

1. **Configure Code Signing**
   - Set up your Apple Developer account
   - Configure provisioning profiles
   - Update bundle identifier

2. **Update Info.plist**
   - Add required permissions
   - Configure URL schemes for OAuth

3. **Create Archive**
   - Select "Any iOS Device" as target
   - Product → Archive
   - Upload to App Store Connect

4. **App Store Review**
   - Submit for review
   - Respond to any feedback
   - Release when approved

## Environment Variables

The app expects these environment variables or hardcoded values:

```swift
NEXT_PUBLIC_SUPABASE_PROJECT_URL  // Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     // Your Supabase anon key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on device and simulator
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.

---

Built with ❤️ for Patrick Henry High School students