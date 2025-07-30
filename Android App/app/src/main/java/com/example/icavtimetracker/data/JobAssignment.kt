package com.example.icavtimetracker.data

import java.util.Date

data class JobAssignment(
    val id: String,
    val jobId: String,
    val userId: String,
    val technicianName: String,
    val assignedDate: Date,
    val assignedHours: Int,
    val actualHours: Int? = null,
    val status: String = "assigned",
    val notes: String? = null,
    val order: Int? = null,
    val createdAt: Date,
    val updatedAt: Date,
    val job: Job? = null
)

data class Job(
    val id: String,
    val title: String,
    val customerName: String,
    val description: String? = null,
    val location: String? = null,
    val estimatedHours: Int,
    val status: String,
    val priority: String,
    val createdAt: Date,
    val updatedAt: Date
) 