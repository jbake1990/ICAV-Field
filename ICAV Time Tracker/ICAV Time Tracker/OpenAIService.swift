import Foundation

@MainActor
class OpenAIService: ObservableObject {
    
    // Use server endpoint instead of direct OpenAI API
    private let serverURL = Config.serverURL
    private let authManager = AuthManager.shared
    
    @Published var isLoading = false
    @Published var errorMessage = ""
    
    struct ServerAIResponse: Codable {
        let summary: String
    }
    
    struct JobSummary {
        let customerName: String
        let workDescription: String
        let followUpSteps: String
        let fullSummary: String
    }
    
    func summarizeJobNotes(_ notes: String, customerName: String = "") async throws -> JobSummary {
        guard !notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw OpenAIError.emptyNotes
        }
        
        guard authManager.authToken != nil else {
            throw OpenAIError.notAuthenticated
        }
        
        isLoading = true
        errorMessage = ""
        
        defer {
            isLoading = false
        }
        
        do {
            let summary = try await performServerSummarization(notes: notes, customerName: customerName)
            return summary
        } catch {
            let errorMsg = "Failed to generate summary: \(error.localizedDescription)"
            errorMessage = errorMsg
            throw error
        }
    }
    
    private func performServerSummarization(notes: String, customerName: String) async throws -> JobSummary {
        guard let url = URL(string: "\(serverURL)/api/ai-summary") else {
            throw OpenAIError.invalidURL
        }
        
        guard let authToken = authManager.authToken else {
            throw OpenAIError.notAuthenticated
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = [
            "notes": notes,
            "customerName": customerName
        ]
        
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw OpenAIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = errorData["error"] as? String {
                throw OpenAIError.apiError(error)
            }
            throw OpenAIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        let serverResponse = try decoder.decode(ServerAIResponse.self, from: data)
        
        return parseSummaryResponse(serverResponse.summary)
    }
    

    
    private func parseSummaryResponse(_ content: String) -> JobSummary {
        let lines = content.components(separatedBy: .newlines)
        var customerName = "Not specified"
        var workDescription = "No description provided"
        var followUpSteps = "None"
        var additionalNotes = ""
        var currentSection = ""
        var tempContent = ""
        
        for line in lines {
            let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
            
            if trimmedLine.lowercased().contains("**customer info:**") {
                if !tempContent.isEmpty && !currentSection.isEmpty {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "customer"
                tempContent = extractValue(from: trimmedLine, after: "customer info:")
            } else if trimmedLine.lowercased().contains("**work summary:**") {
                if !tempContent.isEmpty && !currentSection.isEmpty {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "work"
                tempContent = extractValue(from: trimmedLine, after: "work summary:")
            } else if trimmedLine.lowercased().contains("**to-do/follow up:**") {
                if !tempContent.isEmpty && !currentSection.isEmpty {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "followup"
                tempContent = extractValue(from: trimmedLine, after: "to-do/follow up:")
            } else if !trimmedLine.isEmpty && !currentSection.isEmpty {
                tempContent += "\n" + trimmedLine
            }
        }
        
        // Handle the last section
        if !tempContent.isEmpty && !currentSection.isEmpty {
            assignContent(section: currentSection, content: tempContent, 
                        customerName: &customerName, workDescription: &workDescription, 
                        followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
        }
        
        return JobSummary(
            customerName: customerName,
            workDescription: workDescription,
            followUpSteps: followUpSteps,
            fullSummary: content
        )
    }
    
    private func assignContent(section: String, content: String, 
                             customerName: inout String, workDescription: inout String, 
                             followUpSteps: inout String, additionalNotes: inout String) {
        let cleanContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        switch section {
        case "customer":
            customerName = cleanContent.isEmpty ? "Not specified" : cleanContent
        case "work":
            workDescription = cleanContent.isEmpty ? "No description provided" : cleanContent
        case "followup":
            followUpSteps = cleanContent.isEmpty ? "None" : cleanContent
        case "additional":
            additionalNotes = cleanContent
        default:
            break
        }
    }
    
    private func extractValue(from line: String, after delimiter: String) -> String {
        guard let range = line.lowercased().range(of: delimiter.lowercased()) else {
            return line.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        
        let value = String(line[range.upperBound...])
        return value.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "**", with: "")
            .replacingOccurrences(of: "*", with: "")
    }
    
    func clearError() {
        errorMessage = ""
    }
}

enum OpenAIError: LocalizedError {
    case notAuthenticated
    case emptyNotes
    case invalidURL
    case invalidResponse
    case noResponse
    case httpError(Int)
    case apiError(String)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be logged in to generate AI summaries."
        case .emptyNotes:
            return "Please enter some job notes before generating a summary."
        case .invalidURL:
            return "Invalid API endpoint configuration."
        case .invalidResponse:
            return "Invalid response from server."
        case .noResponse:
            return "No response received from server."
        case .httpError(let code):
            return "API request failed with status code \(code)."
        case .apiError(let message):
            return "Server Error: \(message)"
        }
    }
} 