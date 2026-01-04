import os

# paths
activity_path = r"c:\Reminder\dominder4\new-dominder---reminder-app\android\app\src\main\java\app\rork\dominder_android_reminder_app\alarm\AlarmActivity.kt"
receiver_path = r"c:\Reminder\dominder4\new-dominder---reminder-app\android\app\src\main\java\app\rork\dominder_android_reminder_app\alarm\AlarmReceiver.kt"

# Fix AlarmActivity.kt
if os.path.exists(activity_path):
    with open(activity_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Look for ALARM_DONE intent block in handleDone
    # We look for: putExtra("reminderId", reminderId)
    # inside handleDone (implied by unique occurrence or context).
    # Since we can't easily parse functions with regex, we assume the one near ALARM_DONE string is correct.
    
    # We'll use a specific marker: 
    marker = 'val intent = Intent("app.rork.dominder.ALARM_DONE").apply {'
    if marker in content:
        # Check if title is already there to avoid double patching
        # Searching ahead from marker
        idx = content.find(marker)
        chunk = content[idx:idx+500]
        if 'putExtra("title", title)' in chunk:
            print("AlarmActivity.kt already has title")
        else:
            # We need to insert it.
            # Find putExtra("reminderId", reminderId)
            import re
            pattern = r'(\s+)putExtra\("reminderId", reminderId\)'
            match = re.search(pattern, content[idx:]) # search starting from marker
            if match:
                # Calculate absolute position
                start_pos = idx + match.start()
                end_pos = idx + match.end()
                indent = match.group(1)
                
                original_text = match.group(0)
                insertion = f'{indent}putExtra("title", title)\n{indent}putExtra("priority", priority)'
                
                # We replace strictly that occurrence
                new_chunk = f'{original_text}\n{insertion}'
                
                # Reconstruct content
                content = content[:start_pos] + new_chunk + content[end_pos:]
                
                with open(activity_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print("Fixed AlarmActivity.kt on disk")
    else:
        print("Marker ALARM_DONE not found in AlarmActivity.kt")
else:
    print(f"File not found: {activity_path}")

# Fix AlarmReceiver.kt
if os.path.exists(receiver_path):
    with open(receiver_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Look for .setAutoCancel(true)
    if '.setAutoCancel(true)' in content:
        # Check if already patched?
        if '.setOngoing(true)' in content and '.setAutoCancel(false)' in content:
            print("AlarmReceiver.kt already patched")
        else:
            # Look for the line .setAutoCancel(true)
            # Regex: (\s+)\.setAutoCancel\(true\)
            import re
            match = re.search(r'(\s+)\.setAutoCancel\(true\)', content)
            if match:
                indent = match.group(1)
                replacement = f'{indent}.setOngoing(true)\n{indent}.setAutoCancel(false)'
                content = content.replace(match.group(0), replacement, 1)
                
                with open(receiver_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print("Fixed AlarmReceiver.kt on disk")
    else:
        print("setAutoCancel(true) not found in AlarmReceiver.kt")
else:
    print(f"File not found: {receiver_path}")
