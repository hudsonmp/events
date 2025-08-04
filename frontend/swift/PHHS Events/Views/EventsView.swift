import SwiftUI

struct EventsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    
    @State private var events: [Event] = []
    @State private var isLoading = false
    @State private var searchText = ""
    @State private var selectedCategory: String? = nil
    @State private var showingAuthSheet = false
    @State private var selectedEvent: Event?
    @State private var showingEventDetail = false
    
    private let categories = ["All"] + Categories.all
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Search and Filter
                searchAndFilterView
                
                // Events List
                eventsListView
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .task {
                await loadEvents()
            }
            .refreshable {
                await loadEvents()
            }
            .sheet(isPresented: $showingAuthSheet) {
                AuthView()
            }
            .sheet(item: $selectedEvent) { event in
                EventDetailView(event: event)
            }
        }
    }
    
    // MARK: - Header View
    private var headerView: some View {
        VStack(spacing: 0) {
            HStack {
                // Logo
                Text("PHHS Events")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.green, .orange],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                
                Spacer()
                
                // Auth Button
                if authManager.isAuthenticated {
                    Button(action: {
                        Task {
                            await authManager.signOut()
                        }
                    }) {
                        Image(systemName: "person.circle")
                            .font(.title2)
                            .foregroundColor(.primary)
                    }
                } else {
                    Button(action: {
                        showingAuthSheet = true
                    }) {
                        Text("Sign In")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.green)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .background(Color(.systemBackground))
            .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
        }
    }
    
    // MARK: - Search and Filter View
    private var searchAndFilterView: some View {
        VStack(spacing: 12) {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search for events, clubs, sports...", text: $searchText)
                    .textFieldStyle(PlainTextFieldStyle())
                    .onSubmit {
                        Task {
                            await loadEvents()
                        }
                    }
                
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                        Task {
                            await loadEvents()
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            
            // Category Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categories, id: \.self) { category in
                        CategoryButton(
                            title: category,
                            isSelected: (category == "All" && selectedCategory == nil) || selectedCategory == category,
                            action: {
                                selectedCategory = category == "All" ? nil : category
                                Task {
                                    await loadEvents()
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(Color(.systemGray6).opacity(0.8))
    }
    
    // MARK: - Events List View
    private var eventsListView: some View {
        Group {
            if isLoading {
                loadingView
            } else if events.isEmpty {
                emptyStateView
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(events) { event in
                            EventCard(
                                event: event,
                                onTap: {
                                    selectedEvent = event
                                    showingEventDetail = true
                                },
                                onAuthRequired: {
                                    showingAuthSheet = true
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
            Text("Loading events...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                Text("No Events Found")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Try adjusting your search or filters.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    // MARK: - Methods
    private func loadEvents() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let fetchedEvents = try await supabaseManager.fetchEvents(
                searchQuery: searchText,
                category: selectedCategory
            )
            await MainActor.run {
                self.events = fetchedEvents
            }
        } catch {
            print("Error loading events: \(error)")
            await MainActor.run {
                self.events = []
            }
        }
    }
}

// MARK: - Category Button
struct CategoryButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title.capitalized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.green : Color(.systemBackground))
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.gray.opacity(0.3), lineWidth: isSelected ? 0 : 1)
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    EventsView()
        .environmentObject(AuthManager.shared)
        .environmentObject(SupabaseManager.shared)
}