import SwiftUI

struct AuthView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthManager
    
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background Gradient
                LinearGradient(
                    colors: [
                        Color.green.opacity(0.8),
                        Color.green.opacity(0.6),
                        Color.orange.opacity(0.6)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Header
                        VStack(spacing: 16) {
                            Text("Welcome to PHHS Events")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.white, Color.orange.opacity(0.9)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 40)
                        
                        // Tab Selection
                        VStack(spacing: 0) {
                            HStack(spacing: 0) {
                                TabButton(
                                    title: "Sign In",
                                    isSelected: !isSignUp,
                                    action: {
                                        isSignUp = false
                                        clearForm()
                                    }
                                )
                                
                                TabButton(
                                    title: "Sign Up",
                                    isSelected: isSignUp,
                                    action: {
                                        isSignUp = true
                                        clearForm()
                                    }
                                )
                            }
                            .background(Color.black.opacity(0.2))
                            .cornerRadius(25, corners: [.topLeft, .topRight])
                            
                            // Form Content
                            VStack(spacing: 20) {
                                // Email Field
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Email")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white.opacity(0.9))
                                    
                                    TextField("your@email.com", text: $email)
                                        .textFieldStyle(AuthTextFieldStyle())
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .disabled(isLoading)
                                }
                                
                                // Password Field
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Password")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white.opacity(0.9))
                                    
                                    HStack {
                                        Group {
                                            if showPassword {
                                                TextField(isSignUp ? "Create a password (min. 6 characters)" : "Enter your password", text: $password)
                                            } else {
                                                SecureField(isSignUp ? "Create a password (min. 6 characters)" : "Enter your password", text: $password)
                                            }
                                        }
                                        .disabled(isLoading)
                                        
                                        Button(action: {
                                            showPassword.toggle()
                                        }) {
                                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                                .foregroundColor(.white.opacity(0.7))
                                        }
                                        .disabled(isLoading)
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .background(Color.black.opacity(0.2))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                    )
                                    .cornerRadius(10)
                                }
                                
                                // Error Message
                                if let errorMessage = errorMessage {
                                    Text(errorMessage)
                                        .font(.caption)
                                        .foregroundColor(.red.opacity(0.9))
                                        .padding(.horizontal)
                                        .multilineTextAlignment(.center)
                                }
                                
                                // Submit Button
                                Button(action: handleEmailAuth) {
                                    HStack(spacing: 8) {
                                        if isLoading {
                                            ProgressView()
                                                .scaleEffect(0.8)
                                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        }
                                        
                                        Text(isLoading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Create Account" : "Sign In"))
                                            .fontWeight(.medium)
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(
                                        LinearGradient(
                                            colors: [.green, .orange],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .cornerRadius(10)
                                    .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                                }
                                .disabled(isLoading || email.isEmpty || password.isEmpty)
                                
                                // Divider
                                HStack {
                                    Rectangle()
                                        .frame(height: 1)
                                        .foregroundColor(.white.opacity(0.3))
                                    
                                    Text("Or continue with")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.8))
                                        .padding(.horizontal, 12)
                                    
                                    Rectangle()
                                        .frame(height: 1)
                                        .foregroundColor(.white.opacity(0.3))
                                }
                                
                                // Google Sign In Button
                                Button(action: handleGoogleAuth) {
                                    HStack(spacing: 12) {
                                        Image(systemName: "globe")
                                            .font(.title3)
                                        
                                        Text("Continue with Google")
                                            .fontWeight(.medium)
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Color.white.opacity(0.1))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                    )
                                    .cornerRadius(10)
                                }
                                .disabled(isLoading)
                            }
                            .padding(24)
                            .background(Color.black.opacity(0.2))
                            .cornerRadius(25, corners: [.bottomLeft, .bottomRight])
                        }
                        .background(Color.black.opacity(0.2))
                        .cornerRadius(25)
                        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                        
                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, 24)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
        }
    }
    
    // MARK: - Methods
    private func handleEmailAuth() {
        guard !email.isEmpty && !password.isEmpty else { return }
        
        errorMessage = nil
        isLoading = true
        
        Task {
            let response: AuthResponse
            if isSignUp {
                response = await authManager.signUpWithEmail(email: email, password: password)
            } else {
                response = await authManager.signInWithEmail(email: email, password: password)
            }
            
            await MainActor.run {
                isLoading = false
                
                if let error = response.error {
                    errorMessage = error.message
                } else {
                    // Success - dismiss the sheet
                    dismiss()
                }
            }
        }
    }
    
    private func handleGoogleAuth() {
        isLoading = true
        
        Task {
            let response = await authManager.signInWithGoogle()
            
            await MainActor.run {
                isLoading = false
                
                if let error = response.error {
                    errorMessage = error.message
                } else {
                    // Success - dismiss the sheet
                    dismiss()
                }
            }
        }
    }
    
    private func clearForm() {
        email = ""
        password = ""
        showPassword = false
        errorMessage = nil
    }
}

// MARK: - Tab Button
struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    isSelected ? 
                    LinearGradient(colors: [.green, .orange], startPoint: .leading, endPoint: .trailing) :
                    Color.clear
                )
                .overlay(
                    Rectangle()
                        .stroke(Color.white.opacity(0.3), lineWidth: isSelected ? 0 : 1)
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Auth Text Field Style
struct AuthTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.black.opacity(0.2))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(10)
            .foregroundColor(.white)
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

#Preview {
    AuthView()
        .environmentObject(AuthManager.shared)
}