# Azure OpenAI Setup Guide

## Environment Variables Configuration

The TWIX backend now uses environment variables to securely manage Azure OpenAI API credentials.

### Step 1: Install Dependencies

Install python-dotenv:

```bash
pip install python-dotenv
```

Or reinstall the package:

```bash
cd TWIX
pip install -e .
```

### Step 2: Configure Environment Variables

A `.env` file has been created in the `TWIX/` directory with your Azure OpenAI credentials:

```
AZURE_OPENAI_KEY=your_key_here
AZURE_API_VERSION=2024-12-01-preview
AZURE_ENDPOINT=https://doc-index.cognitiveservices.azure.com/
DEPLOYMENT_NAME=gpt-4.1-mini
```

**⚠️ Important:** The `.env` file is automatically excluded from Git via `.gitignore`. Never commit API keys!

### Step 3: Restart Backend Server

After configuring the `.env` file, restart your Flask backend:

```bash
cd TWIX
python app.py
```

## Usage

The Azure OpenAI model is available at:

```python
from twix.models.gpt_41_mini_azure import gpt_41_mini_azure

# Use the model
response = gpt_41_mini_azure(
    input=["system prompt", "user prompt"],
    max_tokens=800,
    temperature=0
)
```

## Security Notes

### ✅ What's Protected:
- `.env` file is in `.gitignore`
- API keys are never hardcoded
- Environment variables are loaded securely

### ⚠️ Important Reminders:
- Never commit `.env` file
- Rotate API keys if accidentally exposed
- Don't share `.env` file contents

## Troubleshooting

### Error: "AZURE_OPENAI_KEY not found in environment variables"

**Solution:** Make sure:
1. The `.env` file exists in `/Users/asbah/Desktop/TWIX-fork/TWIX/`
2. The file contains all required variables
3. The backend server was restarted after creating `.env`

### Error: "Incorrect API key provided"

**Solution:** 
1. Verify the API key in `.env` is correct
2. Check there are no extra spaces or quotes
3. Ensure the key hasn't expired

### Error: "Module 'dotenv' has no attribute 'load_dotenv'"

**Solution:**
```bash
pip install python-dotenv
```

## Migration from Key File

If you were previously using a key file at `/Users/yiminglin/Documents/...`:

1. ✅ The new `.env` approach is now active
2. ✅ You can safely delete the old key file (optional)
3. ✅ No code changes needed - it's automatic

## Alternative: System Environment Variables

Instead of `.env` file, you can set system-wide variables:

```bash
export AZURE_OPENAI_KEY="your_key_here"
export AZURE_API_VERSION="2024-12-01-preview"
export AZURE_ENDPOINT="https://doc-index.cognitiveservices.azure.com/"
export DEPLOYMENT_NAME="gpt-4.1-mini"
```

Then restart the backend server.

---

**Status:** ✅ Azure OpenAI is now configured with secure environment variables!
