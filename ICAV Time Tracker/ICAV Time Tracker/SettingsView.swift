//
//  SettingsView.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var username = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    @State private var isTestingConnection = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var alertTitle = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Account Credentials") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Username")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        TextField("Enter your username", text: $username)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        HStack {
                            if isPasswordVisible {
                                TextField("Enter your password", text: $password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                            } else {
                                SecureField("Enter your password", text: $password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                            }
                            
                            Button(action: {
                                isPasswordVisible.toggle()
                            }) {
                                Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    
                    Button(action: testConnection) {
                        HStack {
                            if isTestingConnection {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "network")
                            }
                            Text("Test Connection")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(username.isEmpty || password.isEmpty || isTestingConnection)
                }
                
                Section("Authentication Status") {
                    HStack {
                        Image(systemName: authManager.isAuthenticated ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundColor(authManager.isAuthenticated ? .green : .red)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(authManager.isAuthenticated ? "Authenticated" : "Not Authenticated")
                                .font(.headline)
                            
                            if let user = authManager.currentUser {
                                Text("Logged in as: \(user.displayName)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                    }
                    
                    HStack {
                        Image(systemName: authManager.isOnline ? "wifi" : "wifi.slash")
                            .foregroundColor(authManager.isOnline ? .green : .orange)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(authManager.isOnline ? "Online" : "Offline")
                                .font(.headline)
                            
                            Text(authManager.isOnline ? "Connected to server" : "No internet connection")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                }
                
                Section("Actions") {
                    Button("Save Credentials") {
                        saveCredentials()
                    }
                    .disabled(username.isEmpty || password.isEmpty)
                    
                    if authManager.isAuthenticated {
                        Button("Logout") {
                            authManager.logout()
                            dismiss()
                        }
                        .foregroundColor(.red)
                    }
                }
                
                Section("Information") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your credentials are stored securely on your device and will be used automatically for all server communications.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("The app will attempt to authenticate with the server each time it starts or when making API calls.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    dismiss()
                },
                trailing: Button("Done") {
                    dismiss()
                }
            )
            .onAppear {
                loadSavedCredentials()
            }
            .alert(alertTitle, isPresented: $showingAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private func loadSavedCredentials() {
        // Load saved credentials from UserDefaults
        let userDefaults = UserDefaults.standard
        username = userDefaults.string(forKey: "savedUsername") ?? ""
        password = userDefaults.string(forKey: "savedPassword") ?? ""
    }
    
    private func saveCredentials() {
        let userDefaults = UserDefaults.standard
        userDefaults.set(username, forKey: "savedUsername")
        userDefaults.set(password, forKey: "savedPassword")
        
        // Test the credentials immediately
        testConnection()
    }
    
    private func testConnection() {
        guard !username.isEmpty && !password.isEmpty else { return }
        
        isTestingConnection = true
        
        Task {
            do {
                let authResponse = try await authManager.apiService.login(username: username, password: password)
                let user = authManager.apiService.convertToUser(authResponse.user)
                
                await MainActor.run {
                    authManager.currentUser = user
                    authManager.isAuthenticated = true
                    authManager.authToken = authResponse.token
                    authManager.tokenExpiresAt = authManager.parseExpiresAt(authResponse.expiresAt)
                    authManager.lastTokenVerification = Date()
                    authManager.saveUser()
                    
                    alertTitle = "Success"
                    alertMessage = "Credentials saved and authentication successful!"
                    showingAlert = true
                    isTestingConnection = false
                }
                
            } catch {
                await MainActor.run {
                    alertTitle = "Authentication Failed"
                    alertMessage = "Invalid credentials or network error. Please check your username and password."
                    showingAlert = true
                    isTestingConnection = false
                }
            }
        }
    }
}
