package com.example.icavtimetracker

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SpeechRecognitionManager(private val context: Context) {
    
    private var speechRecognizer: SpeechRecognizer? = null
    private val recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }
    
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()
    
    private val _recognizedText = MutableStateFlow("")
    val recognizedText: StateFlow<String> = _recognizedText.asStateFlow()
    
    private val _errorMessage = MutableStateFlow("")
    val errorMessage: StateFlow<String> = _errorMessage.asStateFlow()
    
    private val _isAuthorized = MutableStateFlow(false)
    val isAuthorized: StateFlow<Boolean> = _isAuthorized.asStateFlow()
    
    init {
        checkPermissions()
        initializeSpeechRecognizer()
    }
    
    private fun checkPermissions() {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        
        _isAuthorized.value = hasPermission && SpeechRecognizer.isRecognitionAvailable(context)
        
        if (!hasPermission) {
            _errorMessage.value = "Microphone permission required for speech recognition"
        } else if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _errorMessage.value = "Speech recognition not available on this device"
        }
    }
    
    private fun initializeSpeechRecognizer() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                _errorMessage.value = ""
            }
            
            override fun onBeginningOfSpeech() {
                // Speech input detected
            }
            
            override fun onRmsChanged(rmsdB: Float) {
                // Audio level changed
            }
            
            override fun onBufferReceived(buffer: ByteArray?) {
                // Audio buffer received
            }
            
            override fun onEndOfSpeech() {
                _isRecording.value = false
            }
            
            override fun onError(error: Int) {
                _isRecording.value = false
                _errorMessage.value = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                    else -> "Unknown error occurred"
                }
            }
            
            override fun onResults(results: Bundle?) {
                _isRecording.value = false
                results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.let { matches ->
                    if (matches.isNotEmpty()) {
                        _recognizedText.value = matches[0]
                    }
                }
            }
            
            override fun onPartialResults(partialResults: Bundle?) {
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.let { matches ->
                    if (matches.isNotEmpty()) {
                        _recognizedText.value = matches[0]
                    }
                }
            }
            
            override fun onEvent(eventType: Int, params: Bundle?) {
                // Handle events
            }
        })
    }
    
    fun startRecording() {
        if (!_isAuthorized.value) {
            _errorMessage.value = "Speech recognition not authorized"
            return
        }
        
        if (_isRecording.value) {
            return
        }
        
        try {
            _recognizedText.value = ""
            _errorMessage.value = ""
            speechRecognizer?.startListening(recognizerIntent)
            _isRecording.value = true
        } catch (e: Exception) {
            _errorMessage.value = "Failed to start speech recognition: ${e.message}"
            _isRecording.value = false
        }
    }
    
    fun stopRecording() {
        if (!_isRecording.value) {
            return
        }
        
        try {
            speechRecognizer?.stopListening()
            _isRecording.value = false
        } catch (e: Exception) {
            _errorMessage.value = "Failed to stop speech recognition: ${e.message}"
            _isRecording.value = false
        }
    }
    
    fun resetText() {
        _recognizedText.value = ""
        _errorMessage.value = ""
    }
    
    fun clearError() {
        _errorMessage.value = ""
    }
    
    fun destroy() {
        speechRecognizer?.destroy()
        speechRecognizer = null
    }
} 