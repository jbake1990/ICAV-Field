import Foundation

@MainActor
class OpenAIService: ObservableObject {
    
    // Note: In production, this should be loaded from a secure configuration
    // For now, you'll need to set your OpenAI API key here
    private let apiKey = "YOUR_OPENAI_API_KEY_HERE"
    private let baseURL = "https://api.openai.com/v1/chat/completions"
    
    @Published var isLoading = false
    @Published var errorMessage = ""
    
    struct OpenAIResponse: Codable {
        let id: String
        let choices: [Choice]
        
        struct Choice: Codable {
            let message: Message
            
            struct Message: Codable {
                let content: String
            }
        }
    }
    
    struct OpenAIRequest: Codable {
        let model: String
        let messages: [Message]
        let maxTokens: Int
        let temperature: Double
        
        struct Message: Codable {
            let role: String
            let content: String
        }
        
        enum CodingKeys: String, CodingKey {
            case model, messages, temperature
            case maxTokens = "max_tokens"
        }
    }
    
    struct JobSummary {
        let customerName: String
        let workDescription: String
        let followUpSteps: String
        let fullSummary: String
    }
    
    func summarizeJobNotes(_ notes: String, customerName: String = "") async throws -> JobSummary {
        guard !apiKey.isEmpty && apiKey != "YOUR_OPENAI_API_KEY_HERE" else {
            throw OpenAIError.missingAPIKey
        }
        
        guard !notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw OpenAIError.emptyNotes
        }
        
        isLoading = true
        errorMessage = ""
        
        defer {
            isLoading = false
        }
        
        do {
            let summary = try await performSummarization(notes: notes, customerName: customerName)
            return summary
        } catch {
            let errorMsg = "Failed to generate summary: \(error.localizedDescription)"
            errorMessage = errorMsg
            throw error
        }
    }
    
    private func performSummarization(notes: String, customerName: String) async throws -> JobSummary {
        guard let url = URL(string: baseURL) else {
            throw OpenAIError.invalidURL
        }
        
        let prompt = createSummarizationPrompt(notes: notes, customerName: customerName)
        
        let request = OpenAIRequest(
            model: "gpt-3.5-turbo",
            messages: [
                OpenAIRequest.Message(role: "system", content: "You are a helpful assistant that creates professional job summaries for field technicians."),
                OpenAIRequest.Message(role: "user", content: prompt)
            ],
            maxTokens: 300,
            temperature: 0.3
        )
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw OpenAIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = errorData["error"] as? [String: Any],
               let message = error["message"] as? String {
                throw OpenAIError.apiError(message)
            }
            throw OpenAIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        let openAIResponse = try decoder.decode(OpenAIResponse.self, from: data)
        
        guard let choice = openAIResponse.choices.first else {
            throw OpenAIError.noResponse
        }
        
        return parseSummaryResponse(choice.message.content)
    }
    
    private func createSummarizationPrompt(notes: String, customerName: String) -> String {
        let customerContext = customerName.isEmpty ? "" : "Customer: \(customerName)\n"
        
        return """
        \(customerContext)Job Notes: \(notes)
        
        Please create a professional job summary with the following format:
        
        **Customer:** [Extract or use provided customer name, or "Not specified" if not found]
        **Work Performed:** [Concise description of the work completed]
        **Follow-up Required:** [Any follow-up actions needed, or "None" if not applicable]
        
        Keep the summary professional, concise, and focused on the key details that would be useful for scheduling, billing, and future service calls.
        """
    }
    
    private func parseSummaryResponse(_ content: String) -> JobSummary {
        let lines = content.components(separatedBy: .newlines)
        var customerName = "Not specified"
        var workDescription = "No description provided"
        var followUpSteps = "None"
        
        for line in lines {
            let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
            
            if trimmedLine.lowercased().contains("customer:") {
                customerName = extractValue(from: trimmedLine, after: "customer:")
            } else if trimmedLine.lowercased().contains("work performed:") {
                workDescription = extractValue(from: trimmedLine, after: "work performed:")
            } else if trimmedLine.lowercased().contains("follow-up") {
                followUpSteps = extractValue(from: trimmedLine, after: ":")
            }
        }
        
        return JobSummary(
            customerName: customerName,
            workDescription: workDescription,
            followUpSteps: followUpSteps,
            fullSummary: content
        )
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
    case missingAPIKey
    case emptyNotes
    case invalidURL
    case invalidResponse
    case noResponse
    case httpError(Int)
    case apiError(String)
    
    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "OpenAI API key not configured. Please contact support."
        case .emptyNotes:
            return "Please enter some job notes before generating a summary."
        case .invalidURL:
            return "Invalid API endpoint configuration."
        case .invalidResponse:
            return "Invalid response from OpenAI API."
        case .noResponse:
            return "No response received from OpenAI API."
        case .httpError(let code):
            return "API request failed with status code \(code)."
        case .apiError(let message):
            return "OpenAI API Error: \(message)"
        }
    }
} 