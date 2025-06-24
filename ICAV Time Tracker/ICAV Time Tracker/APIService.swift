//
//  APIService.swift
//  ICAV Time Tracker
//
//  Network service for communicating with Vercel backend
//

import Foundation

// MARK: - API Models
struct APITimeEntry: Codable {
    let id: String?
    let userId: String
    let technicianName: String
    let customerName: String
    let clockInTime: String
    let clockOutTime: String?
    let lunchStartTime: String?
    let lunchEndTime: String?
}

struct APIUser: Codable {
    let id: String
    let username: String
    let displayName: String
    let email: String?
    let role: String
    let isActive: Bool?
    let lastLogin: String?
}

struct AuthResponse: Codable {
    let user: APIUser
    let token: String
    let expiresAt: String
}

struct LoginRequest: Codable {
    let action: String
    let username: String
    let password: String
}

struct AuthRequest: Codable {
    let action: String
    let sessionToken: String?
}

// MARK: - Network Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case invalidResponse
    case unauthorized
    case serverError(String)
    case networkUnavailable
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .invalidResponse:
            return "Invalid response format"
        case .unauthorized:
            return "Authentication failed"
        case .serverError(let message):
            return "Server error: \(message)"
        case .networkUnavailable:
            return "Network unavailable"
        }
    }
}

// MARK: - API Service
@MainActor
class APIService: ObservableObject {
    static let shared = APIService()
    
    // TODO: Replace with your actual Vercel deployment URL
    private let baseURL = "https://icav-time-server.vercel.app"
    
    @Published var isOnline = true
    @Published var lastSyncDate: Date?
    
    private let session = URLSession.shared
    private let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    private init() {
        checkConnectivity()
    }
    
    // MARK: - Connectivity
    private func checkConnectivity() {
        // Simple connectivity check - you could enhance this with Network framework
        Task {
            do {
                let url = URL(string: "\(baseURL)/api/health")!
                let (_, response) = try await session.data(from: url)
                if let httpResponse = response as? HTTPURLResponse {
                    await MainActor.run {
                        self.isOnline = httpResponse.statusCode == 200
                    }
                }
            } catch {
                await MainActor.run {
                    self.isOnline = false
                }
            }
        }
    }
    
    // MARK: - Authentication
    func login(username: String, password: String) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/api/auth") else {
            throw APIError.invalidURL
        }
        
        let loginRequest = LoginRequest(
            action: "login",
            username: username,
            password: password
        )
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(loginRequest)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let errorMessage = errorData["error"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.serverError("Login failed")
        }
        
        do {
            let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
            await MainActor.run {
                self.isOnline = true
            }
            return authResponse
        } catch {
            throw APIError.invalidResponse
        }
    }
    
    func verifySession(token: String) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/api/auth") else {
            throw APIError.invalidURL
        }
        
        let authRequest = AuthRequest(action: "verify", sessionToken: token)
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(authRequest)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.unauthorized
        }
        
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }
    
    func logout(token: String) async throws {
        guard let url = URL(string: "\(baseURL)/api/auth") else {
            throw APIError.invalidURL
        }
        
        let logoutRequest = AuthRequest(action: "logout", sessionToken: token)
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(logoutRequest)
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError("Logout failed")
        }
    }
    
    // MARK: - Time Entries
    func fetchTimeEntries(token: String) async throws -> [APITimeEntry] {
        guard let url = URL(string: "\(baseURL)/api/time-entries") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError("Failed to fetch time entries")
        }
        
        let entries = try JSONDecoder().decode([APITimeEntry].self, from: data)
        await MainActor.run {
            self.lastSyncDate = Date()
            self.isOnline = true
        }
        return entries
    }
    
    func submitTimeEntry(_ entry: TimeEntry, token: String) async throws -> APITimeEntry {
        guard let url = URL(string: "\(baseURL)/api/time-entries") else {
            throw APIError.invalidURL
        }
        
        let apiEntry = APITimeEntry(
            id: nil, // Server will generate
            userId: entry.userId,
            technicianName: entry.technicianName,
            customerName: entry.customerName,
            clockInTime: dateFormatter.string(from: entry.clockInTime),
            clockOutTime: entry.clockOutTime.map { dateFormatter.string(from: $0) },
            lunchStartTime: entry.lunchStartTime.map { dateFormatter.string(from: $0) },
            lunchEndTime: entry.lunchEndTime.map { dateFormatter.string(from: $0) }
        )
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(apiEntry)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 201 else {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let errorMessage = errorData["error"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.serverError("Failed to submit time entry")
        }
        
        let submittedEntry = try JSONDecoder().decode(APITimeEntry.self, from: data)
        await MainActor.run {
            self.isOnline = true
        }
        return submittedEntry
    }
    
    // MARK: - Batch Operations
    func submitPendingEntries(_ entries: [TimeEntry], token: String) async -> [Result<APITimeEntry, Error>] {
        var results: [Result<APITimeEntry, Error>] = []
        
        for entry in entries {
            do {
                let submittedEntry = try await submitTimeEntry(entry, token: token)
                results.append(.success(submittedEntry))
            } catch {
                results.append(.failure(error))
            }
        }
        
        return results
    }
    
    // MARK: - Utility Methods
    func convertToTimeEntry(_ apiEntry: APITimeEntry) -> TimeEntry? {
        guard let clockInDate = dateFormatter.date(from: apiEntry.clockInTime) else {
            return nil
        }
        
        var timeEntry = TimeEntry(
            userId: apiEntry.userId,
            technicianName: apiEntry.technicianName,
            customerName: apiEntry.customerName,
            clockInTime: clockInDate
        )
        
        if let clockOutString = apiEntry.clockOutTime {
            timeEntry.clockOutTime = dateFormatter.date(from: clockOutString)
        }
        
        if let lunchStartString = apiEntry.lunchStartTime {
            timeEntry.lunchStartTime = dateFormatter.date(from: lunchStartString)
        }
        
        if let lunchEndString = apiEntry.lunchEndTime {
            timeEntry.lunchEndTime = dateFormatter.date(from: lunchEndString)
        }
        
        return timeEntry
    }
    
    func convertToUser(_ apiUser: APIUser) -> User {
        return User(
            id: apiUser.id,
            username: apiUser.username,
            displayName: apiUser.displayName,
            role: apiUser.role
        )
    }
} 
