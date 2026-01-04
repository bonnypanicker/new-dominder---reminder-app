import os

file_path = r"c:\Reminder\dominder4\new-dominder---reminder-app\plugins\with-alarm-module.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix AlarmActivity.kt
# Locate the handleDone block and the Intent creation
search_str = 'putExtra("reminderId", reminderId)'
replace_str = 'putExtra("reminderId", reminderId)\n            putExtra("title", title)\n            putExtra("priority", priority)'

# We need to be careful to only replace it inside AlarmActivity.kt handleDone
# But reminderId is common. 
# Let's find the specific context: 'val intent = Intent("app.rork.dominder.ALARM_DONE").apply {'
# The next lines should contain putExtra("reminderId", reminderId)

marker = 'val intent = Intent("app.rork.dominder.ALARM_DONE").apply {'
parts = content.split(marker)

if len(parts) > 1:
    # process parts[1] (which is after the marker)
    # The first occurrence of putExtra("reminderId", reminderId) inside parts[1] is the one in handleDone (or close enough)
    # Actually, marker appears in handleDone.
    
    # We want to replace the FIRST occurrence of search_str in parts[1]
    # But wait, indentations.
    # The file has indentation. search_str doesn't match indentation unless we include it or Regex.
    # Let's use simple find/replace with indentation handling.
    
    # find exact string with indentation
    import re
    
    # Regex for: optional whitespace + putExtra("reminderId", reminderId)
    # We want to insert title/priority with same indentation
    
    match = re.search(r'(\s+)putExtra\("reminderId", reminderId\)', parts[1])
    if match:
        indent = match.group(1)
        insertion = f'{indent}putExtra("title", title)\n{indent}putExtra("priority", priority)'
        # Replace the match with match + insertion (actually insertion should follow)
        
        # New block:
        # indent + putExtra(...)
        # indent + putExtra(title)
        # indent + putExtra(priority)
        
        original_text = match.group(0) # indent + putExtra("reminderId", reminderId)
        new_text = f'{original_text}\n{insertion}'
        
        parts[1] = parts[1].replace(original_text, new_text, 1) # Replace only first occurrence
        print("Fixed AlarmActivity.kt")
        
    content = marker.join(parts)
else:
    print("Could not find ALARM_DONE intent marker")

# Fix AlarmReceiver.kt
# Search for .setAutoCancel(true) inside AlarmReceiver section
# This string might appear in other files, so we should narrow down to AlarmReceiver.kt
# AlarmReceiver.kt starts with "path: 'alarm/AlarmReceiver.kt',"

receiver_marker = "path: 'alarm/AlarmReceiver.kt',"
parts_rec = content.split(receiver_marker)

if len(parts_rec) > 1:
    # parts_rec[1] contains AlarmReceiver content
    # Look for .setAutoCancel(true)
    # And REPLACE it with .setOngoing(true) .setAutoCancel(false)
    # Note: previous content had comments like // FIX: ...
    
    # We specifically want to match the line .setAutoCancel(true)
    # Regex: (\s+)\.setAutoCancel\(true\)
    
    match_rec = re.search(r'(\s+)\.setAutoCancel\(true\)', parts_rec[1])
    if match_rec:
        indent = match_rec.group(1)
        # We also want to changing surrounding comments if possible, but let's just do the code logic.
        # We will disable AutoCancel and Enable Ongoing.
        
        replacement_code = f'{indent}.setOngoing(true)\n{indent}.setAutoCancel(false)'
        
        parts_rec[1] = parts_rec[1].replace(match_rec.group(0), replacement_code, 1)
        print("Fixed AlarmReceiver.kt")
        
    content = receiver_marker.join(parts_rec)
else:
    print("Could not find AlarmReceiver.kt marker")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
