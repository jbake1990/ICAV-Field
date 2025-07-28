# OpenAI API Key Setup

To enable AI summarization features in the mobile apps, you need to configure your OpenAI API key.

## Getting an OpenAI API Key

1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Navigate to "API Keys" in your account settings
4. Create a new API key
5. Copy the key (you won't be able to see it again)

## Setting Up API Keys

### iOS App
1. Open `ICAV Time Tracker/ICAV Time Tracker/OpenAIService.swift`
2. Find the line: `private let apiKey = "YOUR_OPENAI_API_KEY_HERE"`
3. Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key
4. Example: `private let apiKey = "sk-proj-abcd1234..."`

### Android App
1. Open `Android App/app/src/main/java/com/example/icavtimetracker/OpenAIService.kt`
2. Find the line: `private val apiKey = "YOUR_OPENAI_API_KEY_HERE"`
3. Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key
4. Example: `private val apiKey = "sk-proj-abcd1234..."`

## Security Note

⚠️ **Important**: In production applications, API keys should be stored securely using:
- iOS: Keychain Services
- Android: Encrypted SharedPreferences or Android Keystore
- Server-side proxy: Make API calls from your backend instead of mobile apps

For development and testing, the current approach is acceptable, but consider implementing proper security before production deployment.

## API Usage and Costs

- The apps use the `gpt-3.5-turbo` model
- Typical job summary costs ~$0.001-0.003 per request
- Monitor usage in your OpenAI dashboard
- Set usage limits if needed

## Testing the Integration

1. Build and install the app on a physical device
2. Clock in to a job and attempt to clock out
3. Enter job notes (typed or voice)
4. Tap "Summarize" to test the AI integration
5. The summary should appear with customer name, work description, and follow-up steps

## Troubleshooting

**"OpenAI API key not configured"**
- Check that you've replaced the placeholder with your actual API key
- Ensure there are no extra spaces or quotes

**"Invalid API key"**
- Verify the API key is correct
- Check that your OpenAI account has billing set up
- Ensure the API key hasn't expired

**"Rate limit exceeded"**
- You've hit OpenAI's usage limits
- Wait a few minutes and try again
- Check your OpenAI dashboard for usage details

**Network errors**
- Check internet connection
- Verify OpenAI services are operational
- Check device firewall/proxy settings 