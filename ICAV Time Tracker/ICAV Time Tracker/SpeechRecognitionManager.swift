import Foundation
import Speech
import AVFoundation

@MainActor
class SpeechRecognitionManager: ObservableObject {
    @Published var isRecording = false
    @Published var recognizedText = ""
    @Published var isAuthorized = false
    @Published var errorMessage = ""
    
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    init() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechRecognizer?.delegate = self
    }
    
    func requestPermissions() async -> Bool {
        // Request speech recognition authorization
        let speechAuth = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { authStatus in
                continuation.resume(returning: authStatus == .authorized)
            }
        }
        
        // Request microphone permission
        let microphoneAuth = await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        
        let authorized = speechAuth && microphoneAuth
        await MainActor.run {
            isAuthorized = authorized
            if !authorized {
                errorMessage = "Speech recognition requires microphone and speech permissions"
            }
        }
        
        return authorized
    }
    
    func startRecording() async {
        guard isAuthorized else {
            let authorized = await requestPermissions()
            guard authorized else { return }
        }
        
        guard !isRecording else { return }
        
        do {
            try await setupAudioSession()
            try startSpeechRecognition()
            isRecording = true
            errorMessage = ""
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
            print("Speech recognition error: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        
        audioEngine.stop()
        recognitionRequest?.endAudio()
        isRecording = false
    }
    
    func resetText() {
        recognizedText = ""
        errorMessage = ""
    }
    
    private func setupAudioSession() async throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    }
    
    private func startSpeechRecognition() throws {
        // Cancel any previous task
        recognitionTask?.cancel()
        recognitionTask = nil
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw SpeechError.recognitionRequestFailed
        }
        recognitionRequest.shouldReportPartialResults = true
        
        // Configure audio engine
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        audioEngine.prepare()
        try audioEngine.start()
        
        // Start recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            Task { @MainActor in
                guard let self = self else { return }
                
                if let result = result {
                    self.recognizedText = result.bestTranscription.formattedString
                    
                    // If result is final, stop recording
                    if result.isFinal {
                        self.stopRecording()
                    }
                }
                
                if let error = error {
                    self.errorMessage = "Recognition error: \(error.localizedDescription)"
                    self.stopRecording()
                }
            }
        }
    }
}

extension SpeechRecognitionManager: SFSpeechRecognizerDelegate {
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        Task { @MainActor in
            if !available {
                errorMessage = "Speech recognition not available"
                stopRecording()
            }
        }
    }
}

enum SpeechError: Error {
    case recognitionRequestFailed
    case audioEngineFailed
    case recognitionTaskFailed
    
    var localizedDescription: String {
        switch self {
        case .recognitionRequestFailed:
            return "Failed to create recognition request"
        case .audioEngineFailed:
            return "Audio engine failed to start"
        case .recognitionTaskFailed:
            return "Recognition task failed"
        }
    }
} 