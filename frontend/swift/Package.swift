// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PHHS Events",
    platforms: [
        .iOS(.v16)
    ],
    dependencies: [
        // Add Supabase Swift SDK when available
        // .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
        
        // Add Google Sign-In SDK when needed
        // .package(url: "https://github.com/google/GoogleSignIn-iOS", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "PHHS Events",
            dependencies: [
                // "Supabase",
                // "GoogleSignIn"
            ]
        )
    ]
)