package com.example.icavtimetracker.network

import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.data.User
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("api/auth")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>
    
    @POST("api/auth")
    suspend fun verifySession(
        @Body request: AuthRequest
    ): Response<AuthResponse>
    
    @GET("api/time-entries")
    suspend fun getTimeEntries(
        @Header("Authorization") token: String
    ): Response<List<TimeEntryResponse>>
    
    @POST("api/time-entries")
    suspend fun createTimeEntry(
        @Header("Authorization") token: String,
        @Body timeEntry: TimeEntryRequest
    ): Response<TimeEntryResponse>
    
    @POST("api/time-entries")
    suspend fun updateTimeEntry(
        @Header("Authorization") token: String,
        @Body timeEntry: TimeEntryRequest
    ): Response<TimeEntryResponse>
    
    @DELETE("api/time-entries/{id}")
    suspend fun deleteTimeEntry(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<Unit>
    
    @GET("api/users")
    suspend fun getUsers(
        @Header("Authorization") token: String
    ): Response<List<User>>
    
    @GET("api/health")
    suspend fun healthCheck(): Response<HealthResponse>
    
    @GET("api/job-assignments")
    suspend fun getJobAssignments(
        @Header("Authorization") token: String,
        @Query("userId") userId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<List<JobAssignmentResponse>>
    
    @POST("api/job-assignments")
    suspend fun createJobAssignment(
        @Header("Authorization") token: String,
        @Body assignment: JobAssignmentRequest
    ): Response<JobAssignmentResponse>
    
    @PUT("api/job-assignments/{id}")
    suspend fun updateJobAssignment(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body assignment: JobAssignmentRequest
    ): Response<JobAssignmentResponse>
}

data class LoginRequest(
    val action: String = "login",
    val username: String,
    val password: String
)

data class AuthRequest(
    val action: String,
    val sessionToken: String?
)

data class AuthResponse(
    val user: User,
    val token: String,
    val expiresAt: String
)

data class TimeEntryRequest(
    val id: String? = null,
    val userId: String,
    val technicianName: String,
    val customerName: String,
    val jobAssignmentId: String? = null,
    val clockInTime: String? = null,
    val clockOutTime: String? = null,
    val lunchStartTime: String? = null,
    val lunchEndTime: String? = null,
    val driveStartTime: String? = null,
    val driveEndTime: String? = null,
    val jobNotes: String? = null,
    val aiSummary: String? = null
)

data class TimeEntryResponse(
    val id: String,
    val userId: String,
    val technicianName: String,
    val customerName: String,
    val jobAssignmentId: String? = null,
    val clockInTime: String?,
    val clockOutTime: String?,
    val lunchStartTime: String?,
    val lunchEndTime: String?,
    val driveStartTime: String?,
    val driveEndTime: String?,
    val jobNotes: String? = "",
    val aiSummary: String? = ""
)

data class HealthResponse(
    val status: String,
    val timestamp: String
)

data class JobAssignmentRequest(
    val id: String? = null,
    val jobId: String,
    val userId: String,
    val technicianName: String? = null,
    val assignedDate: String,
    val assignedHours: Int,
    val actualHours: Int? = null,
    val status: String = "assigned",
    val notes: String? = null,
    val order: Int? = null
)

data class JobAssignmentResponse(
    val id: String,
    val jobId: String,
    val userId: String,
    val technicianName: String,
    val assignedDate: String,
    val assignedHours: Int,
    val actualHours: Int?,
    val status: String,
    val notes: String?,
    val order: Int?,
    val createdAt: String,
    val updatedAt: String,
    val job: JobResponse? = null
)

data class JobResponse(
    val id: String,
    val title: String,
    val customerName: String,
    val description: String?,
    val location: String?,
    val estimatedHours: Int,
    val status: String,
    val priority: String,
    val createdAt: String,
    val updatedAt: String
) 