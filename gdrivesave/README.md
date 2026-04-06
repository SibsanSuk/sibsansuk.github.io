# Game Data Saver - Setup Guide

## Overview
This is a simple HTML+JS application that saves and loads game data to/from Google Drive, similar to how draw.io works.

## Features
- ✅ Sign in with Google
- 💾 Save game data to Google Drive
- 🔄 Load saved games from Google Drive
- 🗑️ Delete old saves
- 📊 Store JSON game data
- 🎮 Example with Player Name, Level, Score, and Custom Game Data

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project"
3. Enter project name (e.g., "GameSaver") and click Create
4. Wait for the project to be created

### Step 2: Enable Google Drive API

1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Drive API"
3. Click on it and click "ENABLE"

### Step 3: Create OAuth 2.0 Credentials

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted to create OAuth consent screen:
   - Click "Create OAuth consent screen"
   - Choose "External" as User Type
   - Fill in required fields (App name, User support email, Developer contact)
   - Click "Save and Continue"
   - Skip scopes and click "Save and Continue"
   - Click "Back to Dashboard"

4. After OAuth consent screen is created, go back to create OAuth client ID:
   - Select "Web application"
   - Add Authorized JavaScript origins:
     - `http://localhost:8000`
     - `http://localhost:3000`
     - `http://127.0.0.1:8000`
     - Your actual domain if deploying online
   - Add Authorized redirect URIs:
     - Same as above
   - Click "Create"

5. Copy the **Client ID** from the popup or credentials page

### Step 4: Update the HTML File

Open `index.html` and replace these lines (around line 286-287):

```javascript
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // Replace with your Client ID
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your API Key
```

With your actual credentials:
- **Client ID**: From OAuth credentials you just created
- **API Key**: From API Keys section in Google Cloud Console

### Step 5: Run the Application

#### Option A: Python (Easiest)
```bash
cd /path/to/gdrivesave
# Python 3
python -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000 in your browser

#### Option B: Node.js
```bash
npm install -g http-server
http-server
```

#### Option C: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Step 6: Get API Key (if needed)

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the key (you might not need this for most cases, but it's optional)

## Usage

1. **Sign In**: Click "Sign in with Google"
2. **Create Game Save**: 
   - Enter Player Name
   - Set Level
   - Set Score
   - Add game data as JSON
   - Click "Save to Google Drive"
3. **Load Game**: 
   - Click "Refresh Files" to see saved games
   - Click "Load" on any save file to restore it
4. **Delete Save**: 
   - Click "Delete" to remove a save file

## Game Data Format

Each save includes:
```json
{
  "playerName": "Hero",
  "level": 5,
  "score": 1000,
  "gameData": {
    "inventory": ["sword", "shield"],
    "position": {"x": 100, "y": 200},
    "health": 100
  },
  "savedAt": "4/6/2026, 10:30:45 AM"
}
```

You can modify the `gameData` field to store any JSON structure you need.

## Example: Integration with Your Game

### Modify for your game:
```javascript
// Before saving
const gameData = {
  "level": currentLevel,
  "playerX": player.x,
  "playerY": player.y,
  "enemies": enemyList.map(e => ({x: e.x, y: e.y})),
  "inventory": playerInventory,
  "health": playerHealth
};

document.getElementById('gameData').value = JSON.stringify(gameData);
saveGameData();

// After loading
const button = document.querySelector('[onclick*="loadGameData"]');
button.click();
const loaded = JSON.parse(document.getElementById('gameData').value);
currentLevel = loaded.level;
player.x = loaded.playerX;
// ... restore other data
```

## Troubleshooting

### "Failed to sign in" error
- Make sure Client ID is correct
- Check that authorized origins/URIs are correct in Google Cloud Console
- Make sure you're running on localhost (or an authorized domain)

### Files won't save
- Check browser console (F12 → Console) for errors
- Verify Google Drive API is enabled
- Make sure it's a "Web application" credential, not something else

### "Unauthorized" error
- Your OAuth consent screen might need verification
- For development with "External" apps, add test users in the OAuth consent screen settings

## Security Notes

⚠️ **For Production:**
- Never commit `CLIENT_ID` and `API_KEY` to public repositories
- Set up proper OAuth consent screen and get verification if needed
- Use environment variables or a backend server to keep credentials private
- Implement proper error handling and user validation

## File Structure

```
gdrivesave/
├── index.html          # Main application file
└── README.md          # This file
```

## Browser Compatibility
- Chrome ✅
- Firefox ✅
- Safari ✅
- Edge ✅

## License
Free to use and modify for your projects.

---

Made with ❤️ for game developers!
