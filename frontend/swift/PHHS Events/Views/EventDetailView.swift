import SwiftUI

struct EventDetailView: View {
    let event: Event
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    
    @State private var isRSVPed = false
    @State private var isLoadingRSVP = false
    @State private var attendeeCount = 0
    @State private var showingAuthSheet = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Image Gallery
                    if let postImages = event.postImages?.postImages, !postImages.isEmpty {
                        imageGalleryView(images: postImages)
                    }
                    
                    // Content
                    VStack(alignment: .leading, spacing: 24) {
                        // Header
                        headerView
                        
                        // RSVP Section
                        rsvpSectionView
                        
                        // Categories and Type
                        categoriesView
                        
                        // Description
                        if let description = event.description {
                            descriptionView(description: description)
                        }
                        
                        // Tags
                        if !event.tags.isEmpty {
                            tagsView
                        }
                        
                        // Organizer
                        if let profile = event.profile {
                            organizerView(profile: profile)
                        }
                        
                        // School
                        if let school = event.school {
                            schoolView(school: school)
                        }
                        
                        // Action Button
                        if let url = event.url {
                            actionButtonView(url: url)
                        }
                    }
                    .padding(24)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await loadEventDetails()
            }
            .sheet(isPresented: $showingAuthSheet) {
                AuthView()
            }
        }
    }
    
    // MARK: - Image Gallery
    private func imageGalleryView(images: [PostImage]) -> some View {
        Group {
            if images.count == 1 {
                AsyncImage(url: URL(string: supabaseManager.getPostImageUrl(filePath: images[0].filePath))) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(ProgressView())
                }
                .frame(height: 300)
                .clipped()
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(Array(images.enumerated()), id: \.offset) { index, image in
                            AsyncImage(url: URL(string: supabaseManager.getPostImageUrl(filePath: image.filePath))) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .overlay(ProgressView())
                            }
                            .frame(width: 250, height: 300)
                            .clipped()
                        }
                    }
                }
                .frame(height: 300)
                .overlay(
                    // Photo count badge
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Text("\(images.count) photos")
                                .font(.caption)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(12)
                                .padding()
                        }
                    }
                )
            }
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                Text(event.name)
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                Spacer()
                
                if attendeeCount > 0 {
                    HStack(spacing: 6) {
                        Image(systemName: "person.2")
                            .font(.caption)
                        Text("\(attendeeCount) attending")
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                }
            }
            
            // Date and Time
            if let startDatetime = event.startDatetime {
                HStack(spacing: 12) {
                    Image(systemName: "calendar")
                        .foregroundColor(.green)
                        .font(.title3)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(DateFormatter.fullEventDate.string(from: ISO8601DateFormatter().date(from: startDatetime) ?? Date()))
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        if !event.isAllDay {
                            HStack(spacing: 6) {
                                Image(systemName: "clock")
                                    .font(.caption)
                                
                                Text(event.formattedTime)
                                
                                if let endDatetime = event.endDatetime {
                                    Text("- \(DateFormatter.eventTime.string(from: ISO8601DateFormatter().date(from: endDatetime) ?? Date()))")
                                }
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                        } else {
                            Text("All day event")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            // Location
            if let locationName = event.locationName {
                HStack(spacing: 12) {
                    Image(systemName: "location")
                        .foregroundColor(.green)
                        .font(.title3)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(locationName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        if let address = event.address {
                            Text(address)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - RSVP Section
    private var rsvpSectionView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Interested in attending?")
                .font(.headline)
                .fontWeight(.semibold)
            
            Text(rsvpDescriptionText)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Button(action: {
                if authManager.isAuthenticated {
                    handleRSVP()
                } else {
                    showingAuthSheet = true
                }
            }) {
                HStack(spacing: 8) {
                    if isLoadingRSVP {
                        ProgressView()
                            .scaleEffect(0.8)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Image(systemName: isRSVPed ? "checkmark.circle" : "person.2")
                    }
                    
                    Text(rsvpButtonText)
                        .fontWeight(.medium)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(isRSVPed ? Color.green : Color.blue)
                .cornerRadius(25)
            }
            .disabled(isLoadingRSVP)
        }
        .padding(16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    // MARK: - Categories
    private var categoriesView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(event.categories, id: \.category.id) { categoryWrapper in
                    CategoryTag(name: categoryWrapper.category.name, color: .green)
                }
                
                CategoryTag(name: event.type.displayName, color: .orange)
            }
            .padding(.horizontal, 1)
        }
    }
    
    // MARK: - Description
    private func descriptionView(description: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About this event")
                .font(.headline)
                .fontWeight(.semibold)
            
            Text(description)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineSpacing(4)
        }
    }
    
    // MARK: - Tags
    private var tagsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tags")
                .font(.headline)
                .fontWeight(.semibold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(event.tags, id: \.tag) { tagWrapper in
                        Text("#\(tagWrapper.tag)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                }
                .padding(.horizontal, 1)
            }
        }
    }
    
    // MARK: - Organizer
    private func organizerView(profile: Profile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Organized by")
                .font(.headline)
                .fontWeight(.semibold)
            
            HStack(spacing: 12) {
                AsyncImage(url: URL(string: supabaseManager.getProfilePicUrl(username: profile.username))) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("@\(profile.username)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    if let bio = profile.bio {
                        Text(bio)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                }
                
                Spacer()
            }
        }
    }
    
    // MARK: - School
    private func schoolView(school: School) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("School")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(school.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let address = school.address {
                    Text(address)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    // MARK: - Action Button
    private func actionButtonView(url: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Divider()
            
            Link(destination: URL(string: url)!) {
                HStack(spacing: 12) {
                    Text("Learn More")
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Image(systemName: "arrow.up.right")
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(
                    LinearGradient(
                        colors: [.green, .orange],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
            }
        }
    }
    
    // MARK: - Computed Properties
    private var rsvpDescriptionText: String {
        if let user = authManager.user {
            return isRSVPed ? "You're attending this event" : "Let organizers know you're coming"
        } else {
            return "Sign in to RSVP and get updates"
        }
    }
    
    private var rsvpButtonText: String {
        if isLoadingRSVP {
            return "..."
        } else if let user = authManager.user {
            return isRSVPed ? "Attending" : "RSVP"
        } else {
            return "Sign In to RSVP"
        }
    }
    
    // MARK: - Methods
    private func loadEventDetails() async {
        await checkRSVPStatus()
        // TODO: Load attendee count
    }
    
    private func checkRSVPStatus() async {
        guard authManager.isAuthenticated, let user = authManager.user else {
            return
        }
        
        do {
            let status = try await supabaseManager.checkRsvpStatus(eventId: event.id, userId: user.id)
            await MainActor.run {
                isRSVPed = status
            }
        } catch {
            print("Error checking RSVP status: \(error)")
        }
    }
    
    private func handleRSVP() {
        guard let user = authManager.user else { return }
        
        Task {
            isLoadingRSVP = true
            defer { isLoadingRSVP = false }
            
            do {
                let response: RSVPResponse
                if isRSVPed {
                    response = try await supabaseManager.cancelRsvp(eventId: event.id, userId: user.id)
                } else {
                    response = try await supabaseManager.rsvpToEvent(eventId: event.id, userId: user.id)
                }
                
                if response.success {
                    await MainActor.run {
                        isRSVPed.toggle()
                        attendeeCount += isRSVPed ? 1 : -1
                    }
                } else {
                    print("RSVP failed: \(response.error ?? "Unknown error")")
                }
            } catch {
                print("RSVP error: \(error)")
            }
        }
    }
}

#Preview {
    let sampleEvent = Event(
        id: "1",
        name: "Sample Event with a Really Long Name That Should Wrap",
        startDatetime: "2024-01-15T18:00:00Z",
        endDatetime: "2024-01-15T20:00:00Z",
        locationName: "School Auditorium",
        address: "123 School St, City, State 12345",
        description: "This is a sample event description that provides more details about what will happen at this event. It includes multiple lines of text to show how the description will be displayed in the detail view.",
        isAllDay: false,
        type: .inPerson,
        url: "https://example.com",
        status: .active,
        categories: [
            EventCategory(category: Category(id: "1", name: "academic")),
            EventCategory(category: Category(id: "2", name: "social"))
        ],
        tags: [
            EventTag(tag: "important"),
            EventTag(tag: "required"),
            EventTag(tag: "fun")
        ],
        profile: Profile(username: "sample_user", profilePicUrl: nil, bio: "Event organizer and student leader"),
        school: School(name: "Patrick Henry High School", address: "123 School St, City, State"),
        postImages: nil
    )
    
    return EventDetailView(event: sampleEvent)
        .environmentObject(AuthManager.shared)
        .environmentObject(SupabaseManager.shared)
}