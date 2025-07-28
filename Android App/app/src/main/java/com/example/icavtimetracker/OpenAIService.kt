package com.example.icavtimetracker

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class OpenAIService {
    
    // Note: In production, this should be loaded from a secure configuration
    // For now, you'll need to set your OpenAI API key here
    private val apiKey = "YOUR_OPENAI_API_KEY_HERE"
    private val baseUrl = "https://api.openai.com/v1/chat/completions"
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _errorMessage = MutableStateFlow("")
    val errorMessage: StateFlow<String> = _errorMessage.asStateFlow()
    
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    
    @Serializable
    data class OpenAIRequest(
        val model: String,
        val messages: List<Message>,
        @SerialName("max_tokens")
        val maxTokens: Int,
        val temperature: Double
    ) {
        @Serializable
        data class Message(
            val role: String,
            val content: String
        )
    }
    
    @Serializable
    data class OpenAIResponse(
        val id: String,
        val choices: List<Choice>
    ) {
        @Serializable
        data class Choice(
            val message: Message
        ) {
            @Serializable
            data class Message(
                val content: String
            )
        }
    }
    
    data class JobSummary(
        val customerName: String,
        val workDescription: String,
        val followUpSteps: String,
        val fullSummary: String
    )
    
    suspend fun summarizeJobNotes(notes: String, customerName: String = ""): Result<JobSummary> {
        if (apiKey.isEmpty() || apiKey == "YOUR_OPENAI_API_KEY_HERE") {
            return Result.failure(OpenAIException.MissingAPIKey())
        }
        
        if (notes.trim().isEmpty()) {
            return Result.failure(OpenAIException.EmptyNotes())
        }
        
        return withContext(Dispatchers.IO) {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                val result = performSummarization(notes, customerName)
                _isLoading.value = false
                result
            } catch (e: Exception) {
                _isLoading.value = false
                val errorMsg = "Failed to generate summary: ${e.message}"
                _errorMessage.value = errorMsg
                Result.failure(e)
            }
        }
    }
    
    private suspend fun performSummarization(notes: String, customerName: String): Result<JobSummary> {
        val prompt = createSummarizationPrompt(notes, customerName)
        
        val request = OpenAIRequest(
            model = "gpt-3.5-turbo",
            messages = listOf(
                OpenAIRequest.Message(
                    role = "system",
                    content = "You are a helpful assistant that creates professional job summaries for field technicians."
                ),
                OpenAIRequest.Message(
                    role = "user",
                    content = prompt
                )
            ),
            maxTokens = 300,
            temperature = 0.3
        )
        
        val requestJson = json.encodeToString(OpenAIRequest.serializer(), request)
        val requestBody = requestJson.toRequestBody("application/json".toMediaType())
        
        val httpRequest = Request.Builder()
            .url(baseUrl)
            .post(requestBody)
            .addHeader("Authorization", "Bearer $apiKey")
            .addHeader("Content-Type", "application/json")
            .build()
        
        return try {
            val response = client.newCall(httpRequest).execute()
            
            when {
                response.isSuccessful -> {
                    val responseBody = response.body?.string()
                    if (responseBody != null) {
                        val openAIResponse = json.decodeFromString(OpenAIResponse.serializer(), responseBody)
                        val choice = openAIResponse.choices.firstOrNull()
                        if (choice != null) {
                            val summary = parseSummaryResponse(choice.message.content)
                            Result.success(summary)
                        } else {
                            Result.failure(OpenAIException.NoResponse())
                        }
                    } else {
                        Result.failure(OpenAIException.InvalidResponse())
                    }
                }
                response.code == 401 -> {
                    Result.failure(OpenAIException.Unauthorized())
                }
                response.code == 429 -> {
                    Result.failure(OpenAIException.RateLimited())
                }
                else -> {
                    // Try to parse error message from response
                    val errorBody = response.body?.string()
                    val errorMsg = if (errorBody != null) {
                        try {
                            val errorJson = json.parseToJsonElement(errorBody).toString()
                            "API Error (${response.code}): $errorJson"
                        } catch (e: Exception) {
                            "HTTP Error ${response.code}: ${response.message}"
                        }
                    } else {
                        "HTTP Error ${response.code}: ${response.message}"
                    }
                    Result.failure(OpenAIException.HttpError(response.code, errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(OpenAIException.NetworkError(e.message ?: "Network error"))
        } catch (e: Exception) {
            Result.failure(OpenAIException.UnknownError(e.message ?: "Unknown error"))
        }
    }
    
    private fun createSummarizationPrompt(notes: String, customerName: String): String {
        val customerContext = if (customerName.isEmpty()) "" else "Customer: $customerName\n"
        
        return """
        ${customerContext}Job Notes: $notes
        
        Please create a professional job summary with the following format:
        
        **Customer:** [Extract or use provided customer name, or "Not specified" if not found]
        **Work Performed:** [Concise description of the work completed]
        **Follow-up Required:** [Any follow-up actions needed, or "None" if not applicable]
        
        Keep the summary professional, concise, and focused on the key details that would be useful for scheduling, billing, and future service calls.
        """.trimIndent()
    }
    
    private fun parseSummaryResponse(content: String): JobSummary {
        val lines = content.lines()
        var customerName = "Not specified"
        var workDescription = "No description provided"
        var followUpSteps = "None"
        
        for (line in lines) {
            val trimmedLine = line.trim()
            
            when {
                trimmedLine.lowercase().contains("customer:") -> {
                    customerName = extractValue(trimmedLine, "customer:")
                }
                trimmedLine.lowercase().contains("work performed:") -> {
                    workDescription = extractValue(trimmedLine, "work performed:")
                }
                trimmedLine.lowercase().contains("follow-up") -> {
                    followUpSteps = extractValue(trimmedLine, ":")
                }
            }
        }
        
        return JobSummary(
            customerName = customerName,
            workDescription = workDescription,
            followUpSteps = followUpSteps,
            fullSummary = content
        )
    }
    
    private fun extractValue(line: String, delimiter: String): String {
        val index = line.lowercase().indexOf(delimiter.lowercase())
        return if (index != -1) {
            line.substring(index + delimiter.length)
                .trim()
                .removePrefix("**")
                .removeSuffix("**")
                .removePrefix("*")
                .removeSuffix("*")
        } else {
            line.trim()
        }
    }
    
    fun clearError() {
        _errorMessage.value = ""
    }
}

sealed class OpenAIException(message: String) : Exception(message) {
    class MissingAPIKey : OpenAIException("OpenAI API key not configured. Please contact support.")
    class EmptyNotes : OpenAIException("Please enter some job notes before generating a summary.")
    class InvalidResponse : OpenAIException("Invalid response from OpenAI API.")
    class NoResponse : OpenAIException("No response received from OpenAI API.")
    class Unauthorized : OpenAIException("Invalid API key. Please check your OpenAI API key.")
    class RateLimited : OpenAIException("Rate limit exceeded. Please try again later.")
    class NetworkError(message: String) : OpenAIException("Network error: $message")
    class HttpError(val code: Int, message: String) : OpenAIException("HTTP $code: $message")
    class UnknownError(message: String) : OpenAIException("Unknown error: $message")
} 