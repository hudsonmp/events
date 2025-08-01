import SwiftUI

struct EventCard: View {
    let event: Event
    let onTap: () -> Void
    let onAuthRequired: () -> Void
    
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    
    @State private var isRSVPed = false
    @State private var isLoadingRSVP = false
    @State private var isCheckingRSVP = false
    
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
                        .overlay(
                            ProgressView()
                        )
                }
                .frame(height: 160)
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
                
                // Description
                if let description = event.description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                        .padding(.top, 4)
                }
                
                // Categories and Type
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        // Categories
                        ForEach(event.categories, id: \.category.id) { categoryWrapper in
                            CategoryTag(name: categoryWrapper.category.name, color: .green)
                        }
                        
                        // Event Type
                        CategoryTag(name: event.type.displayName, color: .orange)
                    }
                    .padding(.horizontal, 1) // Prevent clipping
                }
                .padding(.top, 8)
                
                // Bottom Row: Organizer and RSVP
                HStack {
                    // Organizer
                    if let profile = event.profile {
                        HStack(spacing: 8) {
                            AsyncImage(url: URL(string: supabaseManager.getProfilePicUrl(username: profile.username))) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Circle()
                                    .fill(Color.gray.opacity(0.3))
                            }
                            .frame(width: 24, height: 24)
                            .clipShape(Circle())
                            
                            Text("@\(profile.username)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    // RSVP Button
                    RSVPButton(
                        isRSVPed: isRSVPed,
                        isLoading: isLoadingRSVP || isCheckingRSVP,
                        isAuthenticated: authManager.isAuthenticated
                    ) {
                        handleRSVP()
                    }
                }
                .padding(.top, 8)
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
        .task {
            await checkRSVPStatus()
        }
    }
    
    // MARK: - RSVP Methods
    private func handleRSVP() {
        guard authManager.isAuthenticated, let user = authManager.user else {
            onAuthRequired()
            return
        }
        
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
                    }
                } else {
                    print("RSVP failed: \(response.error ?? "Unknown error")")
                }
            } catch {
                print("RSVP error: \(error)")
            }
        }
    }
    
    private func checkRSVPStatus() async {
        guard authManager.isAuthenticated, let user = authManager.user else {
            return
        }
        
        isCheckingRSVP = true
        defer { isCheckingRSVP = false }
        
        do {
            let status = try await supabaseManager.checkRsvpStatus(eventId: event.id, userId: user.id)
            await MainActor.run {
                isRSVPed = status
            }
        } catch {
            print("Error checking RSVP status: \(error)")
        }
    }
}

// MARK: - Category Tag
struct CategoryTag: View {
    let name: String
    let color: Color
    
    var body: some View {
        Text(name.capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundColor(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .cornerRadius(12)
    }
}

// MARK: - RSVP Button
struct RSVPButton: View {
    let isRSVPed: Bool
    let isLoading: Bool
    let isAuthenticated: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                        .progressViewStyle(CircularProgressViewStyle(tint: isRSVPed ? .green : .white))
                } else {
                    Image(systemName: "checkmark.circle")
                        .font(.caption)
                }
                
                Text(buttonText)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(isRSVPed ? .green : .white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isRSVPed ? Color.clear : Color.green)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.green, lineWidth: isRSVPed ? 1 : 0)
            )
            .cornerRadius(16)
        }
        .disabled(isLoading)
        .buttonStyle(PlainButtonStyle())
    }
    
    private var buttonText: String {
        if isLoading {
            return "Loading..."
        } else if !isAuthenticated {
            return "RSVP"
        } else {
            return isRSVPed ? "RSVP'd" : "RSVP"
        }
    }
}

#Preview {
    let sampleEvent = Event(
        id: "1",
        name: "Sample Event",
        startDatetime: "2024-01-15T18:00:00Z",
        endDatetime: nil,
        locationName: "School Auditorium",
        address: nil,
        description: "This is a sample event description that shows how the card will look with some content.",
        isAllDay: false,
        type: .inPerson,
        url: nil,
        status: .active,
        categories: [EventCategory(category: Category(id: "1", name: "academic"))],
        tags: [],
        profile: Profile(username: "sample_user", profilePicUrl: nil, bio: nil),
        school: nil,
        postImages: nil
    )
    
    return EventCard(
        event: sampleEvent,
        onTap: {},
        onAuthRequired: {}
    )
    .environmentObject(AuthManager.shared)
    .environmentObject(SupabaseManager.shared)
    .padding()
}