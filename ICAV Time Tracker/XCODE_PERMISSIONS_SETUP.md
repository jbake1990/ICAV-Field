# iOS Permissions Setup in Xcode

The Info.plist file conflict has been resolved by removing the manual Info.plist file. You now need to add the required permissions directly in Xcode project settings.

## Required Permissions for Speech Recognition

Follow these steps to add the necessary permissions:

### 1. Open Xcode Project
- Open `ICAV Time Tracker.xcodeproj` in Xcode
- Select the **ICAV Time Tracker** target in the project navigator

### 2. Add Info.plist Entries
- Go to the **Info** tab
- Under **Custom iOS Target Properties**, click the **+** button to add new entries:

#### Add Microphone Permission:
1. **Key**: `NSMicrophoneUsageDescription`
2. **Type**: `String`
3. **Value**: `This app needs access to the microphone to record your voice for job notes.`

#### Add Speech Recognition Permission:
1. **Key**: `NSSpeechRecognitionUsageDescription`
2. **Type**: `String`
3. **Value**: `This app uses speech recognition to convert your voice to text for job notes.`

### 3. Alternative Method (Info.plist Source)
If you prefer editing the raw plist:
1. Right-click on **Info.plist** entries
2. Select **Open As** → **Source Code**
3. Add these entries inside the `<dict>` tag:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to the microphone to record your voice for job notes.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>This app uses speech recognition to convert your voice to text for job notes.</string>
```

### 4. Verify Setup
After adding the permissions:
1. Clean Build Folder (**Product** → **Clean Build Folder**)
2. Build and run the project
3. The speech-to-text functionality should now work properly

### 5. Testing Permissions
When you first use the voice input feature:
1. The app will prompt for microphone permission
2. The app will prompt for speech recognition permission
3. Grant both permissions to enable voice-to-text functionality

## Troubleshooting

**If build errors persist:**
1. Delete Derived Data: **Window** → **Organizer** → **Projects** → Select project → **Delete Derived Data**
2. Clean Build Folder: **Product** → **Clean Build Folder**
3. Restart Xcode

**If permissions don't work:**
1. Check that both permission strings are added correctly
2. Verify the app is running on a physical device (speech recognition requires real hardware)
3. Check iOS Simulator limitations (some features may not work in simulator)

## Important Notes

- **Physical Device Required**: Speech recognition requires a physical iOS device
- **iOS Version**: Speech recognition requires iOS 10.0 or later
- **Privacy**: These permissions are required by Apple for apps using microphone and speech features
- **User Experience**: Clear permission descriptions help users understand why access is needed 