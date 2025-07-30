# API Key Security Setup

## 🔒 Secure Configuration Implementation

This project uses secure configuration files to protect sensitive API keys and credentials from being exposed in source control.

## 📁 File Structure

### Protected Files (Not Committed)
- `ICAV Time Tracker/ICAV Time Tracker/Config.swift` - iOS configuration
- `Android App/app/src/main/java/com/example/icavtimetracker/Config.kt` - Android configuration

### Template Files (Safe to Commit)
- `ICAV Time Tracker/ICAV Time Tracker/Config.swift.template` - iOS template
- `Android App/app/src/main/java/com/example/icavtimetracker/Config.kt.template` - Android template

## 🚀 Setup Instructions

### For New Developers

1. **Copy the template files:**
   ```bash
   # iOS
   cp "ICAV Time Tracker/ICAV Time Tracker/Config.swift.template" "ICAV Time Tracker/ICAV Time Tracker/Config.swift"
   
   # Android
   cp "Android App/app/src/main/java/com/example/icavtimetracker/Config.kt.template" "Android App/app/src/main/java/com/example/icavtimetracker/Config.kt"
   ```

2. **Add your API keys:**
   - Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Replace `YOUR_OPENAI_API_KEY_HERE` in both config files
   - Update server URLs if needed

3. **Verify .gitignore protection:**
   - Run `git status` - Config files should NOT appear as changes
   - If they do appear, check that .gitignore is properly configured

## 🛡️ Security Features

### ✅ Protected by .gitignore
- Config files are automatically ignored by git
- API keys never get committed to version control
- Safe to work on public repositories

### ✅ Template System
- New developers get clear setup instructions
- No secrets in template files
- Easy onboarding process

### ✅ Runtime Security
- Keys loaded at app startup
- No hardcoded secrets in source code
- Compile-time verification

## ⚠️ Important Notes

1. **Never commit Config files:** They contain real API keys
2. **Share keys securely:** Use encrypted channels (not Slack/email)
3. **Rotate keys regularly:** Generate new keys periodically
4. **Monitor usage:** Check OpenAI dashboard for unexpected usage

## 🔧 Troubleshooting

### "Config not found" errors
- Ensure you've copied the template files
- Check file names match exactly (case-sensitive)
- Verify files are in correct directories

### Git shows Config files
- Check .gitignore syntax
- Ensure paths are correct with proper escaping
- Run `git rm --cached Config.swift Config.kt` if already tracked

### OpenAI API errors
- Verify API key is correct (starts with sk-proj-)
- Check OpenAI account has billing set up
- Ensure key has proper permissions

## 📞 Support

If you need access to API keys or encounter setup issues, contact the project maintainer securely.