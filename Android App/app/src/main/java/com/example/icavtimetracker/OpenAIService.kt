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
    
    // Use server endpoint instead of direct OpenAI API
    private val serverUrl = Config.SERVER_URL
    
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
    data class ServerAIRequest(
        val notes: String,
        val customerName: String
    )
    
    @Serializable
    data class ServerAIResponse(
        val summary: String
    )
    
    data class JobSummary(
        val customerName: String,
        val workDescription: String,
        val followUpSteps: String,
        val fullSummary: String
    )
    
    suspend fun summarizeJobNotes(notes: String, customerName: String = ""): Result<JobSummary> {
        if (notes.trim().isEmpty()) {
            return Result.failure(OpenAIException.EmptyNotes())
        }
        
        return withContext(Dispatchers.IO) {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                val result = performServerSummarization(notes, customerName)
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
    
    private suspend fun performServerSummarization(notes: String, customerName: String): Result<JobSummary> {
        val requestBody = ServerAIRequest(notes = notes, customerName = customerName)
        
        val requestJson = json.encodeToString(ServerAIRequest.serializer(), requestBody)
        val body = requestJson.toRequestBody("application/json".toMediaType())
        
        val httpRequest = Request.Builder()
            .url("$serverUrl/api/ai-summary")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .build()
        
        return try {
            val response = client.newCall(httpRequest).execute()
            
            when {
                response.isSuccessful -> {
                    val responseBody = response.body?.string()
                    if (responseBody != null) {
                        val serverResponse = json.decodeFromString(ServerAIResponse.serializer(), responseBody)
                        val summary = parseSummaryResponse(serverResponse.summary)
                        Result.success(summary)
                    } else {
                        Result.failure(OpenAIException.InvalidResponse())
                    }
                }
                response.code == 401 -> {
                    Result.failure(OpenAIException.NotAuthenticated())
                }
                else -> {
                    // Try to parse error message from response
                    val errorBody = response.body?.string()
                    val errorMsg = if (errorBody != null) {
                        try {
                            val errorJson = json.parseToJsonElement(errorBody).toString()
                            "Server Error (${response.code}): $errorJson"
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
    

    
    private fun parseSummaryResponse(content: String): JobSummary {
        val lines = content.lines()
        var customerName = "Not specified"
        var workDescription = "No description provided"
        var followUpSteps = "None"
        var additionalNotes = ""
        var currentSection = ""
        var tempContent = ""
        
        for (line in lines) {
            val trimmedLine = line.trim()
            
            when {
                trimmedLine.lowercase().contains("**customer info:**") -> {
                    if (tempContent.isNotEmpty() && currentSection.isNotEmpty()) {
                        val values = assignContent(currentSection, tempContent, customerName, workDescription, followUpSteps, additionalNotes)
                        customerName = values[0]
                        workDescription = values[1]
                        followUpSteps = values[2]
                        additionalNotes = values[3]
                    }
                    currentSection = "customer"
                    tempContent = extractValue(trimmedLine, "customer info:")
                }
                trimmedLine.lowercase().contains("**work summary:**") -> {
                    if (tempContent.isNotEmpty() && currentSection.isNotEmpty()) {
                        val values = assignContent(currentSection, tempContent, customerName, workDescription, followUpSteps, additionalNotes)
                        customerName = values[0]
                        workDescription = values[1]
                        followUpSteps = values[2]
                        additionalNotes = values[3]
                    }
                    currentSection = "work"
                    tempContent = extractValue(trimmedLine, "work summary:")
                }
                trimmedLine.lowercase().contains("**to-do/follow up:**") -> {
                    if (tempContent.isNotEmpty() && currentSection.isNotEmpty()) {
                        val values = assignContent(currentSection, tempContent, customerName, workDescription, followUpSteps, additionalNotes)
                        customerName = values[0]
                        workDescription = values[1]
                        followUpSteps = values[2]
                        additionalNotes = values[3]
                    }
                    currentSection = "followup"
                    tempContent = extractValue(trimmedLine, "to-do/follow up:")
                }
                trimmedLine.isNotEmpty() && currentSection.isNotEmpty() -> {
                    tempContent += "\n$trimmedLine"
                }
            }
        }
        
        // Handle the last section
        if (tempContent.isNotEmpty() && currentSection.isNotEmpty()) {
            val values = assignContent(currentSection, tempContent, customerName, workDescription, followUpSteps, additionalNotes)
            customerName = values[0]
            workDescription = values[1]
            followUpSteps = values[2]
            additionalNotes = values[3]
        }
        
        return JobSummary(
            customerName = customerName,
            workDescription = workDescription,
            followUpSteps = followUpSteps,
            fullSummary = content
        )
    }
    
    private fun assignContent(section: String, content: String, 
                             currentCustomer: String, currentWork: String, 
                             currentFollowUp: String, currentAdditional: String): List<String> {
        val cleanContent = content.trim()
        return when (section) {
            "customer" -> listOf(
                if (cleanContent.isEmpty()) "Not specified" else cleanContent,
                currentWork, currentFollowUp, currentAdditional
            )
            "work" -> listOf(
                currentCustomer,
                if (cleanContent.isEmpty()) "No description provided" else cleanContent,
                currentFollowUp, currentAdditional
            )
            "followup" -> listOf(
                currentCustomer, currentWork,
                if (cleanContent.isEmpty()) "None" else cleanContent,
                currentAdditional
            )
            "additional" -> listOf(
                currentCustomer, currentWork, currentFollowUp, cleanContent
            )
            else -> listOf(currentCustomer, currentWork, currentFollowUp, currentAdditional)
        }
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
    class NotAuthenticated : OpenAIException("You must be logged in to generate AI summaries.")
    class EmptyNotes : OpenAIException("Please enter some job notes before generating a summary.")
    class InvalidResponse : OpenAIException("Invalid response from server.")
    class NoResponse : OpenAIException("No response received from server.")
    class NetworkError(message: String) : OpenAIException("Network error: $message")
    class HttpError(val code: Int, message: String) : OpenAIException("HTTP $code: $message")
    class UnknownError(message: String) : OpenAIException("Unknown error: $message")
} 