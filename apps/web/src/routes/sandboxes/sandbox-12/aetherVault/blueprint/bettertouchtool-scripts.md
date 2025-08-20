# BetterTouchTool Scripts for AtomicAether Sandbox 7

## Text Capture Script (CTRL+OPTION+C)

```applescript
tell application "System Events" to keystroke "c" using command down
delay 0.1
set theText to the clipboard
set encodedText to do shell script "echo " & quoted form of theText & " | python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))'"
do shell script "open 'http://localhost:5174/play/sandbox-7?action=captureText&data=" & encodedText & "'"
```

## Screenshot Capture Script (CTRL+OPTION+S)

```applescript
-- Interactive screenshot with crosshair selection
do shell script "screencapture -i -c"
delay 0.5

-- Check if user actually took a screenshot (didn't cancel)
try
    do shell script "osascript -e 'the clipboard as «class PNGf»'"
    -- If we get here, there's a PNG on clipboard, send it to AtomicAether
    do shell script "open 'http://localhost:5174/play/sandbox-8?action=captureImage&data=clipboard'"
on error
    -- User cancelled the screenshot, do nothing
end try
```

## File Capture Script (CTRL+OPTION+F)

```applescript
-- Get the selected file in Finder
tell application "Finder"
    try
        set selectedItems to selection
        if (count of selectedItems) > 0 then
            set selectedFile to item 1 of selectedItems
            set filePath to POSIX path of (selectedFile as alias)
            set encodedPath to do shell script "echo " & quoted form of filePath & " | python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))'"
            do shell script "open 'http://localhost:5174/play/sandbox-8?action=captureFile&data=" & encodedPath & "'"
        end if
    on error
        -- No file selected or Finder not active, do nothing
    end try
end tell
```

## URL Capture Script (CTRL+OPTION+U)

```applescript
set currentURL to ""

-- Try Safari first
try
    tell application "Safari"
        set currentURL to URL of current tab of front window
    end tell
on error
    set currentURL to ""
end try

-- Try Chrome if Safari failed
if currentURL is "" then
    try
        tell application "Google Chrome"
            set currentURL to URL of active tab of front window
        end tell
    on error
        set currentURL to ""
    end try
end if

-- Send URL to AtomicAether
if currentURL is not "" then
    set baseURL to "http://localhost:5174/play/sandbox-8?action=captureUrl&data="
    set fullURL to baseURL & currentURL
    do shell script "open " & quoted form of fullURL
else
    display dialog "No URL found in Safari or Chrome"
end if
```

**Note:** Firefox has limited AppleScript support and doesn't expose URLs through standard commands. This script works with Safari and Chrome only.

## Scrolling Screenshot Script (CTRL+OPTION+D)

```applescript
-- Hijack clipboard after Shottr scrolling screenshot
try
    -- First trigger Shottr's scrolling screenshot (CTRL+OPTION+A)
    tell application "System Events"
        key code 0 using {control down, option down} -- 'A' key
    end tell
    
    -- Wait a moment for Shottr to capture and save to clipboard
    delay 3
    
    -- Check if clipboard has image data and send to AtomicAether
    do shell script "osascript -e 'the clipboard as «class PNGf»'"
    do shell script "open 'http://localhost:5174/play/sandbox-8?action=captureScrollingImage&data=clipboard'"
    
on error
    -- Silent failure - no dialogs
end try
```

**Note:** This script uses [Shottr](https://shottr.cc/) for scrolling screenshots. Shottr's maximum pixel limit can be configured in its preferences.

## Setup Instructions

1. Open BetterTouchTool
2. Add New Trigger → Keyboard → Key Sequence
3. Record CTRL+OPTION+C 
4. Set Action: "Run Apple Script (async in background)"
5. Copy-paste the Text Capture Script above
6. Save

Repeat for CTRL+OPTION+S with the Screenshot Capture Script.

## Target URL
http://localhost:5173/play/sandbox-7

Make sure the dev server is running with `npm run dev` before testing.