import SwiftUI

struct MyEventsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    
    @State private var upcomingEvents: [Event] = []
    @State private var pastEvents: [Event] = []
    @State private var isLoading = false
    @State private var selectedEvent: Event?
    @State private var showingEventDetail = false
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Tab Selector
                tabSelectorView
                
                // Content
                contentView
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .task {
                await loadUserEvents()
            }
            .refreshable {
                await loadUserEvents()
            }
            .sheet(item: $selectedEvent) { event in
                EventDetailView(event: event)
            }
        }
    }
    
    // MARK: - Header View
    private var headerView: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("My Events")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text("Events you've RSVP'd to")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Profile Button
                if let user = authManager.user {
                    Button(action: {
                        Task {
                            await authManager.signOut()
                        }
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: "person.circle")
                                .font(.title2)
                                .foregroundColor(.primary)
                            
                            if let fullName = user.userMetadata?.fullName {
                                Text(fullName.components(separatedBy: " ").first ?? "")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            } else if let email = user.email {
                                Text(email.components(separatedBy: "@").first ?? "")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 16)
            .background(Color(.systemBackground))
            .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
        }
    }
    
    // MARK: - Tab Selector
    private var tabSelectorView: some View {
        HStack(spacing: 0) {
            TabSelectorButton(
                title: "Upcoming",
                count: upcomingEvents.count,
                isSelected: selectedTab == 0,
                action: { selectedTab = 0 }
            )
            
            TabSelectorButton(
                title: "Past",
                count: pastEvents.count,
                isSelected: selectedTab == 1,
                action: { selectedTab = 1 }
            )
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
    }
    
    // MARK: - Content View
    private var contentView: some View {
        Group {
            if isLoading {
                loadingView
            } else {
                TabView(selection: $selectedTab) {
                    eventsListView(events: upcomingEvents, emptyMessage: "No upcoming events")
                        .tag(0)
                    
                    eventsListView(events: pastEvents, emptyMessage: "No past events")
                        .tag(1)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
        }
    }
    
    // MARK: - Events List View
    private func eventsListView(events: [Event], emptyMessage: String) -> some View {
        Group {
            if events.isEmpty {
                emptyStateView(message: emptyMessage)
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(events) { event in
                            MyEventCard(
                                event: event,
                                onTap: {
                                    selectedEvent = event
                                    showingEventDetail = true
                                }
                            )
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 16)
                }
            }
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading your events...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Empty State View
    private func emptyStateView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: selectedTab == 0 ? "calendar.badge.clock" : "calendar.badge.checkmark")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                Text(message)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text(selectedTab == 0 ? "RSVP to events to see them here." : "Events you've attended will appear here.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    // MARK: - Methods
    private func loadUserEvents() async {
        guard let user = authManager.user else { return }
        
        isLoading = true
        defer { isLoading = false }
        
        do {
            let (upcoming, past) = try await supabaseManager.fetchUserEvents(userId: user.id)
            await MainActor.run {
                self.upcomingEvents = upcoming
                self.pastEvents = past
            }
        } catch {
            print("Error loading user events: \(error)")
            await MainActor.run {
                self.upcomingEvents = []
                self.pastEvents = []
            }
        }
    }
}

// MARK: - Tab Selector Button
struct TabSelectorButton: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Text("(\(count))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Rectangle()
                    .frame(height: 2)
                    .foregroundColor(isSelected ? .green : .clear)
            }
            .foregroundColor(isSelected ? .primary : .secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - My Event Card
struct MyEventCard: View {
    let event: Event
    let onTap: () -> Void
    @EnvironmentObject var supabaseManager: SupabaseManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Event Image
            if let firstImage = event.postImages?.postImages.first {
                AsyncImage(url: URL(string: supabaseManager.getPostImageUrl(filePath: firstImage.filePath))) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(ProgressView())
                }
                .frame(height: 140)
                .clipped()
                .cornerRadius(12)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                // Event Title
                Text(event.name)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                
                // Date and Time
                if let startDatetime = event.startDatetime {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        
                        Text(event.formattedDate)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        if !event.isAllDay && !event.formattedTime.isEmpty {
                            Text("at \(event.formattedTime)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Location
                if let locationName = event.locationName {
                    HStack(spacing: 6) {
                        Image(systemName: "location")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        
                        Text(locationName)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                
                // Categories
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(event.categories, id: \.category.id) { categoryWrapper in
                            CategoryTag(name: categoryWrapper.category.name, color: .green)
                        }
                        
                        CategoryTag(name: event.type.displayName, color: .orange)
                    }
                    .padding(.horizontal, 1)
                }
                .padding(.top, 4)
                
                // RSVP Status
                HStack {
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                        
                        Text("RSVP'd")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.green)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(12)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(Color(.systemGray6))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        .onTapGesture {
            onTap()
        }
    }
}

#Preview {
    MyEventsView()
        .environmentObject(AuthManager.shared)
        .environmentObject(SupabaseManager.shared)
}