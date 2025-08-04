import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            EventsView()
                .tabItem {
                    Image(systemName: "calendar")
                    Text("Events")
                }
                .tag(0)
            
            if authManager.isAuthenticated {
                MyEventsView()
                    .tabItem {
                        Image(systemName: "person.calendar")
                        Text("My Events")
                    }
                    .tag(1)
            }
        }
        .accentColor(.green)
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager.shared)
        .environmentObject(SupabaseManager.shared)
}