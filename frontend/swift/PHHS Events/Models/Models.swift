import Foundation

// MARK: - Event Model
struct Event: Codable, Identifiable {
    let id: String
    let name: String
    let startDatetime: String?
    let endDatetime: String?
    let locationName: String?
    let address: String?
    let description: String?
    let isAllDay: Bool
    let type: EventType
    let url: String?
    let status: EventStatus
    let categories: [EventCategory]
    let tags: [EventTag]
    let profile: Profile?
    let school: School?
    let postImages: PostImages?
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, url, status, categories, tags, profile, school, type, address
        case startDatetime = "start_datetime"
        case endDatetime = "end_datetime"
        case locationName = "location_name"
        case isAllDay = "is_all_day"
        case postImages = "post_images"
    }
}

// MARK: - Event Type
enum EventType: String, Codable, CaseIterable {
    case inPerson = "in-person"
    case virtual = "virtual"
    case hybrid = "hybrid"
    
    var displayName: String {
        switch self {
        case .inPerson: return "In Person"
        case .virtual: return "Virtual"
        case .hybrid: return "Hybrid"
        }
    }
}

// MARK: - Event Status
enum EventStatus: String, Codable {
    case active = "active"
    case draft = "draft"
}

// MARK: - Event Category
struct EventCategory: Codable {
    let category: Category
}

struct Category: Codable, Identifiable {
    let id: String
    let name: String
}

// MARK: - Event Tag
struct EventTag: Codable {
    let tag: String
}

// MARK: - Profile
struct Profile: Codable {
    let username: String
    let profilePicUrl: String?
    let bio: String?
    
    enum CodingKeys: String, CodingKey {
        case username, bio
        case profilePicUrl = "profile_pic_url"
    }
}

// MARK: - School
struct School: Codable {
    let name: String
    let address: String?
}

// MARK: - Post Images
struct PostImages: Codable {
    let postImages: [PostImage]
    
    enum CodingKeys: String, CodingKey {
        case postImages = "post_images"
    }
}

struct PostImage: Codable {
    let filePath: String
    
    enum CodingKeys: String, CodingKey {
        case filePath = "file_path"
    }
}

// MARK: - User Model
struct User: Codable, Identifiable {
    let id: String
    let email: String?
    let userMetadata: UserMetadata?
    
    enum CodingKeys: String, CodingKey {
        case id, email
        case userMetadata = "user_metadata"
    }
}

struct UserMetadata: Codable {
    let fullName: String?
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - Popular Event
struct PopularEvent: Codable, Identifiable {
    let eventId: String
    let eventName: String
    let startDatetime: String?
    let tagCount: Int
    let postImages: [PostImage]?
    
    var id: String { eventId }
    
    enum CodingKeys: String, CodingKey {
        case eventId = "event_id"
        case eventName = "event_name"
        case startDatetime = "start_datetime"
        case tagCount = "tag_count"
        case postImages = "post_images"
    }
}

// MARK: - Categories
struct Categories {
    static let all = [
        "academic",
        "athletics",
        "arts",
        "community service",
        "clubs",
        "social",
        "fundraising",
        "career",
        "health & wellness",
        "technology",
        "cultural",
        "environmental",
        "leadership",
        "competition",
        "workshop"
    ]
}

// MARK: - Auth Response
struct AuthResponse: Codable {
    let user: User?
    let error: AuthError?
}

struct AuthError: Codable {
    let message: String
}

// MARK: - RSVP Response
struct RSVPResponse: Codable {
    let success: Bool
    let error: String?
}

// MARK: - Event Response
struct EventResponse: Codable {
    let data: [Event]?
    let error: String?
}

// MARK: - Date Extensions
extension Event {
    var formattedDate: String {
        guard let dateString = startDatetime else { return "Date TBD" }
        return DateFormatter.eventDate.string(from: ISO8601DateFormatter().date(from: dateString) ?? Date())
    }
    
    var formattedTime: String {
        guard let dateString = startDatetime, !isAllDay else { return "" }
        return DateFormatter.eventTime.string(from: ISO8601DateFormatter().date(from: dateString) ?? Date())
    }
    
    var isUpcoming: Bool {
        guard let dateString = startDatetime else { return false }
        return ISO8601DateFormatter().date(from: dateString) ?? Date() >= Date()
    }
}

// MARK: - Date Formatters
extension DateFormatter {
    static let eventDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        return formatter
    }()
    
    static let eventTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }()
    
    static let fullEventDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter
    }()
}