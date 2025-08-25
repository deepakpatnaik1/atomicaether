# Dual-Bucket System Test

## What to Test

1. **Open** http://localhost:5173/ in your browser
2. **Open Developer Console** (F12 → Console tab)  
3. **Send a test message**: "What is a red dwarf?"
4. **Look for these console messages**:

### Expected Console Output

```
🚀 AtomicAether Main App Starting...
🧠 SuperJournal: Deep memory activated - recording everything forever  
📰 Journal: Machine-trimmed memory activated - dual-bucket storage ready
🗑️ RecycleBin: Trash management system activated
✅ App initialized successfully

[When you send a message:]
🧠 SuperJournal: Captured turn 1
📰 Journal: Captured trimmed turn 1 Priority: medium
🧠 SuperJournal: Written to R2: entries/2025/08/25/turn-12345-1724607337343.json
📰 Journal: Written trim data to R2: conversations/conv_abc123/messages/turn-12345-1724607337343.json
```

## Expected API Calls

### 1. Machine Trim LLM Request
**POST** `/api/llm`
```json
{
  "model": "claude-sonnet-4",
  "messages": [...],
  "stream": true,
  "fileUrls": []
}
```

**Response** should include:
```json
{
  "content": "A red dwarf is a small, cool star...",
  "machineTrim": {
    "fullResponse": "A red dwarf is a small, cool star...",
    "trim": "Boss: What is a red dwarf?\\nSamara: Small cool star, burns slowly, lives trillions years.",
    "metadata": {
      "hasDecisions": false,
      "isInferable": false,
      "priority": "medium"
    }
  }
}
```

### 2. SuperJournal Storage  
**POST** `/api/superjournal/write`
```json
{
  "id": "turn-12345",
  "timestamp": 1724607337343,
  "turnNumber": 1,
  "bossMessage": "What is a red dwarf?",
  "samaraMessage": "A red dwarf is a small, cool star...",
  "metadata": {...}
}
```

### 3. Journal Storage
**POST** `/api/journal`
```json
{
  "id": "turn-12345", 
  "conversationId": "conv_abc123",
  "timestamp": 1724607337343,
  "turnNumber": 1,
  "trim": "Boss: What is a red dwarf?\\nSamara: Small cool star, burns slowly, lives trillions years.",
  "metadata": {
    "hasDecisions": false,
    "isInferable": false,
    "priority": "medium"
  }
}
```

## What Should Work

✅ **LLM responds** with both full content and machine trim data
✅ **SuperJournalBrick** stores full conversation in existing R2 bucket  
✅ **JournalBrick** stores trim data in new `atomicaether-journal` R2 bucket
✅ **Both systems run in parallel** without interfering
✅ **Error handling** works if one system fails

## Verification Commands

After sending a message, you can check:

```bash
# Check Journal API endpoints
curl http://localhost:5173/api/journal/list
curl http://localhost:5173/api/journal/conversation/{conversationId}

# Check SuperJournal (existing)
curl http://localhost:5173/api/superjournal/manifest
curl http://localhost:5173/api/superjournal/read?limit=5
```

## R2 Bucket Check (if you have access)

The Cloudflare R2 dashboard should show:

### SuperJournal Bucket (existing)
```
/entries/2025/08/25/turn-12345-1724607337343.json
```

### atomicaether-journal Bucket (new)
```  
/conversations/conv_abc123/messages/turn-12345-1724607337343.json
/conversations/conv_abc123/metadata.json
/manifests/global.json
```