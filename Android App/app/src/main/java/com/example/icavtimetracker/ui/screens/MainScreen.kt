package com.example.icavtimetracker.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.icavtimetracker.data.JobAssignment
import com.example.icavtimetracker.OpenAIService
import com.example.icavtimetracker.PDFGenerator
import com.example.icavtimetracker.ShareManager
import com.example.icavtimetracker.SpeechRecognitionManager
import com.example.icavtimetracker.data.ClockStatus
import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.viewmodel.TimeTrackerViewModel
import java.text.SimpleDateFormat
import java.util.*
import java.util.Calendar
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch

enum class ButtonState { UNAVAILABLE, AVAILABLE, ACTIVE }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onLogout: () -> Unit,
    viewModel: TimeTrackerViewModel
) {
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val clockStatus by viewModel.clockStatus.collectAsStateWithLifecycle()
    val currentEntry by viewModel.currentEntry.collectAsStateWithLifecycle()
    val timeEntries by viewModel.timeEntries.collectAsStateWithLifecycle()
    val pendingSyncCount by viewModel.pendingSyncCount.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    // Services for job notes functionality
    val speechManager = remember { SpeechRecognitionManager(context) }
    val openAIService = remember { OpenAIService() }
    val pdfGenerator = remember { PDFGenerator(context) }
    val shareManager = remember { ShareManager(context) }
    
    // Collect service states
    val speechRecognizedText by speechManager.recognizedText.collectAsStateWithLifecycle()
    val speechIsRecording by speechManager.isRecording.collectAsStateWithLifecycle()
    val speechErrorMessage by speechManager.errorMessage.collectAsStateWithLifecycle()
    val openAIIsLoading by openAIService.isLoading.collectAsStateWithLifecycle()
    val openAIErrorMessage by openAIService.errorMessage.collectAsStateWithLifecycle()
    
    // Selected job state (matches iOS design)
    var selectedJob by remember { mutableStateOf<TimeEntry?>(null) }
    var showingLogoutDialog by remember { mutableStateOf(false) }
    var showNewJobDialog by remember { mutableStateOf(false) }
    var newJobCustomerName by remember { mutableStateOf("") }
    var showEditDialog by remember { mutableStateOf(false) }
    
    // Job Notes Modal states
    var showJobNotesDialog by remember { mutableStateOf(false) }
    var jobNotesText by remember { mutableStateOf("") }
    var jobNotesEntry by remember { mutableStateOf<TimeEntry?>(null) }
    var aiSummary by remember { mutableStateOf("") }

    // Today's jobs (matches iOS jobs list)
    val todayJobs = timeEntries.filter { entry ->
        val today = Calendar.getInstance()
        val entryDate = Calendar.getInstance()
        entry.clockInTime?.let { entryDate.time = it } ?: entry.driveStartTime?.let { entryDate.time = it }
        
        today.get(Calendar.YEAR) == entryDate.get(Calendar.YEAR) &&
        today.get(Calendar.DAY_OF_YEAR) == entryDate.get(Calendar.DAY_OF_YEAR)
    }.sortedByDescending { it.clockInTime ?: it.driveStartTime ?: Date(0) }

    // Job assignments from web portal
    val jobAssignments by viewModel.jobAssignments.collectAsStateWithLifecycle()
    val selectedJobAssignment by viewModel.selectedJobAssignment.collectAsStateWithLifecycle()

    // Auto-select first job if none selected
    LaunchedEffect(todayJobs) {
        if (selectedJob == null && todayJobs.isNotEmpty()) {
            selectedJob = todayJobs.first()
        }
    }

    // Load job assignments when component mounts
    LaunchedEffect(Unit) {
        viewModel.loadJobAssignments()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header (matches iOS)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ICAV Time Tracker",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            
            // User menu (matches iOS)
            var showUserMenu by remember { mutableStateOf(false) }
            Box {
                IconButton(onClick = { showUserMenu = true }) {
                    Icon(Icons.Default.Person, contentDescription = "User Menu")
                }
                DropdownMenu(
                    expanded = showUserMenu,
                    onDismissRequest = { showUserMenu = false }
                ) {
                    currentUser?.let { user ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(
                                        text = user.displayName,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "@${user.username}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = { }
                        )
                        Divider()
                    }
                    DropdownMenuItem(
                        text = { 
                            Text(
                                "Logout",
                                color = MaterialTheme.colorScheme.error
                            )
                        },
                        onClick = {
                            showUserMenu = false
                            onLogout()
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Online Status and Sync (matches iOS)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = "Online",
                        tint = Color.Green,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        "Online",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (pendingSyncCount > 0) {
                        Text(
                            "($pendingSyncCount pending)",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFFF8C00) // Orange
                        )
                    } else {
                        Text(
                            "(Synced)",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Green
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Selected Job Section (matches iOS)
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Selected Job",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = selectedJob?.customerName ?: "None",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Action Buttons Grid (matches iOS 2x3 grid)
        val buttonStates = getButtonStates(selectedJob, clockStatus)
        
        Column(
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                ActionButton(
                    title = "Clock In",
                    icon = Icons.Default.PlayArrow,
                    state = buttonStates["Clock In"] ?: ButtonState.UNAVAILABLE,
                    brightColor = Color.Blue,
                    darkColor = Color(0xFF1A1F36),
                    modifier = Modifier.weight(1f)
                ) {
                    handleAction("Clock In", selectedJob, viewModel) {
                        jobNotesEntry = it
                        showJobNotesDialog = true
                    }
                }
                
                ActionButton(
                    title = "Clock Out",
                    icon = Icons.Default.Clear,
                    state = buttonStates["Clock Out"] ?: ButtonState.UNAVAILABLE,
                    brightColor = Color.Red,
                    darkColor = Color(0xFF211515),
                    modifier = Modifier.weight(1f)
                ) {
                    handleAction("Clock Out", selectedJob, viewModel) {
                        jobNotesEntry = it
                        showJobNotesDialog = true
                    }
                }
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                ActionButton(
                    title = "Start Lunch",
                    icon = Icons.Default.Add,
                    state = buttonStates["Start Lunch"] ?: ButtonState.UNAVAILABLE,
                    brightColor = Color(0xFFFF8C00), // Orange
                    darkColor = Color(0xFF381A08),
                    modifier = Modifier.weight(1f)
                ) {
                    handleAction("Start Lunch", selectedJob, viewModel) {
                        jobNotesEntry = it
                        showJobNotesDialog = true
                    }
                }
                
                ActionButton(
                    title = "End Lunch",
                    icon = Icons.Default.PlayArrow,
                    state = buttonStates["End Lunch"] ?: ButtonState.UNAVAILABLE,
                    brightColor = Color(0xFFFF8C00), // Orange
                    darkColor = Color(0xFF211515),
                    modifier = Modifier.weight(1f)
                ) {
                    handleAction("End Lunch", selectedJob, viewModel) {
                        jobNotesEntry = it
                        showJobNotesDialog = true
                    }
                }
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                ActionButton(
                    title = "Start Driving",
                    icon = Icons.Default.LocationOn,
                    state = buttonStates["Start Driving"] ?: ButtonState.UNAVAILABLE,
                    brightColor = Color.Green,
                    darkColor = Color(0xFF083822),
                    modifier = Modifier.weight(1f)
                ) {
                    handleAction("Start Driving", selectedJob, viewModel) {
                        jobNotesEntry = it
                        showJobNotesDialog = true
                    }
                }
                
                ActionButton(
                    title = "End Driving",
                    icon = Icons.Default.LocationOn,
                    state = buttonStates["End Driving"] ?: ButtonState.UNAVAILABLE,
                    brightColor = Color.Green,
                    darkColor = Color(0xFF211515),
                    modifier = Modifier.weight(1f)
                ) {
                    handleAction("End Driving", selectedJob, viewModel) {
                        jobNotesEntry = it
                        showJobNotesDialog = true
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Edit Timestamps Button (matches iOS)
        Button(
            onClick = { /* TODO: Implement edit timestamps */ },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF9C27B0).copy(alpha = 0.2f),
                contentColor = Color(0xFF9C27B0)
            ),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = null,
                    modifier = Modifier.size(22.dp)
                )
                Text(
                    "Edit Timestamps",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Jobs List (matches iOS)
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Scheduled Jobs",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                TextButton(
                    onClick = { showNewJobDialog = true }
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("New Job")
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Show scheduled job assignments first
            if (jobAssignments.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 150.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(jobAssignments) { assignment ->
                        val job = assignment.job
                        if (job != null) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { 
                                        viewModel.selectJobAssignment(assignment)
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (selectedJobAssignment?.id == assignment.id) 
                                        MaterialTheme.colorScheme.primaryContainer 
                                    else 
                                        MaterialTheme.colorScheme.surfaceVariant
                                )
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Text(
                                        text = job.customerName,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (!job.location.isNullOrBlank()) {
                                        Text(
                                            text = job.location,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "${assignment.assignedHours}h",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(
                                            text = "Scheduled",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.secondary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Spacer(modifier = Modifier.height(16.dp))
            }
            
            // Show existing time entries
            if (todayJobs.isNotEmpty()) {
                Text(
                    text = "Active Jobs",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                LazyColumn(
                    modifier = Modifier.heightIn(max = 200.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(todayJobs) { job ->
                        JobListItem(
                            job = job,
                            isSelected = selectedJob?.id == job.id,
                            onClick = { selectedJob = job }
                        )
                    }
                }
            }
        }
    }

    // New Job Dialog
    if (showNewJobDialog) {
        AlertDialog(
            onDismissRequest = { showNewJobDialog = false },
            title = { Text("New Job") },
            text = {
                Column {
                    Text("Customer Name")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newJobCustomerName,
                        onValueChange = { newJobCustomerName = it },
                        placeholder = { Text("Enter customer name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newJobCustomerName.isNotBlank()) {
                            viewModel.clockIn(newJobCustomerName.trim())
                            // Find and select the new job
                            selectedJob = timeEntries.find { 
                                it.customerName == newJobCustomerName.trim()
                            }
                            newJobCustomerName = ""
                            showNewJobDialog = false
                        }
                    },
                    enabled = newJobCustomerName.isNotBlank()
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        newJobCustomerName = ""
                        showNewJobDialog = false
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    // Job Notes Dialog (when clocking out)
    if (showJobNotesDialog) {
        JobNotesDialog(
            entry = jobNotesEntry,
            jobNotesText = jobNotesText,
            onJobNotesTextChange = { jobNotesText = it },
            aiSummary = aiSummary,
            onAiSummaryChange = { aiSummary = it },
            onSave = { notes, summary ->
                jobNotesEntry?.let { entry ->
                    coroutineScope.launch {
                        try {
                            // Update entry with notes and summary
                            val updatedEntry = entry.copy(
                                jobNotes = notes,
                                aiSummary = summary,
                                clockOutTime = Date()
                            )
                            
                            // Generate and share PDF
                            try {
                                val report = PDFGenerator.JobReport(
                                    timeEntry = updatedEntry,
                                    jobNotes = notes,
                                    aiSummary = summary,
                                    technicianName = updatedEntry.technicianName,
                                    customerName = updatedEntry.customerName,
                                    workDate = updatedEntry.clockInTime ?: Date()
                                )
                                val pdfBytes = pdfGenerator.generateJobSummaryPDF(report)
                                if (pdfBytes != null) {
                                    shareManager.sharePDFFromByteArray(pdfBytes, "Job Notes - ${entry.customerName}")
                                }
                            } catch (e: Exception) {
                                // Handle PDF generation error
                            }
                            
                        } catch (e: Exception) {
                            // Handle error
                        }
                    }
                }
                
                showJobNotesDialog = false
                jobNotesEntry = null
                jobNotesText = ""
                aiSummary = ""
            },
            onCancel = {
                showJobNotesDialog = false
                jobNotesEntry = null
                jobNotesText = ""
                aiSummary = ""
            },
            speechManager = speechManager,
            openAIService = openAIService,
            speechRecognizedText = speechRecognizedText,
            speechIsRecording = speechIsRecording,
            speechErrorMessage = speechErrorMessage,
            openAIIsLoading = openAIIsLoading,
            openAIErrorMessage = openAIErrorMessage,
            coroutineScope = coroutineScope
        )
    }
}

@Composable
fun ActionButton(
    title: String,
    icon: ImageVector,
    state: ButtonState,
    brightColor: Color,
    darkColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val (backgroundColor, contentColor) = when (state) {
        ButtonState.UNAVAILABLE -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
        ButtonState.AVAILABLE -> darkColor to brightColor
        ButtonState.ACTIVE -> brightColor to Color.White
    }
    
    Button(
        onClick = onClick,
        enabled = state != ButtonState.UNAVAILABLE,
        modifier = modifier.height(80.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = backgroundColor,
            contentColor = contentColor,
            disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun JobListItem(
    job: TimeEntry,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer
                           else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = job.customerName,
                style = MaterialTheme.typography.titleMedium
            )
            
            if (isSelected) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = "Selected",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

fun getButtonStates(selectedJob: TimeEntry?, clockStatus: ClockStatus): Map<String, ButtonState> {
    if (selectedJob == null) {
        return mapOf(
            "Clock In" to ButtonState.UNAVAILABLE,
            "Clock Out" to ButtonState.UNAVAILABLE,
            "Start Lunch" to ButtonState.UNAVAILABLE,
            "End Lunch" to ButtonState.UNAVAILABLE,
            "Start Driving" to ButtonState.UNAVAILABLE,
            "End Driving" to ButtonState.UNAVAILABLE
        )
    }
    
    val isClockedIn = selectedJob.clockInTime != null && selectedJob.clockOutTime == null && !selectedJob.isOnLunch && !selectedJob.isDriving
    val isOnLunch = selectedJob.isOnLunch
    val isDriving = selectedJob.isDriving
    val isClockedOut = (selectedJob.clockInTime == null && selectedJob.driveStartTime == null) || selectedJob.clockOutTime != null
    
    return when {
        isOnLunch -> mapOf(
            "Clock In" to ButtonState.UNAVAILABLE,
            "Clock Out" to ButtonState.UNAVAILABLE,
            "Start Lunch" to ButtonState.UNAVAILABLE,
            "End Lunch" to ButtonState.ACTIVE,
            "Start Driving" to ButtonState.UNAVAILABLE,
            "End Driving" to ButtonState.UNAVAILABLE
        )
        
        isDriving -> mapOf(
            "Clock In" to ButtonState.AVAILABLE,
            "Clock Out" to ButtonState.UNAVAILABLE,
            "Start Lunch" to ButtonState.UNAVAILABLE,
            "End Lunch" to ButtonState.UNAVAILABLE,
            "Start Driving" to ButtonState.ACTIVE,
            "End Driving" to ButtonState.AVAILABLE
        )
        
        isClockedIn -> mapOf(
            "Clock In" to ButtonState.UNAVAILABLE,
            "Clock Out" to ButtonState.AVAILABLE,
            "Start Lunch" to ButtonState.AVAILABLE,
            "End Lunch" to ButtonState.UNAVAILABLE,
            "Start Driving" to ButtonState.UNAVAILABLE,
            "End Driving" to ButtonState.UNAVAILABLE
        )
        
        isClockedOut -> {
            val hasCustomerName = selectedJob.customerName.isNotBlank()
            mapOf(
                "Clock In" to if (hasCustomerName) ButtonState.AVAILABLE else ButtonState.UNAVAILABLE,
                "Clock Out" to ButtonState.UNAVAILABLE,
                "Start Lunch" to ButtonState.AVAILABLE,
                "End Lunch" to ButtonState.UNAVAILABLE,
                "Start Driving" to if (hasCustomerName) ButtonState.AVAILABLE else ButtonState.UNAVAILABLE,
                "End Driving" to ButtonState.UNAVAILABLE
            )
        }
        
        else -> mapOf(
            "Clock In" to ButtonState.UNAVAILABLE,
            "Clock Out" to ButtonState.UNAVAILABLE,
            "Start Lunch" to ButtonState.UNAVAILABLE,
            "End Lunch" to ButtonState.UNAVAILABLE,
            "Start Driving" to ButtonState.UNAVAILABLE,
            "End Driving" to ButtonState.UNAVAILABLE
        )
    }
}

fun handleAction(
    action: String,
    selectedJob: TimeEntry?,
    viewModel: TimeTrackerViewModel,
    onShowJobNotes: (TimeEntry) -> Unit
) {
    when (action) {
        "Clock In" -> {
            selectedJob?.let { job ->
                viewModel.clockIn(job.customerName)
            }
        }
        "Clock Out" -> {
            selectedJob?.let { job ->
                onShowJobNotes(job)
            }
        }
        "Start Lunch" -> {
            viewModel.startLunch()
        }
        "End Lunch" -> {
            viewModel.endLunch()
        }
        "Start Driving" -> {
            selectedJob?.let { job ->
                viewModel.startDriving(job.customerName)
            }
        }
        "End Driving" -> {
            viewModel.endDriving()
        }
    }
}

// Keep the existing JobNotesDialog component from the previous implementation
@Composable
fun JobNotesDialog(
    entry: TimeEntry?,
    jobNotesText: String,
    onJobNotesTextChange: (String) -> Unit,
    aiSummary: String,
    onAiSummaryChange: (String) -> Unit,
    onSave: (String, String) -> Unit,
    onCancel: () -> Unit,
    speechManager: SpeechRecognitionManager,
    openAIService: OpenAIService,
    speechRecognizedText: String,
    speechIsRecording: Boolean,
    speechErrorMessage: String?,
    openAIIsLoading: Boolean,
    openAIErrorMessage: String?,
    coroutineScope: CoroutineScope
) {
    Dialog(
        onDismissRequest = onCancel
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Job Notes",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                entry?.let {
                    Text(
                        text = "Job: ${it.customerName}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Notes input
                OutlinedTextField(
                    value = jobNotesText,
                    onValueChange = onJobNotesTextChange,
                    label = { Text("Job Notes") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Voice input and AI buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Button(
                        onClick = {
                            if (speechIsRecording) {
                                speechManager.stopRecording()
                            } else {
                                speechManager.startRecording()
                            }
                        }
                    ) {
                        Icon(
                            if (speechIsRecording) Icons.Default.Clear else Icons.Default.Add,
                            contentDescription = if (speechIsRecording) "Stop Recording" else "Start Recording"
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (speechIsRecording) "Stop" else "Voice Input")
                    }
                    
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                entry?.let {
                                    try {
                                        val result = openAIService.summarizeJobNotes(
                                            jobNotesText,
                                            it.customerName
                                        )
                                        val summary = if (result.isSuccess) {
                                            result.getOrNull()?.fullSummary ?: "Summary failed"
                                        } else {
                                            "Error generating summary"
                                        }
                                        onAiSummaryChange(summary)
                                    } catch (e: Exception) {
                                        onAiSummaryChange("Error: ${e.message}")
                                    }
                                }
                            }
                        },
                        enabled = !openAIIsLoading && jobNotesText.isNotBlank()
                    ) {
                        if (openAIIsLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(Icons.Default.Star, contentDescription = null)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("AI Summary")
                    }
                }
                
                // Update notes with recognized speech
                LaunchedEffect(speechRecognizedText) {
                    if (speechRecognizedText.isNotBlank() && speechIsRecording) {
                        // During recording, replace with new recognition (don't append partial results)
                        onJobNotesTextChange(speechRecognizedText)
                    }
                }
                
                // Error messages
                speechErrorMessage?.let {
                    Text(
                        text = "Speech Error: $it",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                
                openAIErrorMessage?.let {
                    Text(
                        text = "AI Error: $it",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // AI Summary display
                if (aiSummary.isNotBlank()) {
                    Text(
                        text = "AI Summary:",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Text(
                            text = aiSummary,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onCancel) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onSave(jobNotesText, aiSummary) }
                    ) {
                        Text("Save & Clock Out")
                    }
                }
            }
        }
    }
}
