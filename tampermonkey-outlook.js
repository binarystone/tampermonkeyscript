// ==UserScript==
// @name         Outlook Web Email Alarm (DEBUG)
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  AUTOPLAY FIX - One-click autoplay enable, no more popups, enhanced audio context
// @author       You
// @match        https://outlook.office.com/*
// @match        https://outlook.live.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // MULTIPLE ALARM AUDIO (embedded only; no external links)
    const AUDIO_URLS = [
        // Base64-embedded WAV beeps (fallbacks included)
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+D2u2UPGDGG0vDGdSEGHnLA7+ORUA4oXbPl9a9gHAgya8L9w2sXBxV+yY7fk00NTKzr8N5qCQ==', // Beep A
        'data:audio/wav;base64,UklGRvIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0Ya4AAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+D2u2UPGDGG0vDGdSEGHnLA7+ORUA4oXbPl9a9gHAgyasL9w2sXBxV+yY7fk00NTKzr8N5qCRAMUK/z+6BIEAw=', // Beep B
        'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAAAgICAf39/f39/f4CAgICAgH9/f39/gICAf39/f39/gICAf39/gICAgH9/f4CAgICAgH9/f39/gICAf39/f39/f4CAgA==', // Short tone C
        'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQBwAAEAcAAABAAgAZGF0YQAAAAAAf39/gICAf39/gICAf39/gICAf39/gICAf39/gICAf39/gICAf39/gICAf39/gICAf39/gICAf39/gICAf38=', // Short tone D
    ];
    
    let audio = null;
    let audioContext = null;
    let lastUnreadCount = 0;
    let alarmTimeout = null;
    let isInitialized = false;
    let debugLog = [];
    let autoplayEnabled = false;
    
    // Enhanced logging
    function log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] OUTLOOK ALARM: ${message}`;
        console.log(logMessage);
        debugLog.push(logMessage);
        
        // Keep only last 50 log entries
        if (debugLog.length > 50) {
            debugLog.shift();
        }
        
        // Update debug display
        updateDebugDisplay();
    }
    
    // Create debug display
    function createDebugDisplay() {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'outlook-alarm-debug';
        debugDiv.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            width: 300px;
            max-height: 200px;
            background: rgba(0,0,0,0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 10px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            overflow-y: auto;
            border: 1px solid #333;
        `;
        document.body.appendChild(debugDiv);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 2px;
            right: 5px;
            background: none;
            border: none;
            color: #ff0000;
            cursor: pointer;
            font-size: 16px;
        `;
        closeBtn.onclick = () => debugDiv.style.display = 'none';
        debugDiv.appendChild(closeBtn);
        
        return debugDiv;
    }
    
    // Update debug display
    function updateDebugDisplay() {
        const debugDiv = document.getElementById('outlook-alarm-debug');
        if (debugDiv) {
            const content = debugLog.slice(-10).join('<br>');
            debugDiv.innerHTML = `<button style="position:absolute;top:2px;right:5px;background:none;border:none;color:#ff0000;cursor:pointer;font-size:16px;" onclick="this.parentNode.style.display='none'">×</button>${content}`;
        }
    }
    
    // Initialize audio context for better autoplay support
    function initAudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioContext = new AudioContext();
                log('🎵 Audio context initialized');
            }
        } catch (error) {
            log(`⚠️ Audio context initialization failed: ${error.message}`);
        }
    }
    
    // Resume audio context if suspended
    async function resumeAudioContext() {
        if (audioContext && audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                log('🎵 Audio context resumed');
            } catch (error) {
                log(`⚠️ Failed to resume audio context: ${error.message}`);
            }
        }
    }

    // Test audio with multiple URLs
    async function initAudio() {
        log('Initializing audio...');
        
        // Initialize audio context
        initAudioContext();
        
        for (let i = 0; i < AUDIO_URLS.length; i++) {
            const url = AUDIO_URLS[i];
            log(`Trying audio URL ${i + 1}: ${url.substring(0, 50)}...`);
            
            try {
                const testAudio = new Audio(url);
                testAudio.loop = true;
                testAudio.volume = 1.0;
                testAudio.preload = 'auto';
                
                // Test if it can load
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                    
                    testAudio.addEventListener('canplaythrough', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                    
                    testAudio.addEventListener('error', (e) => {
                        clearTimeout(timeout);
                        reject(e);
                    });
                    
                    testAudio.load();
                });
                
                audio = testAudio;
                log(`✓ Audio loaded successfully from URL ${i + 1}`);
                return;
                
            } catch (error) {
                log(`✗ Audio URL ${i + 1} failed: ${error.message}`);
            }
        }
        
        log('❌ All audio URLs failed to load');
    }
    
    // Force play audio with enhanced autoplay support
    async function forcePlayAudio() {
        if (!audio) {
            log('❌ No audio object available');
            return;
        }
        
        log('🔊 Attempting to play audio...');
        
        // Resume audio context if needed
        await resumeAudioContext();
        
        try {
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                log('✓ Audio playing successfully');
            }
        } catch (error) {
            log(`❌ Audio play failed: ${error.message}`);
            
            // If autoplay is enabled, don't show the manual button
            if (autoplayEnabled) {
                log('⚠️ Autoplay was enabled but still failed - this may be a browser restriction');
            } else {
                showPlayButton();
            }
        }
    }
    
    // Enhanced unread count detection
    function getUnreadCount() {
        // More comprehensive selectors
        const selectors = [
            // Standard Outlook selectors
            '[aria-label="Inbox"] .ms-FocusZone span[title]',
            '[aria-label*="Inbox"] [class*="unread"]',
            '[data-testid="unread-count"]',
            '.ms-Nav-link[aria-label*="Inbox"] .ms-Nav-badge',
            '[data-automationid="inbox-unread-count"]',
            '.ms-Nav-compositeLink[aria-label*="Inbox"] .ms-Nav-badge',
            
            // Generic badge/count selectors
            '.ms-Nav-badge',
            '[class*="badge"]',
            '[class*="count"]',
            '[class*="unread"]',
            
            // Text-based detection
            '*[aria-label*="unread"]',
            '*[title*="unread"]'
        ];
        
        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '';
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const count = parseInt(match[1]);
                        if (count > 0 && count < 10000) { // Reasonable range
                            log(`📧 Found unread count: ${count} (selector: ${selector})`);
                            return count;
                        }
                    }
                }
            } catch (e) {
                // Ignore selector errors
            }
        }
        
        return 0;
    }
    
    // Check for new emails
    function checkForNewEmails() {
        const currentUnread = getUnreadCount();
        
        if (!isInitialized) {
            lastUnreadCount = currentUnread;
            isInitialized = true;
            log(`🚀 Initialized with ${currentUnread} unread emails`);
            return;
        }
        
        log(`📊 Checking: Current=${currentUnread}, Last=${lastUnreadCount}`);
        
        if (currentUnread > lastUnreadCount) {
            const newEmails = currentUnread - lastUnreadCount;
            log(`🆕 NEW EMAIL DETECTED! ${newEmails} new email(s)`);
            playAlarm();
        }
        
        lastUnreadCount = currentUnread;
    }
    
    // Play alarm with enhanced error handling
    function playAlarm() {
        log('🚨 PLAYING ALARM...');
        
        if (!audio) {
            log('❌ No audio available, trying to reinitialize...');
            initAudio().then(() => {
                if (audio) forcePlayAudio();
            });
            return;
        }
        
        // Stop any existing alarm
        stopAlarm();
        
        forcePlayAudio();
        
        // Run indefinitely until user clicks Stop (no auto-stop timer)
    }
    
    // Stop alarm
    function stopAlarm() {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            log('⏹️ Alarm stopped');
        }
        if (alarmTimeout) {
            clearTimeout(alarmTimeout);
            alarmTimeout = null;
        }
    }
    
    // Show manual play button
    function showPlayButton() {
        // Remove existing button
        const existing = document.getElementById('manual-play-btn');
        if (existing) existing.remove();
        
        const playBtn = document.createElement('button');
        playBtn.id = 'manual-play-btn';
        playBtn.textContent = '🔊 CLICK TO PLAY EMAIL ALERT';
        playBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10001;
            background: #ff4444;
            color: white;
            border: none;
            padding: 15px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            animation: pulse 1s infinite;
        `;
        
        // Add pulsing animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        playBtn.onclick = () => {
            log('👆 Manual play button clicked');
            forcePlayAudio();
            playBtn.remove();
        };
        
        document.body.appendChild(playBtn);
        log('🔴 Manual play button shown (autoplay blocked)');
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (playBtn.parentNode) {
                playBtn.remove();
                log('🗑️ Manual play button auto-removed');
            }
        }, 30000);
    }
    
    // Add control buttons
    function addControlButtons() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 9999;
            display: flex;
            gap: 5px;
        `;
        
        // Stop button
        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Alarm';
        stopBtn.style.cssText = `
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        stopBtn.onclick = stopAlarm;
        
        // Test button
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test Alarm';
        testBtn.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        testBtn.onclick = () => {
            log('🧪 Manual test triggered');
            playAlarm();
        };
        
        // Debug toggle button
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug';
        debugBtn.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        debugBtn.onclick = () => {
            const debugDiv = document.getElementById('outlook-alarm-debug');
            if (debugDiv) {
                debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
            }
        };
        
        container.appendChild(stopBtn);
        container.appendChild(testBtn);
        container.appendChild(debugBtn);
        document.body.appendChild(container);
    }
    
    // Enable autoplay with user interaction
    function enableAutoplay() {
        log('🎵 Enabling autoplay with user interaction...');
        
        // Create a one-time click handler to enable autoplay
        const enableButton = document.createElement('button');
        enableButton.textContent = '🔊 Enable Email Alerts (Click Once)';
        enableButton.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10002;
            background: #28a745;
            color: white;
            border: none;
            padding: 20px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: pulse 1s infinite;
        `;
        
        enableButton.onclick = async () => {
            log('👆 User clicked to enable autoplay');
            
            // Resume audio context
            await resumeAudioContext();
            
            // Test audio play to enable autoplay
            if (audio) {
                try {
                    await audio.play();
                    audio.pause();
                    audio.currentTime = 0;
                    autoplayEnabled = true;
                    log('✅ Autoplay enabled successfully');
                } catch (error) {
                    log(`⚠️ Autoplay test failed: ${error.message}`);
                    autoplayEnabled = false;
                }
            }
            
            enableButton.remove();
            
            // Start monitoring after user interaction
            startMonitoring();
        };
        
        document.body.appendChild(enableButton);
        
        // Auto-remove after 10 seconds if not clicked
        setTimeout(() => {
            if (enableButton.parentNode) {
                enableButton.remove();
                log('⚠️ Autoplay enable button auto-removed, starting monitoring anyway');
                startMonitoring();
            }
        }, 10000);
    }
    
    // Start monitoring function
    function startMonitoring() {
        log('👀 Starting email monitoring...');
        
        // Check every 3 seconds
        const checkInterval = setInterval(checkForNewEmails, 3000);
        
        // MutationObserver for real-time detection
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || 
                    (mutation.type === 'attributes' && 
                     ['aria-label', 'title', 'class'].includes(mutation.attributeName))) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                setTimeout(checkForNewEmails, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label', 'title', 'class']
        });
        
        // Initial check after delay
        setTimeout(() => {
            log('🔍 Running initial email check...');
            checkForNewEmails();
        }, 3000);
        
        log('✅ Monitoring started - autoplay should work now');
    }

    // Initialize everything
    async function initialize() {
        log('🚀 Starting Outlook Email Alarm (DEBUG VERSION)');
        log(`📍 URL: ${window.location.href}`);
        log(`🌐 User Agent: ${navigator.userAgent.substring(0, 100)}...`);
        
        // Create debug display
        createDebugDisplay();
        
        // Add control buttons
        addControlButtons();
        
        // Initialize audio
        await initAudio();
        
        // Enable autoplay with user interaction
        enableAutoplay();
        
        log('✅ Initialization complete - waiting for user interaction to enable autoplay');
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 1000);
    }
})();