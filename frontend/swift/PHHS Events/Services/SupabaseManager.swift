import Foundation
import Combine

// Note: You'll need to add Supabase Swift SDK via Swift Package Manager
// URL: https://github.com/supabase/supabase-swift

class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    
    // Replace with your actual Supabase URL and anon key
    private let supabaseURL = ProcessInfo.processInfo.environment["NEXT_PUBLIC_SUPABASE_PROJECT_URL"] ?? "YOUR_SUPABASE_URL"
    private let supabaseAnonKey = ProcessInfo.processInfo.environment["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "YOUR_SUPABASE_ANON_KEY"
    
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        // Initialize Supabase client when Swift SDK is added
    }
    
    // MARK: - Events API
    
    func fetchEvents(searchQuery: String = "", category: String? = nil) async throws -> [Event] {
        var urlComponents = URLComponents(string: "\(supabaseURL)/rest/v1/events")!
        
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "select", value: """
                *,
                categories:event_categories(category:categories(id,name)),
                tags:event_tags(tag),
                profile:profiles(username,profile_pic_url,bio),
                school:schools(name,address),
                post_images:posts!post_id(post_images(file_path))
            """),
            URLQueryItem(name: "status", value: "eq.active"),
            URLQueryItem(name: "start_datetime", value: "gte.\(ISO8601DateFormatter().string(from: Date()))"),
            URLQueryItem(name: "order", value: "start_datetime.asc")
        ]
        
        if let category = category {
            queryItems.append(URLQueryItem(name: "categories.category.name", value: "eq.\(category)"))
        }
        
        if !searchQuery.isEmpty {
            queryItems.append(URLQueryItem(name: "or", value: "name.ilike.%\(searchQuery)%,description.ilike.%\(searchQuery)%,location_name.ilike.%\(searchQuery)%"))
        }
        
        urlComponents.queryItems = queryItems
        
        var request = URLRequest(url: urlComponents.url!)
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let events = try JSONDecoder().decode([Event].self, from: data)
        return events
    }
    
    func fetchUserEvents(userId: String) async throws -> (upcoming: [Event], past: [Event]) {
        let urlComponents = URLComponents(string: "\(supabaseURL)/rest/v1/event_attendees")!
        
        var request = URLRequest(url: urlComponents.url!)
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("user_id.eq.\(userId)", forHTTPHeaderField: "user_id")
        request.setValue("""
            event_id,
            events!inner(*,
                categories:event_categories(category:categories(id,name)),
                tags:event_tags(tag),
                profile:profiles(username,profile_pic_url,bio),
                school:schools(name,address),
                post_images:posts!post_id(post_images(file_path))
            )
        """, forHTTPHeaderField: "select")
        request.setValue("events.status.eq.active", forHTTPHeaderField: "events.status")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        // Parse the response and separate upcoming/past events
        // This is a simplified version - you'd need to handle the nested structure properly
        let events: [Event] = [] // Parse from response
        
        let now = Date()
        let upcoming = events.filter { event in
            guard let dateString = event.startDatetime else { return false }
            return ISO8601DateFormatter().date(from: dateString) ?? Date() >= now
        }.sorted { a, b in
            guard let dateA = a.startDatetime, let dateB = b.startDatetime else { return false }
            return ISO8601DateFormatter().date(from: dateA) ?? Date() < ISO8601DateFormatter().date(from: dateB) ?? Date()
        }
        
        let past = events.filter { event in
            guard let dateString = event.startDatetime else { return false }
            return ISO8601DateFormatter().date(from: dateString) ?? Date() < now
        }.sorted { a, b in
            guard let dateA = a.startDatetime, let dateB = b.startDatetime else { return false }
            return ISO8601DateFormatter().date(from: dateA) ?? Date() > ISO8601DateFormatter().date(from: dateB) ?? Date()
        }
        
        return (upcoming: upcoming, past: past)
    }
    
    // MARK: - RSVP API
    
    func rsvpToEvent(eventId: String, userId: String) async throws -> RSVPResponse {
        // First ensure user exists
        try await ensureUserExists(userId: userId)
        
        let url = URL(string: "\(supabaseURL)/rest/v1/event_attendees")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        
        let body = [
            "event_id": eventId,
            "user_id": userId
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 201 {
                return RSVPResponse(success: true, error: nil)
            } else {
                return RSVPResponse(success: false, error: "Failed to RSVP")
            }
        }
        
        return RSVPResponse(success: false, error: "Unknown error")
    }
    
    func cancelRsvp(eventId: String, userId: String) async throws -> RSVPResponse {
        let urlComponents = URLComponents(string: "\(supabaseURL)/rest/v1/event_attendees")!
        
        var request = URLRequest(url: urlComponents.url!)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("event_id.eq.\(eventId),user_id.eq.\(userId)", forHTTPHeaderField: "event_id,user_id")
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 204 {
                return RSVPResponse(success: true, error: nil)
            } else {
                return RSVPResponse(success: false, error: "Failed to cancel RSVP")
            }
        }
        
        return RSVPResponse(success: false, error: "Unknown error")
    }
    
    func checkRsvpStatus(eventId: String, userId: String) async throws -> Bool {
        let urlComponents = URLComponents(string: "\(supabaseURL)/rest/v1/event_attendees")!
        
        var request = URLRequest(url: urlComponents.url!)
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("event_id.eq.\(eventId),user_id.eq.\(userId)", forHTTPHeaderField: "event_id,user_id")
        request.setValue("exact", forHTTPHeaderField: "Prefer")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            return httpResponse.statusCode == 200 && !data.isEmpty
        }
        
        return false
    }
    
    // MARK: - User Management
    
    private func ensureUserExists(userId: String) async throws {
        let url = URL(string: "\(supabaseURL)/functions/v1/ensure-user")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["userId": userId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            throw NSError(domain: "SupabaseError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to ensure user exists"])
        }
    }
    
    // MARK: - Storage URLs
    
    func getStorageUrl(bucket: String, path: String) -> String {
        return "\(supabaseURL)/storage/v1/object/public/\(bucket)/\(path)"
    }
    
    func getProfilePicUrl(username: String) -> String {
        return getStorageUrl(bucket: "instagram-profile-pics", path: "\(username)/\(username)_profile.jpg")
    }
    
    func getPostImageUrl(filePath: String) -> String {
        return getStorageUrl(bucket: "instagram-posts", path: filePath)
    }
}