package com.example.icavtimetracker

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class ShareManager(private val context: Context) {
    
    companion object {
        private const val FILE_PROVIDER_AUTHORITY = "com.example.icavtimetracker.fileprovider"
    }
    
    suspend fun sharePDF(pdfFile: File, title: String = "Share Job Summary"): Intent? = withContext(Dispatchers.IO) {
        try {
            // Use FileProvider to create a content URI for the PDF file
            val uri = FileProvider.getUriForFile(
                context,
                FILE_PROVIDER_AUTHORITY,
                pdfFile
            )
            
            createShareIntent(uri, "application/pdf", title)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    suspend fun sharePDFFromByteArray(
        pdfData: ByteArray, 
        fileName: String,
        title: String = "Share Job Summary"
    ): Intent? = withContext(Dispatchers.IO) {
        try {
            // Save to temporary file first
            val tempFile = File(context.cacheDir, fileName)
            tempFile.writeBytes(pdfData)
            
            sharePDF(tempFile, title)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    fun shareText(text: String, title: String = "Share Text"): Intent {
        return Intent().apply {
            action = Intent.ACTION_SEND
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            putExtra(Intent.EXTRA_SUBJECT, title)
        }.let {
            Intent.createChooser(it, title)
        }
    }
    
    private fun createShareIntent(uri: Uri, mimeType: String, title: String): Intent {
        return Intent().apply {
            action = Intent.ACTION_SEND
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, title)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }.let {
            Intent.createChooser(it, title)
        }
    }
    
    fun cleanupTempFiles() {
        try {
            val cacheDir = context.cacheDir
            val tempFiles = cacheDir.listFiles { file ->
                file.name.startsWith("ICAV_Job_Summary_") && file.extension == "pdf"
            }
            
            tempFiles?.forEach { file ->
                if (file.lastModified() < System.currentTimeMillis() - 24 * 60 * 60 * 1000) { // 24 hours old
                    file.delete()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Creates a share intent for multiple files
     */
    suspend fun shareMultiplePDFs(
        pdfFiles: List<File>,
        title: String = "Share Job Summaries"
    ): Intent? = withContext(Dispatchers.IO) {
        try {
            if (pdfFiles.isEmpty()) return@withContext null
            
            val uris = pdfFiles.map { file ->
                FileProvider.getUriForFile(
                    context,
                    FILE_PROVIDER_AUTHORITY,
                    file
                )
            }
            
            Intent().apply {
                action = Intent.ACTION_SEND_MULTIPLE
                type = "application/pdf"
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
                putExtra(Intent.EXTRA_SUBJECT, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }.let {
                Intent.createChooser(it, title)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    /**
     * Get common sharing apps package names for filtering if needed
     */
    object CommonSharingApps {
        const val GMAIL = "com.google.android.gm"
        const val EMAIL = "com.android.email"
        const val MESSAGES = "com.google.android.apps.messaging"
        const val WHATSAPP = "com.whatsapp"
        const val SLACK = "com.slack"
        const val TEAMS = "com.microsoft.teams"
        const val DRIVE = "com.google.android.apps.docs"
        const val DROPBOX = "com.dropbox.android"
        const val ONEDRIVE = "com.microsoft.skydrive"
    }
} 