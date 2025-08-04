import Foundation
import Combine
import AuthenticationServices

class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()
    
    @Published var user: User?
    @Published var isLoading = false
    @Published var isAuthenticated = false
    
    private var cancellables = Set<AnyCancellable>()
    private let supabaseManager = SupabaseManager.shared
    
    override init() {
        super.init()
        checkAuthStatus()
    }
    
    // MARK: - Auth Status
    
    private func checkAuthStatus() {
        // Check if user is stored in UserDefaults or Keychain
        if let userData = UserDefaults.standard.data(forKey: "currentUser"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            self.user = user
            self.isAuthenticated = true
        }
    }
    
    // MARK: - Email Authentication
    
    func signInWithEmail(email: String, password: String) async -> AuthResponse {
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Make API call to Supabase auth
            let url = URL(string: "\(supabaseManager.supabaseURL)/auth/v1/token?grant_type=password")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(supabaseManager.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = [
                "email": email,
                "password": password
            ]
            
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                // Parse response and set user
                let authData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                if let userData = authData?["user"] as? [String: Any] {
                    let user = try parseUser(from: userData)
                    await MainActor.run {
                        self.user = user
                        self.isAuthenticated = true
                        self.saveUser(user)
                    }
                    return AuthResponse(user: user, error: nil)
                }
            }
            
            return AuthResponse(user: nil, error: AuthError(message: "Invalid credentials"))
            
        } catch {
            return AuthResponse(user: nil, error: AuthError(message: error.localizedDescription))
        }
    }
    
    func signUpWithEmail(email: String, password: String) async -> AuthResponse {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let url = URL(string: "\(supabaseManager.supabaseURL)/auth/v1/signup")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(supabaseManager.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = [
                "email": email,
                "password": password
            ]
            
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                let authData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                if let userData = authData?["user"] as? [String: Any] {
                    let user = try parseUser(from: userData)
                    await MainActor.run {
                        self.user = user
                        self.isAuthenticated = true
                        self.saveUser(user)
                    }
                    return AuthResponse(user: user, error: nil)
                }
            }
            
            return AuthResponse(user: nil, error: AuthError(message: "Failed to create account"))
            
        } catch {
            return AuthResponse(user: nil, error: AuthError(message: error.localizedDescription))
        }
    }
    
    // MARK: - Google OAuth
    
    func signInWithGoogle() async -> AuthResponse {
        isLoading = true
        defer { isLoading = false }
        
        // This would require Google Sign-In SDK
        // For now, return a placeholder
        return AuthResponse(user: nil, error: AuthError(message: "Google Sign-In not implemented yet"))
    }
    
    // MARK: - Sign Out
    
    func signOut() async -> AuthResponse {
        do {
            let url = URL(string: "\(supabaseManager.supabaseURL)/auth/v1/logout")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(supabaseManager.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
            
            let (_, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 204 {
                await MainActor.run {
                    self.user = nil
                    self.isAuthenticated = false
                    self.clearUser()
                }
                return AuthResponse(user: nil, error: nil)
            }
            
            return AuthResponse(user: nil, error: AuthError(message: "Failed to sign out"))
            
        } catch {
            return AuthResponse(user: nil, error: AuthError(message: error.localizedDescription))
        }
    }
    
    // MARK: - User Persistence
    
    private func saveUser(_ user: User) {
        if let userData = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(userData, forKey: "currentUser")
        }
    }
    
    private func clearUser() {
        UserDefaults.standard.removeObject(forKey: "currentUser")
    }
    
    // MARK: - Helper Methods
    
    private func parseUser(from userData: [String: Any]) throws -> User {
        let id = userData["id"] as? String ?? ""
        let email = userData["email"] as? String
        
        var userMetadata: UserMetadata?
        if let metadataDict = userData["user_metadata"] as? [String: Any] {
            let fullName = metadataDict["full_name"] as? String
            let avatarUrl = metadataDict["avatar_url"] as? String
            userMetadata = UserMetadata(fullName: fullName, avatarUrl: avatarUrl)
        }
        
        return User(id: id, email: email, userMetadata: userMetadata)
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension AuthManager: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return ASPresentationAnchor()
    }
}