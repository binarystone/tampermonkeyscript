# tampermonkeyscript

Tampermonkey userscript that plays a persistent audible alarm when new emails arrive in Outlook on the web.

## What it does
- Monitors Outlook Web (`outlook.office.com` and `outlook.live.com`) for increases in unread count
- Plays a looping alarm when new mail is detected
- Alarm continues until you click Stop (no auto-timeout)
- Includes embedded base64 audio tones only (no external links)
- Debug overlay with recent logs and quick controls (Test, Stop, Debug)

## Install
1. Install Tampermonkey extension in your browser.
2. Create a new userscript and paste the contents of `tampermonkey-outlook.js`.
3. Save and enable the script.

## Usage
1. Open Outlook on the web and sign in.
2. The script initializes automatically and starts monitoring.
3. Use the floating controls:
   - Test Alarm: triggers the alarm manually
   - Stop Alarm: stops the alarm
   - Debug: toggles the debug log overlay

Note: Some browsers block autoplay — click the on-screen "CLICK TO PLAY EMAIL ALERT" button once to grant audio permission.
