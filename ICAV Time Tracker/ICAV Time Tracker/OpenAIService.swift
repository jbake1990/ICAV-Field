import Foundation

@MainActor
class OpenAIService: ObservableObject {
    
    // API key loaded from secure Config file (not committed to git)
    private let apiKey = Config.openAIAPIKey
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
                OpenAIRequest.Message(role: "system", content: "You are an expert technical writer who creates detailed, professional job summaries that can be shared with customers. Your role is to transform brief technician notes into comprehensive, customer-friendly reports that explain what work was performed and what follow-up actions are needed."),
                OpenAIRequest.Message(role: "user", content: prompt)
            ],
            maxTokens: 600,
            temperature: 0.2
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
        \(customerContext)Technician Notes: \(notes)
        
        Transform these brief technician notes into a comprehensive, professional job summary that could be shared with the customer. The summary should be detailed enough for the customer to understand exactly what work was performed and what to expect next.
        
        Please create a detailed job summary with the following format:
        
        **Customer:** [Extract or use provided customer name, or "Not specified" if not found]
        
        **Work Performed:** 
        [Provide a detailed, customer-friendly explanation of all work completed. Expand on technical abbreviations, explain the purpose of each task, and describe any issues that were identified and resolved. Use clear, professional language that a non-technical customer would understand. Include specific details about equipment worked on, parts replaced, systems tested, etc.]
        
        **Follow-up Required:** 
        [Provide detailed information about any follow-up actions needed. Explain WHY the follow-up is necessary, WHEN it should be completed, and WHAT the customer can expect. If no follow-up is needed, explain that the work is complete and what the customer should monitor or expect going forward.]
        
        **Additional Notes:**
        [Include any warranty information, maintenance recommendations, or preventive measures the customer should be aware of. Mention any observations about equipment condition or potential future needs.]
        
        Guidelines:
        - Write as if speaking directly to the customer
        - Explain technical terms in plain language
        - Be specific about what was accomplished
        - Provide context for why work was necessary
        - Give clear expectations for any follow-up
        - Maintain a professional, helpful tone
        - Include timeframes when relevant
        - Mention any testing or verification performed
        """
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
            
            if trimmedLine.lowercased().contains("**customer:**") {
                if !tempContent.isEmpty() && !currentSection.isEmpty() {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "customer"
                tempContent = extractValue(from: trimmedLine, after: "customer:")
            } else if trimmedLine.lowercased().contains("**work performed:**") {
                if !tempContent.isEmpty() && !currentSection.isEmpty() {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "work"
                tempContent = extractValue(from: trimmedLine, after: "work performed:")
            } else if trimmedLine.lowercased().contains("**follow-up required:**") {
                if !tempContent.isEmpty() && !currentSection.isEmpty() {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "followup"
                tempContent = extractValue(from: trimmedLine, after: "follow-up required:")
            } else if trimmedLine.lowercased().contains("**additional notes:**") {
                if !tempContent.isEmpty() && !currentSection.isEmpty() {
                    assignContent(section: currentSection, content: tempContent, 
                                customerName: &customerName, workDescription: &workDescription, 
                                followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
                }
                currentSection = "additional"
                tempContent = extractValue(from: trimmedLine, after: "additional notes:")
            } else if !trimmedLine.isEmpty() && !currentSection.isEmpty() {
                tempContent += "\n" + trimmedLine
            }
        }
        
        // Handle the last section
        if !tempContent.isEmpty() && !currentSection.isEmpty() {
            assignContent(section: currentSection, content: tempContent, 
                        customerName: &customerName, workDescription: &workDescription, 
                        followUpSteps: &followUpSteps, additionalNotes: &additionalNotes)
        }
        
        // Combine work description and additional notes for the work description field
        var finalWorkDescription = workDescription
        if !additionalNotes.isEmpty() {
            finalWorkDescription += "\n\nAdditional Notes:\n" + additionalNotes
        }
        
        return JobSummary(
            customerName: customerName,
            workDescription: finalWorkDescription,
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