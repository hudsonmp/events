import SwiftUI

@main
struct PHHSEventsApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var supabaseManager = SupabaseManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(supabaseManager)
                .onOpenURL { url in
                    // Handle deep links for OAuth callbacks
                    handleDeepLink(url)
                }
        }
    }
    
    private func handleDeepLink(_ url: URL) {
        // Handle OAuth callback URLs
        if url.scheme == "com.phhsevents.app" {
            // Process authentication callback
            print("Received deep link: \(url)")
        }
    }
}