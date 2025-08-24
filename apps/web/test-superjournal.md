# SuperJournal Test Plan

## Test Steps:

1. **Open browser**: http://localhost:5175/
2. **Check console** for SuperJournal initialization messages
3. **Send a test message**: "Testing SuperJournal persistence"
4. **Watch console** for:
   - "🧠 SuperJournal: Captured turn X"
   - "🧠 SuperJournal: Written to R2: ..."
5. **Refresh browser** (Cmd+R)
6. **Verify message persists** after refresh

## Expected Results:
- Messages should be saved to R2
- After refresh, historical messages should load from SuperJournal
- Console should show: "📜 Loaded X historical message pairs"

## What to look for in Console:
```
🧠 SuperJournal: Initializing deep memory system...
🧠 SuperJournal: Deep memory initialized. Session: [id]
🧠 SuperJournal: Captured turn 1
🧠 SuperJournal: Written to R2: superjournal/2025/01/23/[id].json
📜 Loading historical messages from SuperJournal...
📜 Loaded 1 historical message pairs
```