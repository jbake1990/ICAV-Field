package com.example.icavtimetracker

import android.content.Context
import android.graphics.*
import android.graphics.pdf.PdfDocument
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.Color as ComposeColor
import com.example.icavtimetracker.data.TimeEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class PDFGenerator(private val context: Context) {
    
    data class JobReport(
        val timeEntry: TimeEntry,
        val jobNotes: String,
        val aiSummary: String,
        val technicianName: String,
        val customerName: String,
        val workDate: Date
    )
    
    suspend fun generateJobSummaryPDF(report: JobReport): ByteArray? = withContext(Dispatchers.IO) {
        try {
            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(612, 792, 1).create() // 8.5" x 11" at 72 DPI
            val page = pdfDocument.startPage(pageInfo)
            
            drawJobSummaryPage(page.canvas, report)
            
            pdfDocument.finishPage(page)
            
            val outputStream = java.io.ByteArrayOutputStream()
            pdfDocument.writeTo(outputStream)
            pdfDocument.close()
            
            outputStream.toByteArray()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    private fun drawJobSummaryPage(canvas: Canvas, report: JobReport) {
        val margin = 50f
        val contentWidth = canvas.width - (margin * 2)
        var yPosition = margin
        
        // Paint objects for different text styles
        val titlePaint = Paint().apply {
            color = Color.BLUE
            textSize = 24f
            textAlign = Paint.Align.CENTER
            typeface = Typeface.DEFAULT_BOLD
            isAntiAlias = true
        }
        
        val headerPaint = Paint().apply {
            color = Color.DKGRAY
            textSize = 16f
            textAlign = Paint.Align.LEFT
            typeface = Typeface.DEFAULT_BOLD
            isAntiAlias = true
        }
        
        val normalPaint = Paint().apply {
            color = Color.BLACK
            textSize = 14f
            textAlign = Paint.Align.LEFT
            typeface = Typeface.DEFAULT
            isAntiAlias = true
        }
        
        val smallPaint = Paint().apply {
            color = Color.BLACK
            textSize = 12f
            textAlign = Paint.Align.LEFT
            typeface = Typeface.DEFAULT
            isAntiAlias = true
        }
        
        val footerPaint = Paint().apply {
            color = Color.GRAY
            textSize = 10f
            textAlign = Paint.Align.CENTER
            typeface = Typeface.DEFAULT
            isAntiAlias = true
        }
        
        val linePaint = Paint().apply {
            color = Color.LTGRAY
            strokeWidth = 1f
            style = Paint.Style.STROKE
        }
        
        // Helper function to draw text with automatic wrapping
        fun drawText(text: String, paint: Paint, maxWidth: Float = contentWidth): Float {
            val words = text.split(" ")
            var currentLine = ""
            val lineHeight = paint.textSize * 1.2f
            var linesDrawn = 0
            
            for (word in words) {
                val testLine = if (currentLine.isEmpty()) word else "$currentLine $word"
                val testWidth = paint.measureText(testLine)
                
                if (testWidth <= maxWidth) {
                    currentLine = testLine
                } else {
                    if (currentLine.isNotEmpty()) {
                        val xPosition = when (paint.textAlign) {
                            Paint.Align.CENTER -> canvas.width / 2f
                            else -> margin
                        }
                        canvas.drawText(currentLine, xPosition, yPosition + lineHeight, paint)
                        yPosition += lineHeight
                        linesDrawn++
                    }
                    currentLine = word
                }
            }
            
            // Draw the last line
            if (currentLine.isNotEmpty()) {
                val xPosition = when (paint.textAlign) {
                    Paint.Align.CENTER -> canvas.width / 2f
                    else -> margin
                }
                canvas.drawText(currentLine, xPosition, yPosition + lineHeight, paint)
                yPosition += lineHeight
                linesDrawn++
            }
            
            return lineHeight * linesDrawn + 10f // Add spacing
        }
        
        // Helper function to draw a horizontal line
        fun drawLine(): Float {
            canvas.drawLine(margin, yPosition, canvas.width - margin, yPosition, linePaint)
            return 20f // Space after line
        }
        
        // Header
        yPosition += drawText("ICAV FIELD SERVICE REPORT", titlePaint)
        yPosition += drawLine()
        
        // Job Information
        yPosition += drawText("JOB INFORMATION", headerPaint)
        
        val dateFormatter = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.getDefault())
        
        yPosition += drawText("Customer: ${report.customerName}", normalPaint)
        yPosition += drawText("Technician: ${report.technicianName}", normalPaint)
        yPosition += drawText("Date: ${dateFormatter.format(report.workDate)}", normalPaint)
        
        // Time Information
        if (report.timeEntry.clockInTime != null && report.timeEntry.clockOutTime != null) {
            val timeFormatter = SimpleDateFormat("h:mm a", Locale.getDefault())
            
            yPosition += drawText("Start Time: ${timeFormatter.format(report.timeEntry.clockInTime)}", normalPaint)
            yPosition += drawText("End Time: ${timeFormatter.format(report.timeEntry.clockOutTime)}", normalPaint)
            
            report.timeEntry.formattedDuration?.let { duration ->
                yPosition += drawText("Total Duration: $duration", Paint().apply {
                    color = Color.BLACK
                    textSize = 14f
                    textAlign = Paint.Align.LEFT
                    typeface = Typeface.DEFAULT_BOLD
                    isAntiAlias = true
                })
            }
        }
        
        yPosition += 20
        yPosition += drawLine()
        
        // Job Notes Section
        if (report.jobNotes.isNotEmpty()) {
            yPosition += drawText("DETAILED NOTES", headerPaint)
            yPosition += drawText(report.jobNotes, smallPaint)
            yPosition += 20
            yPosition += drawLine()
        }
        
        // AI Summary Section
        if (report.aiSummary.isNotEmpty()) {
            yPosition += drawText("WORK SUMMARY", headerPaint)
            yPosition += drawText(report.aiSummary, smallPaint)
            yPosition += 20
            yPosition += drawLine()
        }
        
        // Footer
        val footerY = canvas.height - margin - 40
        yPosition = footerY
        
        val currentDate = Date()
        val reportDateFormatter = SimpleDateFormat("MMM d, yyyy 'at' h:mm a", Locale.getDefault())
        
        yPosition += drawText("Report generated on ${reportDateFormatter.format(currentDate)}", footerPaint)
        yPosition += drawText("ICAV Time Tracker App", footerPaint)
    }
    
    fun generateFileName(report: JobReport): String {
        val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val dateString = dateFormatter.format(report.workDate)
        
        // Sanitize customer name for filename
        val sanitizedCustomer = report.customerName
            .replace(" ", "_")
            .replace("[^a-zA-Z0-9_-]".toRegex(), "")
        
        return "ICAV_Job_Summary_${sanitizedCustomer}_$dateString.pdf"
    }
    
    suspend fun saveToExternalStorage(pdfData: ByteArray, fileName: String): File? = withContext(Dispatchers.IO) {
        try {
            val downloadsDir = File(context.getExternalFilesDir(null), "ICAV_Reports")
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            
            val pdfFile = File(downloadsDir, fileName)
            val outputStream = FileOutputStream(pdfFile)
            outputStream.write(pdfData)
            outputStream.close()
            
            pdfFile
        } catch (e: IOException) {
            e.printStackTrace()
            null
        }
    }
    
    fun createJobReport(timeEntry: TimeEntry, jobNotes: String, aiSummary: String): JobReport {
        return JobReport(
            timeEntry = timeEntry,
            jobNotes = jobNotes,
            aiSummary = aiSummary,
            technicianName = timeEntry.technicianName,
            customerName = timeEntry.customerName,
            workDate = timeEntry.clockInTime ?: timeEntry.clockOutTime ?: Date()
        )
    }
} 