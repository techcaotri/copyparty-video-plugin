// Copyparty Video.js Plugin - Enhanced with mpegts.js 
// Video.js Version: 8.17.3 (Latest)
// Load with: copyparty --js-browser /path/to/videojs-enhanced-seekfix.js

(function() {
    'use strict';
    
    console.log('Video.js Enhanced Plugin (with mpegts.js - SEEKING FIX + TOUCH) Loading...');
    
    // Only initialize once
    if (window.videojsFinalLoaded) return;
    window.videojsFinalLoaded = true;
    
    // Load Video.js CSS
    const vjsCSS = document.createElement('link');
    vjsCSS.rel = 'stylesheet';
    vjsCSS.href = 'https://vjs.zencdn.net/8.17.3/video-js.css';
    document.head.appendChild(vjsCSS);
    
    // Load Video.js Script
    const vjsScript = document.createElement('script');
    vjsScript.src = 'https://vjs.zencdn.net/8.17.3/video.min.js';
    vjsScript.onload = initVideoJS;
    document.head.appendChild(vjsScript);
    
    // Suppress worker-related console errors that don't affect functionality
    if (window.console && window.console.error) {
        const originalError = window.console.error;
        window.console.error = function(...args) {
            const errorStr = String(args[0] || '');
            
            // Filter out known harmless errors
            if (errorStr.includes('e.data.split is not a function') ||
                errorStr.includes('msg-err:') ||
                errorStr.includes('[object Object]')) {
                // Suppress these specific errors
                return;
            }
            
            // Pass through all other errors
            originalError.apply(console, args);
        };
    }
    
    // Add message event listener to handle worker messages gracefully
    // This needs to be added early with capture=true to intercept before other handlers
    window.addEventListener('message', function(event) {
        // Filter out problematic worker messages
        const data = event.data;
        
        // Ignore blob: and data: messages
        if (typeof data === 'string' && (data.startsWith('blob:') || data.startsWith('data:'))) {
            return;
        }
        
        // Ignore complex objects that might cause e.data.split errors
        if (data && typeof data === 'object') {
            // Check if this is a copyparty/util.js message by checking for known properties
            // If it's an unknown object, stop it from propagating to avoid errors
            if (!('cmd' in data) && !('type' in data) && !('action' in data)) {
                // This is likely a worker message that util.js can't handle
                event.stopImmediatePropagation();
                return false;
            }
        }
    }, true); // Use capture=true to intercept early
    
    // We'll load mpegts.js only when needed (for .ts files)
    let mpegtsLoaded = false;
    let mpegtsLoadPromise = null;
    
    function ensureMpegtsLoaded() {
        if (mpegtsLoaded) {
            return Promise.resolve();
        }
        
        if (mpegtsLoadPromise) {
            return mpegtsLoadPromise;
        }
        
        mpegtsLoadPromise = new Promise((resolve, reject) => {
            console.log('Loading mpegts.js...');
            const mpegtsScript = document.createElement('script');
            mpegtsScript.src = 'https://cdn.jsdelivr.net/npm/mpegts.js/dist/mpegts.min.js';
            mpegtsScript.onload = () => {
                mpegtsLoaded = true;
                console.log('mpegts.js loaded');
                resolve();
            };
            mpegtsScript.onerror = () => {
                mpegtsLoadPromise = null;
                reject(new Error('Failed to load mpegts.js'));
            };
            document.head.appendChild(mpegtsScript);
        });
        
        return mpegtsLoadPromise;
    }
    
    function initVideoJS() {
        console.log('Video.js loaded, initializing...');
        console.log('Note: Suppressing harmless worker message errors from page scripts');
        
        // Add custom CSS
        const style = document.createElement('style');
        style.textContent = `
            /* Prevent body scroll when modal is open */
            body.vjs-modal-open {
                overflow: hidden !important;
                height: 100vh;
            }
            
            /* Fixed modal positioning */
            .vjs-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: none;
                overflow: auto;
            }
            
            .vjs-modal-overlay.active {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
            }
            
            .vjs-close-button {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid #fff;
                color: white;
                font-size: 20px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                z-index: 1000001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                transition: all 0.2s;
            }
            
            .vjs-close-button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            /* Video wrapper */
            .vjs-video-wrapper {
                width: 100%;
                max-width: 95vw;
                position: relative;
                background: #000;
                border-radius: 4px;
                box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
            }
            
            /* Video player sizing */
            #vjs-player {
                width: 100% !important;
                max-height: 85vh !important;
                display: block !important;
            }
            
            .video-js {
                width: 100% !important;
                max-height: 85vh !important;
                font-size: 14px;
            }
            
            .video-js .vjs-tech {
                object-fit: contain !important;
            }
            
            /* Control bar visibility */
            .video-js .vjs-control-bar {
                display: flex !important;
                background-color: rgba(43, 51, 63, 0.9) !important;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .video-js.vjs-user-inactive.vjs-playing .vjs-control-bar {
                opacity: 0;
                visibility: hidden;
            }
            
            .video-js.vjs-user-active .vjs-control-bar,
            .video-js.vjs-paused .vjs-control-bar {
                opacity: 1;
                visibility: visible;
            }
            
            /* Custom subtitle upload button */
            .vjs-subtitle-upload-button {
                cursor: pointer;
            }
            
            .vjs-subtitle-upload-button .vjs-icon-placeholder:before {
                content: "📁";
                font-size: 1.5em;
                line-height: 1.9;
            }
            
            .vjs-subtitle-upload-button:hover {
                background-color: rgba(115, 133, 159, 0.5);
            }
            
            /* Rewind and Forward buttons */
            .vjs-rewind-button {
                cursor: pointer;
            }
            
            .vjs-rewind-button .vjs-icon-placeholder:before {
                content: "⏪";
                font-size: 1.5em;
                line-height: 1.9;
            }
            
            .vjs-rewind-button:hover {
                background-color: rgba(115, 133, 159, 0.5);
            }
            
            .vjs-forward-button {
                cursor: pointer;
            }
            
            .vjs-forward-button .vjs-icon-placeholder:before {
                content: "⏩";
                font-size: 1.5em;
                line-height: 1.9;
            }
            
            .vjs-forward-button:hover {
                background-color: rgba(115, 133, 159, 0.5);
            }
            
            /* Fullscreen button icons */
            .vjs-fullscreen-control .vjs-icon-placeholder {
                font-size: 1.5em;
                line-height: 1.9;
            }
            
            .vjs-fullscreen-control .vjs-icon-placeholder:before {
                content: none !important;
            }
            
            /* Hide the actual file input */
            #subtitle-file-input {
                display: none;
            }
            
            /* Subtitle display container */
            .video-js .vjs-text-track-display {
                pointer-events: none;
                z-index: 10;
                position: absolute;
                bottom: 4em;
                left: 0;
                right: 0;
                text-align: center;
            }
            
            /* Enhanced subtitle styling - LARGER default size */
            .video-js .vjs-text-track-cue {
                background-color: rgba(0, 0, 0, 0.8);
                padding: 0.4em 0.6em;
                font-size: 2em;
                line-height: 1.4;
                border-radius: 4px;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
                color: white;
                font-weight: normal;
            }
            
            .video-js.vjs-user-inactive.vjs-playing .vjs-text-track-display {
                bottom: 1em;
            }
            
            /* Subtitle menu styling */
            .vjs-subs-caps-button .vjs-menu {
                left: -5em;
            }
            
            .vjs-subs-caps-button .vjs-menu-content {
                background-color: rgba(43, 51, 63, 0.95);
                max-height: 20em;
                overflow-y: auto;
            }
            
            .vjs-menu li {
                padding: 0.5em 1em;
                font-size: 1.1em;
            }
            
            .vjs-menu li.vjs-selected {
                background-color: rgba(115, 133, 159, 0.5);
                color: #fff;
            }
            
            .vjs-menu li:hover {
                background-color: rgba(115, 133, 159, 0.3);
            }
            
            /* Settings dialog */
            .vjs-texttrack-settings {
                display: block !important;
            }
            
            .vjs-modal-dialog {
                background-color: rgba(43, 51, 63, 0.95);
                border-radius: 8px;
            }
            
            .vjs-modal-dialog .vjs-modal-dialog-content {
                padding: 20px;
                color: #fff;
            }
            
            .vjs-track-settings-colors,
            .vjs-track-settings-font {
                margin: 10px 0;
            }
            
            .vjs-track-setting {
                margin: 10px 0;
            }
            
            .vjs-track-setting > select {
                padding: 5px;
                border-radius: 4px;
                background-color: rgba(60, 70, 80, 0.95);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            /* Control bar buttons */
            .video-js .vjs-control:not(.vjs-progress-control) {
                width: 3em;
            }
            
            /* Tooltips */
            .video-js .vjs-control .vjs-control-text {
                position: absolute;
                bottom: 3em;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 0.4em 0.8em;
                border-radius: 3px;
                font-size: 0.9em;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
                z-index: 10;
            }
            
            .video-js .vjs-control:hover .vjs-control-text {
                opacity: 1;
            }
            
            /* Ensure time display content is always in front of tooltip */
            .video-js .vjs-current-time-display {
                position: relative;
                z-index: 5 !important;
            }
            
            /* Make time display clickable with full-width hover */
            .video-js .vjs-current-time.vjs-time-control.vjs-control {
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 4.5em !important;
                padding: 0 !important;
                margin: 0 !important;
                transition: background-color 0.2s ease !important;
            }
            
            .video-js .vjs-current-time.vjs-time-control.vjs-control:hover {
                background-color: rgba(115, 133, 159, 0.5) !important;
            }
            
            .video-js .vjs-current-time.vjs-time-control.vjs-control:active {
                background-color: rgba(115, 133, 159, 0.8) !important;
            }
            
            /* Ensure time display text is visible and fills container */
            .video-js .vjs-current-time-display {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #fff !important;
                font-size: 1em !important;
                line-height: 3em !important;
                padding: 0 0.5em !important;
                min-width: 3.5em !important;
                width: 100% !important;
                text-align: center !important;
                box-sizing: border-box !important;
                pointer-events: none !important;
            }
            
            /* Right-align specific controls */
            .video-js .vjs-playback-rate {
                margin-left: auto;
            }
            
            .video-js .vjs-subs-caps-button {
                order: 999;
            }
            
            .video-js .vjs-fullscreen-control {
                order: 1000;
            }
            
            /* Progress bar - CRITICAL for .ts file seeking */
            .video-js .vjs-progress-control {
                position: absolute;
                top: -0.5em;
                left: 0;
                right: 0;
                width: 100% !important;
                height: 0.5em !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .video-js .vjs-progress-holder {
                height: 100% !important;
                margin: 0 !important;
            }
            
            .video-js .vjs-play-progress {
                background-color: #4a90e2 !important;
            }
            
            .video-js .vjs-load-progress {
                background-color: rgba(115, 133, 159, 0.5) !important;
            }
            
            .video-js .vjs-progress-holder .vjs-play-progress {
                font-size: 1em !important;
            }
            
            /* Time display */
            .video-js .vjs-time-control {
                padding-left: 0.5em;
                padding-right: 0.5em;
                min-width: 3em;
                width: auto;
            }
            
            /* Volume control */
            .video-js .vjs-volume-panel {
                width: 5em;
            }
            
            .video-js .vjs-volume-level {
                background-color: #4a90e2;
            }
            
            /* Fullscreen button */
            .video-js .vjs-fullscreen-control {
                order: 10;
            }
            
            /* Big play button */
            .video-js .vjs-big-play-button {
                width: 2em;
                height: 2em;
                border-radius: 50%;
                border: 0.15em solid #fff;
                background-color: rgba(43, 51, 63, 0.9);
                font-size: 3em;
                line-height: 1.7em;
                top: 50%;
                left: 50%;
                margin-left: -1em;
                margin-top: -1em;
            }
            
            .video-js .vjs-big-play-button:hover {
                background-color: rgba(115, 133, 159, 0.9);
            }
            
            /* Loading spinner */
            .vjs-loading-spinner {
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            .vjs-loading-spinner:before,
            .vjs-loading-spinner:after {
                border-color: #fff transparent transparent transparent;
            }
            
            /* Menu positioning */
            .video-js .vjs-menu-button-popup .vjs-menu {
                left: -3em;
            }
            
            .video-js .vjs-menu-button-popup .vjs-menu .vjs-menu-content {
                background-color: rgba(43, 51, 63, 0.95);
                max-height: 15em;
            }
            
            /* Error display */
            .vjs-error-display {
                display: none;
            }

            /* ===== TOUCH-SPECIFIC CSS ===== */
            /* Touch feedback indicators */
            .vjs-touch-feedback {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 56px;
                color: #ffffff;
                background: transparent;
                padding: 0;
                border-radius: 0;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 12px;
                text-shadow: 0 0 8px rgba(0, 0, 0, 0.9), 0 0 16px rgba(0, 0, 0, 0.7);
                filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6));
            }
            
            .vjs-touch-feedback.show {
                opacity: 1;
            }
            
            .vjs-touch-feedback .time-info {
                font-size: 28px;
                margin-left: 8px;
                color: #ffffff;
                text-shadow: 0 0 8px rgba(0, 0, 0, 0.9), 0 0 16px rgba(0, 0, 0, 0.7);
            }
            
            /* Seeking overlay */
            .vjs-seeking-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                display: none;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                z-index: 5;
            }
            
            .vjs-seeking-overlay.active {
                display: flex;
            }
            
            .vjs-seeking-text {
                font-size: 32px;
                color: #ffffff;
                background: rgba(0, 0, 0, 0.8);
                padding: 20px 35px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                line-height: 1.4;
            }
            /* ===== END TOUCH-SPECIFIC CSS ===== */
        `;
        document.head.appendChild(style);
        
        // Custom subtitle upload button - Video.js 8.x compatible
        const Button = videojs.getComponent('Button');
        
        class SubtitleUploadButton extends Button {
            constructor(player, options) {
                super(player, options);
                this.controlText('Upload Subtitle');
            }
            
            buildCSSClass() {
                return 'vjs-subtitle-upload-button ' + super.buildCSSClass();
            }
            
            handleClick() {
                const fileInput = document.getElementById('subtitle-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            }
        }
        
        videojs.registerComponent('SubtitleUploadButton', SubtitleUploadButton);
        
        // Rewind 5 seconds button
        class RewindButton extends Button {
            constructor(player, options) {
                super(player, options);
                this.controlText('Rewind 5 seconds');
            }
            
            buildCSSClass() {
                return 'vjs-rewind-button vjs-control vjs-button';
            }
            
            handleClick() {
                const player = this.player();
                const currentTime = player.currentTime();
                player.currentTime(Math.max(0, currentTime - 5));
            }
        }
        
        videojs.registerComponent('RewindButton', RewindButton);
        
        // Forward 5 seconds button
        class ForwardButton extends Button {
            constructor(player, options) {
                super(player, options);
                this.controlText('Forward 5 seconds');
            }
            
            buildCSSClass() {
                return 'vjs-forward-button vjs-control vjs-button';
            }
            
            handleClick() {
                const player = this.player();
                const currentTime = player.currentTime();
                const duration = player.duration();
                player.currentTime(Math.min(duration, currentTime + 5));
            }
        }
        
        videojs.registerComponent('ForwardButton', ForwardButton);
        
        // Custom clickable current time display that toggles between elapsed and remaining
        const Component = videojs.getComponent('Component');
        
        class ClickableCurrentTimeDisplay extends Component {
            constructor(player, options) {
                super(player, options);
                this.showRemaining = false;
                
                // Bind methods to ensure proper context
                this.updateContent = this.updateContent.bind(this);
                this.handleClick = this.handleClick.bind(this);
                
                // Register event listeners
                this.on(player, 'timeupdate', this.updateContent);
                this.on(player, 'durationchange', this.updateContent);
                this.on(player, 'loadedmetadata', this.updateContent);
                this.on(player, 'ready', this.updateContent);
                this.on(player, 'play', this.updateContent);
                
                console.log('[ClickableCurrentTimeDisplay] Component initialized');
            }
            
            createEl() {
                const el = videojs.dom.createEl('div', {
                    className: 'vjs-current-time vjs-time-control vjs-control'
                });
                
                // Make element explicitly interactive
                el.setAttribute('role', 'button');
                el.setAttribute('tabindex', '0');
                el.setAttribute('aria-label', 'Click to toggle between elapsed and remaining time');
                
                this.contentEl_ = videojs.dom.createEl('span', {
                    className: 'vjs-current-time-display'
                }, {
                    'aria-live': 'off'
                });
                // Don't set initial text - let updateContent handle it
                
                // Add tooltip
                const tooltipEl = videojs.dom.createEl('span', {
                    className: 'vjs-control-text'
                });
                tooltipEl.textContent = 'Click to toggle between elapsed/remaining time';
                
                el.appendChild(this.contentEl_);
                el.appendChild(tooltipEl);
                
                // Register click handler multiple ways to ensure it works
                this.on(el, 'click', this.handleClick);
                this.on(el, 'tap', this.handleClick);
                
                // Also add native event listener as backup
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleClick(e);
                }, false);
                
                console.log('[ClickableCurrentTimeDisplay] Element created with click listener');
                console.log('[ClickableCurrentTimeDisplay] Element:', el);
                
                // Trigger initial update after a short delay
                setTimeout(() => {
                    this.updateContent();
                }, 100);
                
                return el;
            }
            
            updateContent() {
                const player = this.player();
                if (!player) {
                    console.warn('[ClickableCurrentTimeDisplay] No player available');
                    return;
                }
                
                const currentTime = player.currentTime() || 0;
                const duration = player.duration() || 0;
                
                if (!this.contentEl_) {
                    console.warn('[ClickableCurrentTimeDisplay] Content element not available');
                    return;
                }
                
                // Don't update if we don't have valid time data yet
                if (isNaN(currentTime) || isNaN(duration)) {
                    console.warn('[ClickableCurrentTimeDisplay] Invalid time values');
                    return;
                }
                
                // Use the correct formatTime method (not deprecated)
                const formatTime = videojs.time && videojs.time.formatTime ? 
                    videojs.time.formatTime : 
                    videojs.formatTime;
                
                let displayText;
                if (this.showRemaining && duration > 0) {
                    const remainingTime = duration - currentTime;
                    displayText = '-' + formatTime(remainingTime, duration);
                } else {
                    displayText = formatTime(currentTime, duration);
                }
                
                // Only update if the text actually changed
                if (this.contentEl_.textContent !== displayText) {
                    this.contentEl_.textContent = displayText;
                    
                    // Debug logging (only log occasionally to avoid spam)
                    if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime * 10) % 10 === 0) {
                        const mode = this.showRemaining ? '[REMAINING]' : '[ELAPSED]';
                        console.log('[ClickableCurrentTimeDisplay] Updated ' + mode + ':', displayText);
                    }
                }
            }
            
            handleClick(event) {
                console.log('=== CLICK EVENT RECEIVED ===');
                console.log('[ClickableCurrentTimeDisplay] Event:', event);
                console.log('[ClickableCurrentTimeDisplay] Event type:', event ? event.type : 'no event');
                console.log('[ClickableCurrentTimeDisplay] Target:', event ? event.target : 'no target');
                console.log('[ClickableCurrentTimeDisplay] Current showRemaining:', this.showRemaining);
                console.log('[ClickableCurrentTimeDisplay] Current text:', this.contentEl_.textContent);
                
                // Toggle the mode
                this.showRemaining = !this.showRemaining;
                
                console.log('[ClickableCurrentTimeDisplay] After toggle showRemaining:', this.showRemaining);
                
                // Get current values
                const player = this.player();
                const currentTime = player.currentTime();
                const duration = player.duration();
                console.log('[ClickableCurrentTimeDisplay] Current time:', currentTime, 'Duration:', duration);
                
                // Force immediate update
                this.updateContent();
                
                // Verify the update happened
                setTimeout(() => {
                    console.log('[ClickableCurrentTimeDisplay] After update text:', this.contentEl_.textContent);
                    console.log('=== CLICK HANDLED ===');
                }, 10);
            }
            
            // Test method that can be called from console
            testToggle() {
                console.log('[TEST] Manual toggle test');
                this.handleClick({ type: 'test', target: this.el() });
            }
            
            
            dispose() {
                console.log('[ClickableCurrentTimeDisplay] Disposing component');
                super.dispose();
            }
        }
        
        videojs.registerComponent('ClickableCurrentTimeDisplay', ClickableCurrentTimeDisplay);
        
        // Function to setup fullscreen icon updates
        function setupFullscreenIconUpdate(player) {
            // Set initial icon when ready
            player.ready(function() {
                const fullscreenButton = player.controlBar.fullscreenToggle;
                if (fullscreenButton) {
                    const iconEl = fullscreenButton.el().querySelector('.vjs-icon-placeholder');
                    if (iconEl) {
                        iconEl.innerHTML = '⛶'; // Enter fullscreen icon
                    }
                }
            });
            
            // Update icon on fullscreen change
            player.on('fullscreenchange', function() {
                const fullscreenButton = player.controlBar.fullscreenToggle;
                if (fullscreenButton) {
                    const iconEl = fullscreenButton.el().querySelector('.vjs-icon-placeholder');
                    if (iconEl) {
                        if (player.isFullscreen()) {
                            iconEl.innerHTML = '⊗'; // Exit fullscreen icon
                            fullscreenButton.controlText('Exit fullscreen');
                        } else {
                            iconEl.innerHTML = '⛶'; // Enter fullscreen icon
                            fullscreenButton.controlText('Fullscreen');
                        }
                    }
                }
            });
        }
        
        // Function to setup keyboard shortcuts
        function setupKeyboardShortcuts(player) {
            console.log('[Keyboard] Setting up keyboard shortcuts');
            
            // Create keyboard handler
            const handleKeyPress = function(event) {
                // Don't handle keyboard shortcuts if user is typing in an input field
                const target = event.target;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    return;
                }
                
                const key = event.key;
                const keyCode = event.keyCode;
                
                // Log key press for debugging
                console.log('[Keyboard] Key pressed:', key, 'KeyCode:', keyCode);
                
                switch (key) {
                    case 'Escape':
                    case 'Esc':
                        console.log('[Keyboard] Escape pressed - closing video');
                        event.preventDefault();
                        closeVideo();
                        break;
                        
                    case ' ':
                    case 'Spacebar':
                        console.log('[Keyboard] Space pressed - toggle play/pause');
                        event.preventDefault();
                        if (player.paused()) {
                            player.play();
                        } else {
                            player.pause();
                        }
                        break;
                        
                    case 'ArrowRight':
                    case 'Right':
                        console.log('[Keyboard] Arrow Right - forward 5s');
                        event.preventDefault();
                        const currentTime = player.currentTime();
                        const duration = player.duration();
                        player.currentTime(Math.min(duration, currentTime + 5));
                        break;
                        
                    case 'ArrowLeft':
                    case 'Left':
                        console.log('[Keyboard] Arrow Left - rewind 5s');
                        event.preventDefault();
                        const time = player.currentTime();
                        player.currentTime(Math.max(0, time - 5));
                        break;
                }
            };
            
            // Add keyboard event listener to document
            document.addEventListener('keydown', handleKeyPress);
            
            // Store handler for cleanup
            player.keyboardHandler = handleKeyPress;
            
            // Clean up on dispose
            player.on('dispose', function() {
                console.log('[Keyboard] Removing keyboard shortcuts');
                document.removeEventListener('keydown', player.keyboardHandler);
            });
            
            console.log('[Keyboard] Keyboard shortcuts ready:');
            console.log('[Keyboard] - Escape: Close video');
            console.log('[Keyboard] - Space: Play/Pause');
            console.log('[Keyboard] - Arrow Right: Forward 5s');
            console.log('[Keyboard] - Arrow Left: Rewind 5s');
        }
        
        let currentPlayer = null;
        let currentModal = null;
        let mpegtsPlayer = null;
        
        function getFileExtension(url) {
            const urlWithoutQuery = url.split('?')[0];
            const parts = urlWithoutQuery.split('.');
            return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
        }
        
        function isVideoFile(url) {
            const videoExtensions = ['mp4', 'webm', 'ogv', 'ogg', 'm4v', 'mkv', 'avi', 'mov', 'ts', 'm3u8'];
            return videoExtensions.includes(getFileExtension(url));
        }
        
        // Intercept clicks on video links
        document.addEventListener('click', function(e) {
            const target = e.target.closest('a[href]');
            if (!target) return;
            
            const href = target.getAttribute('href');
            if (!href || !isVideoFile(href)) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const videoUrl = new URL(href, window.location.href).href;
            openVideoModal(videoUrl);
        }, true);
        
        function openVideoModal(videoUrl) {
            console.log('Opening video:', videoUrl);
            
            // Create modal
            currentModal = document.createElement('div');
            currentModal.className = 'vjs-modal-overlay';
            
            const wrapper = document.createElement('div');
            wrapper.className = 'vjs-video-wrapper';
            
            const closeButton = document.createElement('button');
            closeButton.className = 'vjs-close-button';
            closeButton.textContent = '×';
            closeButton.onclick = closeVideo;
            
            const videoContainer = document.createElement('video');
            videoContainer.id = 'vjs-player';
            videoContainer.className = 'video-js vjs-default-skin vjs-big-play-centered';
            videoContainer.setAttribute('playsinline', '');
            
            // Create hidden file input for subtitle upload
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'subtitle-file-input';
            fileInput.accept = '.srt,.vtt,.ass';
            fileInput.onchange = handleSubtitleUpload;
            
            wrapper.appendChild(videoContainer);
            currentModal.appendChild(closeButton);
            currentModal.appendChild(wrapper);
            currentModal.appendChild(fileInput);
            document.body.appendChild(currentModal);
            
            // Show modal with animation
            setTimeout(() => currentModal.classList.add('active'), 10);
            document.body.classList.add('vjs-modal-open');
            
            // Check if we need mpegts.js for .ts files
            const ext = getFileExtension(videoUrl);
            const isTS = ext === 'ts';
            const isHLS = ext === 'm3u8';
            
            if (isTS) {
                console.log('Detected .ts file, loading mpegts.js...');
                ensureMpegtsLoaded()
                    .then(() => {
                        playWithMpegts(videoUrl);
                    })
                    .catch(error => {
                        console.error('Failed to load mpegts.js:', error);
                        alert('Error: Cannot load video player library\n\n' + error.message);
                        closeVideo();
                    });
            } else {
                playWithVideoJS(videoUrl, isHLS);
            }
        }
        
        function handleSubtitleUpload(event) {
            const file = event.target.files[0];
            if (!file || !currentPlayer) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                let vttContent;
                
                if (file.name.endsWith('.srt')) {
                    vttContent = convertSRTtoVTT(content);
                } else if (file.name.endsWith('.ass')) {
                    vttContent = convertASStoVTT(content);
                } else {
                    vttContent = content;
                }
                
                const blob = new Blob([vttContent], { type: 'text/vtt' });
                const url = URL.createObjectURL(blob);
                
                currentPlayer.addRemoteTextTrack({
                    kind: 'subtitles',
                    src: url,
                    srclang: 'custom',
                    label: 'Uploaded: ' + file.name,
                    default: true
                }, false);
                
                console.log('✓ Subtitle uploaded:', file.name);
            };
            
            reader.readAsText(file);
            event.target.value = '';
        }
        
        function setupAutoHideControls(player) {
            let inactivityTimeout;
            const INACTIVITY_DELAY = 3000; // 3 seconds
            
            function showControls() {
                player.userActive(true);
            }
            
            function hideControls() {
                if (!player.paused()) {
                    player.userActive(false);
                }
            }
            
            function resetInactivityTimer() {
                clearTimeout(inactivityTimeout);
                showControls();
                
                if (!player.paused()) {
                    inactivityTimeout = setTimeout(hideControls, INACTIVITY_DELAY);
                }
            }
            
            // Listen to mouse movement on the player
            player.on('mousemove', resetInactivityTimer);
            player.on('touchstart', resetInactivityTimer);
            
            // Show controls when paused, hide when playing
            player.on('pause', function() {
                clearTimeout(inactivityTimeout);
                showControls();
            });
            
            player.on('play', function() {
                resetInactivityTimer();
            });
            
            // Initial state
            player.on('ready', function() {
                showControls();
            });
            
            // Clean up on dispose
            player.on('dispose', function() {
                clearTimeout(inactivityTimeout);
            });
        }

        // ===== TOUCH CONTROLS IMPLEMENTATION =====
        function setupTouchControls(player) {
            const videoElement = player.el().querySelector('.vjs-tech');
            if (!videoElement) return;
            
            // Touch variables
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;
            let touchStartVideoTime = 0;
            let isSeeking = false;
            let lastTapTime = 0;
            
            // Create touch feedback element
            const touchFeedback = document.createElement('div');
            touchFeedback.className = 'vjs-touch-feedback';
            player.el().appendChild(touchFeedback);
            
            // Create seeking overlay
            const seekingOverlay = document.createElement('div');
            seekingOverlay.className = 'vjs-seeking-overlay';
            seekingOverlay.innerHTML = '<div class="vjs-seeking-text">Seeking...</div>';
            player.el().appendChild(seekingOverlay);
            
            // Show touch feedback
            function showTouchFeedback(icon, timeOffset = null) {
                let content = icon;
                if (timeOffset !== null) {
                    const sign = timeOffset > 0 ? '+' : '';
                    content += `<span class="time-info">${sign}${timeOffset}s</span>`;
                }
                touchFeedback.innerHTML = content;
                touchFeedback.classList.add('show');
                setTimeout(() => {
                    touchFeedback.classList.remove('show');
                }, 500);
            }
            
            // Format time as MM:SS or HH:MM:SS
            function formatSeekTime(seconds) {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = Math.floor(seconds % 60);
                
                if (h > 0) {
                    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                } else {
                    return `${m}:${s.toString().padStart(2, '0')}`;
                }
            }
            
            // Touch start handler
            player.el().addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                    touchStartTime = Date.now();
                    touchStartVideoTime = player.currentTime();
                    isSeeking = false;
                }
            }, { passive: true });
            
            // Touch move handler - for continuous seeking with adaptive control
            player.el().addEventListener('touchmove', function(e) {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    const deltaX = touch.clientX - touchStartX;
                    const deltaY = touch.clientY - touchStartY;
                    
                    // Detect horizontal swipe (more horizontal than vertical)
                    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
                        if (!isSeeking) {
                            isSeeking = true;
                        }
                        e.preventDefault();
                        
                        // Adaptive seeking: scale based on video width
                        // Formula: full screen width swipe = 180 seconds (3 minutes)
                        // This makes seeking comfortable on any screen size (phone to 4K display)
                        const videoWidth = player.el().clientWidth;
                        const pixelsPerSecond = videoWidth / 180; // Full width = 180 seconds
                        
                        const seekSeconds = deltaX / pixelsPerSecond;
                        const targetTime = Math.max(0, Math.min(touchStartVideoTime + seekSeconds, player.duration()));
                        
                        // Continuously update video position while dragging
                        player.currentTime(targetTime);
                        seekingOverlay.classList.add('active');
                        
                        // Show target time and time difference
                        const currentTimeStr = formatSeekTime(touchStartVideoTime);
                        const targetTimeStr = formatSeekTime(targetTime);
                        const timeDiff = Math.round(targetTime - touchStartVideoTime);
                        const sign = timeDiff > 0 ? '+' : '';
                        
                        seekingOverlay.querySelector('.vjs-seeking-text').innerHTML = 
                            `<div style="font-size: 40px; font-weight: bold; margin-bottom: 8px;">${targetTimeStr}</div>` +
                            `<div style="font-size: 24px; opacity: 0.9;">${currentTimeStr} ${sign}${timeDiff}s</div>`;
                    }
                }
            }, { passive: false });
            
            // Touch end handler
            player.el().addEventListener('touchend', function(e) {
                const touchDuration = Date.now() - touchStartTime;
                
                if (isSeeking) {
                    seekingOverlay.classList.remove('active');
                    isSeeking = false;
                    return;
                }
                
                // Handle tap (quick touch, not a swipe)
                if (touchDuration < 300 && Math.abs(e.changedTouches[0].clientX - touchStartX) < 10) {
                    const now = Date.now();
                    const timeSinceLastTap = now - lastTapTime;
                    
                    const tapX = touchStartX;
                    const videoWidth = player.el().clientWidth;
                    
                    // Calculate tap zones
                    const centerStart = videoWidth * 3 / 8;  // 37.5% from left
                    const centerEnd = videoWidth * 5 / 8;    // 62.5% from left (center 25% width)
                    const isInCenter = tapX >= centerStart && tapX <= centerEnd;
                    
                    // Double tap detection (only for left/right zones, not center)
                    if (timeSinceLastTap < 300 && timeSinceLastTap > 0 && !isInCenter) {
                        e.preventDefault();
                        
                        // Left half: rewind 5 seconds (matching existing buttons)
                        if (tapX < videoWidth / 2) {
                            const newTime = Math.max(0, player.currentTime() - 5);
                            player.currentTime(newTime);
                            showTouchFeedback('◀◀', -5);
                        }
                        // Right half: forward 5 seconds (matching existing buttons)
                        else {
                            const newTime = Math.min(player.duration(), player.currentTime() + 5);
                            player.currentTime(newTime);
                            showTouchFeedback('▶▶', +5);
                        }
                        
                        lastTapTime = 0; // Reset to prevent triple tap
                    } else {
                        // Single tap behavior depends on location
                        if (isInCenter) {
                            // Center zone: play/pause
                            e.preventDefault();
                            if (player.paused()) {
                                player.play();
                                showTouchFeedback('▶');
                            } else {
                                player.pause();
                                showTouchFeedback('❙❙');
                            }
                            lastTapTime = 0; // Don't register as tap time for double-tap
                        } else {
                            // Side zones: toggle controls visibility
                            if (player.userActive()) {
                                player.userActive(false);
                            } else {
                                player.userActive(true);
                            }
                            lastTapTime = now;
                        }
                    }
                }
            }, { passive: false });
            
            console.log('[Touch] Touch controls initialized');
            console.log('[Touch] - Single tap center (25% width): Play/Pause');
            console.log('[Touch] - Single tap sides: Toggle controls');
            console.log('[Touch] - Double tap left: Rewind 5s');
            console.log('[Touch] - Double tap right: Forward 5s');
            console.log('[Touch] - Horizontal swipe: Adaptive seek (full width = 60s)');
        }
        // ===== END TOUCH CONTROLS =====
        
        function closeVideo() {
            console.log('Closing video player...');
            
            // Stop and destroy mpegts.js player if it exists
            if (mpegtsPlayer) {
                try {
                    mpegtsPlayer.pause();
                    mpegtsPlayer.unload();
                    mpegtsPlayer.detachMediaElement();
                    mpegtsPlayer.destroy();
                    mpegtsPlayer = null;
                    console.log('✓ mpegts.js player destroyed');
                } catch (e) {
                    console.warn('Error destroying mpegts.js player:', e);
                }
            }
            
            // Dispose Video.js player
            if (currentPlayer) {
                try {
                    currentPlayer.pause();
                    currentPlayer.dispose();
                    currentPlayer = null;
                    console.log('✓ Video.js player disposed');
                } catch (e) {
                    console.warn('Error disposing Video.js player:', e);
                }
            }
            
            // Remove modal
            if (currentModal) {
                currentModal.classList.remove('active');
                setTimeout(() => {
                    if (currentModal && currentModal.parentNode) {
                        currentModal.parentNode.removeChild(currentModal);
                    }
                    currentModal = null;
                }, 300);
            }
            
            document.body.classList.remove('vjs-modal-open');
        }
        
        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && currentModal) {
                closeVideo();
            }
        });
        
        function playWithMpegts(videoUrl) {
            console.log('Using mpegts.js for .ts file playback');
            
            const videoElement = document.getElementById('vjs-player');
            
            // Reset video element
            try {
                videoElement.removeAttribute('src');
                videoElement.load();
                if (videoElement.error) {
                    videoElement.error = null;
                }
            } catch (resetError) {
                console.warn('Could not reset video element:', resetError);
            }
            
            // Initialize Video.js FIRST with controls enabled
            currentPlayer = videojs('vjs-player', {
                controls: true,
                autoplay: false,
                preload: 'auto',
                liveui: false,
                controlBar: {
                    children: [
                        'playToggle',
                        'volumePanel',
                        'RewindButton',
                        'ForwardButton',
                        'ClickableCurrentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'playbackRateMenuButton',
                        'SubtitleUploadButton',
                        'subsCapsButton',
                        'fullscreenToggle'
                    ],
                    volumePanel: {
                        inline: false
                    }
                },
                playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
                textTrackSettings: true
            });
            
            // Force controls to always show
            currentPlayer.controls(true);
            currentPlayer.userActive(true);
            
            // Setup auto-hide controls after 3 seconds of inactivity
            setupAutoHideControls(currentPlayer);
            
            // Setup fullscreen icon updates
            setupFullscreenIconUpdate(currentPlayer);
            
            // Setup keyboard shortcuts
            setupKeyboardShortcuts(currentPlayer);
            
            // Setup touch controls
            setupTouchControls(currentPlayer);
            
            // Debug: Check if ClickableCurrentTimeDisplay is in the control bar
            currentPlayer.ready(function() {
                console.log('[DEBUG] Player ready - checking controls');
                const timeDisplay = currentPlayer.controlBar.getChild('ClickableCurrentTimeDisplay');
                if (timeDisplay) {
                    console.log('[DEBUG] ClickableCurrentTimeDisplay found in control bar');
                    console.log('[DEBUG] Element:', timeDisplay.el());
                    console.log('[DEBUG] Content element:', timeDisplay.contentEl_);
                } else {
                    console.error('[DEBUG] ClickableCurrentTimeDisplay NOT found in control bar!');
                    console.log('[DEBUG] Available controls:', currentPlayer.controlBar.children().map(c => c.name()));
                }
            });
            
            // Disable Video.js error display (we handle errors from mpegts.js)
            currentPlayer.off('error');
            
            // Create mpegts.js player with proper seeking configuration for static file servers
            try {
                mpegtsPlayer = mpegts.createPlayer({
                    type: 'mpegts',  // Explicitly specify mpegts type
                    isLive: false,
                    url: videoUrl
                }, {
                    enableWorker: false,  // Disable worker for better seeking control
                    enableStashBuffer: false,  // Disable stash buffer for seeking
                    lazyLoad: true,  // Enable lazy loading for seeking support
                    lazyLoadMaxDuration: 3 * 60,
                    lazyLoadRecoverDuration: 30,
                    seekType: 'range',  // Use HTTP range headers (standard for file servers)
                    rangeLoadZeroStart: false,  // Don't force zero start for seeking
                    deferLoadAfterSourceOpen: false,
                    autoCleanupSourceBuffer: true,
                    autoCleanupMaxBackwardDuration: 30,
                    autoCleanupMinBackwardDuration: 10,
                    fixAudioTimestampGap: true,  // Fix timestamp issues
                    accurateSeek: false,  // Faster seeking (less accurate but more responsive)
                    reuseRedirectedURL: true
                });
                
                // Error handling - ignore timed_id3 metadata errors
                let hasCriticalError = false;
                mpegtsPlayer.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
                    console.warn('mpegts.js event:', errorType, errorDetail, errorInfo);
                    
                    // Ignore non-critical errors related to metadata/ID3 streams
                    const ignorableErrors = [
                        'metadata',
                        'id3',
                        'timed_id3',
                        'TimedID3Metadata',
                        'unrecognized',
                        'data stream'
                    ];
                    
                    const errorString = JSON.stringify([errorType, errorDetail, errorInfo]).toLowerCase();
                    const isIgnorableError = ignorableErrors.some(term => errorString.includes(term.toLowerCase()));
                    
                    if (isIgnorableError) {
                        console.log('Ignoring non-critical metadata stream error');
                        return;
                    }
                    
                    // Only show error once for critical issues
                    if (hasCriticalError) return;
                    
                    if (errorType === 'NetworkError' || errorType === 'MediaError') {
                        hasCriticalError = true;
                        
                        let message = 'Error playing .ts file:\n\n';
                        
                        if (errorType === 'NetworkError') {
                            message += 'Network error - cannot access the file.\n';
                            message += 'Please check if the file exists and is accessible.';
                        } else if (errorType === 'MediaError') {
                            message += 'Media format error.\n';
                            message += 'The .ts file may be corrupted or in an unsupported format.\n\n';
                            message += 'Try:\n';
                            message += '1. Re-downloading the file\n';
                            message += '2. Converting to MP4 using FFmpeg:\n';
                            message += '   ffmpeg -i video.ts -c copy video.mp4';
                        } else {
                            message += errorType + '\n' + errorDetail;
                        }
                        
                        alert(message);
                        closeVideo();
                    }
                });
                
                // Handle loading complete
                mpegtsPlayer.on(mpegts.Events.LOADING_COMPLETE, () => {
                    console.log('✓ Video loading complete');
                });
                
                // Log media info
                mpegtsPlayer.on(mpegts.Events.MEDIA_INFO, (mediaInfo) => {
                    console.log('Media info:', mediaInfo);
                    if (mediaInfo.hasAudio && mediaInfo.hasVideo) {
                        console.log('✓ Video and audio streams detected');
                    }
                });
                
                // Attach mpegts.js to video element
                mpegtsPlayer.attachMediaElement(videoElement);
                mpegtsPlayer.load();
                
                // CRITICAL: Set up event handlers to sync native video with Video.js UI
                // This makes the progress bar work
                const syncVideoJsUI = () => {
                    if (currentPlayer && videoElement.duration && !isNaN(videoElement.duration) && isFinite(videoElement.duration)) {
                        // Update Video.js internal state
                        currentPlayer.cache_.duration = videoElement.duration;
                        currentPlayer.trigger('durationchange');
                        currentPlayer.trigger('loadedmetadata');
                        
                        console.log('✓ Progress bar synced - Duration:', videoElement.duration);
                        
                        // Enable seeking in Video.js
                        if (currentPlayer.controlBar && currentPlayer.controlBar.progressControl) {
                            currentPlayer.controlBar.progressControl.enable();
                        }
                    }
                };
                
                // Listen to native video events and sync to Video.js
                videoElement.addEventListener('loadedmetadata', () => {
                    syncVideoJsUI();
                    // Mark video as seekable
                    videoElement.setAttribute('seekable', 'true');
                    console.log('Video metadata loaded, seeking enabled');
                });
                
                videoElement.addEventListener('durationchange', syncVideoJsUI);
                
                // Continuously sync current time for progress bar updates
                videoElement.addEventListener('timeupdate', () => {
                    if (currentPlayer) {
                        currentPlayer.trigger('timeupdate');
                    }
                });
                
                // Handle seeking events
                videoElement.addEventListener('seeking', () => {
                    console.log('Seeking to:', videoElement.currentTime);
                    if (currentPlayer) {
                        currentPlayer.addClass('vjs-seeking');
                    }
                });
                
                videoElement.addEventListener('seeked', () => {
                    console.log('✓ Seek completed at:', videoElement.currentTime);
                    if (currentPlayer) {
                        currentPlayer.removeClass('vjs-seeking');
                        currentPlayer.trigger('timeupdate');
                        currentPlayer.trigger('seeked');
                    }
                });
                
                videoElement.addEventListener('canplay', () => {
                    console.log('✓ Video ready for playback and seeking');
                    syncVideoJsUI();
                });
                
                // Load subtitles after metadata is loaded
                videoElement.addEventListener('loadedmetadata', () => {
                    console.log('Video metadata loaded, loading subtitles...');
                    if (currentPlayer) {
                        loadSubtitles(currentPlayer, videoUrl);
                    }
                }, { once: true });
                
                console.log('✓ mpegts.js player initialized for .ts file');
                console.log('✓ Configuration: lazyLoad=true, seekType=range, worker=disabled');
                console.log('✓ Progress bar enabled with HTTP range-based seeking');
                console.log('✓ Metadata streams (timed_id3) will be ignored');
                
            } catch (error) {
                console.error('Error creating mpegts.js player:', error);
                alert('Error: Cannot play .ts file\n\n' + error.message + '\n\nTry converting to MP4 for better compatibility.');
                closeVideo();
            }
        }
        
        function playWithVideoJS(videoUrl, isHLS) {
            console.log('Using Video.js for standard video playback');
            
            // Initialize Video.js player
            currentPlayer = videojs('vjs-player', {
                controls: true,
                autoplay: false,
                preload: 'auto',
                responsive: true,
                fill: false,
                fluid: false,
                aspectRatio: '16:9',
                html5: {
                    vhs: {
                        overrideNative: !videojs.browser.IS_SAFARI,
                        enableLowInitialPlaylist: true,
                        smoothQualityChange: true
                    },
                    nativeVideoTracks: false,
                    nativeAudioTracks: false,
                    nativeTextTracks: false
                },
                sources: [{
                    src: videoUrl,
                    type: getMimeType(videoUrl)
                }],
                playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
                controlBar: {
                    children: [
                        'playToggle',
                        'volumePanel',
                        'RewindButton',
                        'ForwardButton',
                        'ClickableCurrentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'playbackRateMenuButton',
                        'SubtitleUploadButton',
                        'subsCapsButton',
                        'fullscreenToggle'
                    ],
                    volumePanel: {
                        inline: false
                    }
                },
                textTrackSettings: true
            });
            
            // Setup auto-hide controls after 3 seconds of inactivity
            setupAutoHideControls(currentPlayer);
            
            // Setup fullscreen icon updates
            setupFullscreenIconUpdate(currentPlayer);
            
            // Setup keyboard shortcuts
            setupKeyboardShortcuts(currentPlayer);
            
            // Setup touch controls
            setupTouchControls(currentPlayer);
            
            // Debug: Check if ClickableCurrentTimeDisplay is in the control bar
            currentPlayer.ready(function() {
                console.log('[DEBUG] Player ready - checking controls');
                const timeDisplay = currentPlayer.controlBar.getChild('ClickableCurrentTimeDisplay');
                if (timeDisplay) {
                    console.log('[DEBUG] ClickableCurrentTimeDisplay found in control bar');
                    console.log('[DEBUG] Element:', timeDisplay.el());
                    console.log('[DEBUG] Content element:', timeDisplay.contentEl_);
                } else {
                    console.error('[DEBUG] ClickableCurrentTimeDisplay NOT found in control bar!');
                    console.log('[DEBUG] Available controls:', currentPlayer.controlBar.children().map(c => c.name()));
                }
            });
            
            // Error handling
            currentPlayer.on('error', function() {
                const error = currentPlayer.error();
                console.error('Video playback error:', error);
                let message = 'Error playing video';
                if (error) {
                    message += ':\n' + error.message;
                }
                alert(message);
            });
            
            // Load subtitles for non-HLS formats
            if (!isHLS) {
                loadSubtitles(currentPlayer, videoUrl);
            }
            
            // Auto-play when ready
            currentPlayer.ready(function() {
                currentPlayer.dimensions('100%', 'auto');
                currentPlayer.play().catch(function(e) {
                    console.log('Autoplay prevented - click play to start');
                });
            });
        }
        
        function loadSubtitles(player, videoUrl) {
            const basePath = videoUrl.replace(/\.[^/.]+$/, '');
            
            // Only check most common patterns to reduce 404s
            // Priority: .srt (most common), then .vtt, then specific languages
            const patterns = [
                // Most common - check these first
                { url: basePath + '.srt', lang: 'en', label: 'English', needsConversion: true },
                { url: basePath + '.vtt', lang: 'en', label: 'English' },
                // Language-specific
                { url: basePath + '.en.srt', lang: 'en', label: 'English', needsConversion: true },
                { url: basePath + '-en.srt', lang: 'en', label: 'English', needsConversion: true },
                { url: basePath + '.en.vtt', lang: 'en', label: 'English' },
                { url: basePath + '-en.vtt', lang: 'en', label: 'English' },
                { url: basePath + '.vi.srt', lang: 'vi', label: 'Tiếng Việt', needsConversion: true },
                { url: basePath + '.vi.vtt', lang: 'vi', label: 'Tiếng Việt' },
                { url: basePath + '.ja.srt', lang: 'ja', label: '日本語', needsConversion: true },
                { url: basePath + '.ja.vtt', lang: 'ja', label: '日本語' }
            ];
            
            let firstSubtitleLoaded = false;
            let englishSubtitleLoaded = false;
            let checksComplete = 0;
            const foundSubtitles = [];
            
            // Check patterns sequentially to minimize 404 spam
            patterns.forEach((pattern, index) => {
                // Add small delay between checks to avoid flooding
                setTimeout(() => {
                    fetch(pattern.url, { 
                        method: 'HEAD',
                        cache: 'no-cache'
                    }).then(response => {
                        checksComplete++;
                        if (response.ok) {
                            foundSubtitles.push(pattern);
                            
                            // Determine if this should be the default track
                            // Priority: First English subtitle, then first subtitle of any language
                            const isEnglish = pattern.lang === 'en';
                            const shouldBeDefault = isEnglish ? !englishSubtitleLoaded : !firstSubtitleLoaded;
                            
                            // Load subtitle immediately when found
                            if (pattern.needsConversion) {
                                fetch(pattern.url)
                                    .then(r => r.text())
                                    .then(srtContent => {
                                        const vttContent = convertSRTtoVTT(srtContent);
                                        const blob = new Blob([vttContent], { type: 'text/vtt' });
                                        const vttUrl = URL.createObjectURL(blob);
                                        
                                        const trackElement = player.addRemoteTextTrack({
                                            kind: 'subtitles',
                                            src: vttUrl,
                                            srclang: pattern.lang,
                                            label: pattern.label + ' (SRT)',
                                            default: shouldBeDefault
                                        }, false);
                                        
                                        // Explicitly enable the track if it should be default
                                        if (shouldBeDefault) {
                                            setTimeout(() => {
                                                const tracks = player.textTracks();
                                                for (let i = 0; i < tracks.length; i++) {
                                                    if (tracks[i].label === pattern.label + ' (SRT)') {
                                                        tracks[i].mode = 'showing';
                                                        break;
                                                    }
                                                }
                                            }, 100);
                                        }
                                        
                                        if (isEnglish && !englishSubtitleLoaded) englishSubtitleLoaded = true;
                                        if (!firstSubtitleLoaded) firstSubtitleLoaded = true;
                                        console.log('✓ Added subtitle:', pattern.label, '(SRT)', shouldBeDefault ? '[DEFAULT]' : '');
                                    })
                                    .catch(err => console.error('Error loading SRT:', pattern.url, err));
                            } else {
                                const trackElement = player.addRemoteTextTrack({
                                    kind: 'subtitles',
                                    src: pattern.url,
                                    srclang: pattern.lang,
                                    label: pattern.label,
                                    default: shouldBeDefault
                                }, false);
                                
                                // Explicitly enable the track if it should be default
                                if (shouldBeDefault) {
                                    setTimeout(() => {
                                        const tracks = player.textTracks();
                                        for (let i = 0; i < tracks.length; i++) {
                                            if (tracks[i].label === pattern.label) {
                                                tracks[i].mode = 'showing';
                                                break;
                                            }
                                        }
                                    }, 100);
                                }
                                
                                if (isEnglish && !englishSubtitleLoaded) englishSubtitleLoaded = true;
                                if (!firstSubtitleLoaded) firstSubtitleLoaded = true;
                                console.log('✓ Added subtitle:', pattern.label, '(VTT)', shouldBeDefault ? '[DEFAULT]' : '');
                            }
                        }
                        
                        // Log summary when all checks complete
                        if (checksComplete === patterns.length && foundSubtitles.length === 0) {
                            console.log('No subtitles found for:', videoUrl);
                        }
                    }).catch(() => {
                        checksComplete++;
                    });
                }, index * 50); // 50ms delay between each check
            });
        }
        
        function convertSRTtoVTT(srt) {
            let vtt = 'WEBVTT\n\n';
            srt = srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
            const blocks = srt.trim().split(/\n\s*\n/);
            
            blocks.forEach(block => {
                const lines = block.split('\n');
                if (lines.length >= 2) {
                    let startIdx = 0;
                    if (/^\d+$/.test(lines[0].trim())) {
                        startIdx = 1;
                    }
                    for (let i = startIdx; i < lines.length; i++) {
                        vtt += lines[i] + '\n';
                    }
                    vtt += '\n';
                }
            });
            
            return vtt;
        }
        
        function convertASStoVTT(ass) {
            let vtt = 'WEBVTT\n\n';
            const lines = ass.split('\n');
            let inDialogue = false;
            
            for (let line of lines) {
                if (line.startsWith('[Events]')) {
                    inDialogue = true;
                    continue;
                }
                
                if (inDialogue && line.startsWith('Dialogue:')) {
                    const parts = line.substring(9).split(',');
                    if (parts.length >= 10) {
                        const start = parts[1].trim();
                        const end = parts[2].trim();
                        const text = parts.slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\\N/g, '\n');
                        vtt += `${start} --> ${end}\n${text}\n\n`;
                    }
                }
            }
            
            return vtt;
        }
        
        function getMimeType(url) {
            const ext = getFileExtension(url);
            const types = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'ogv': 'video/ogg',
                'ogg': 'video/ogg',
                'm4v': 'video/mp4',
                'mkv': 'video/x-matroska',
                'avi': 'video/x-msvideo',
                'mov': 'video/quicktime',
                'ts': 'video/mp2t',
                'm3u8': 'application/x-mpegURL'
            };
            return types[ext] || 'video/mp4';
        }
        
        console.log('✓ Video.js Enhanced Plugin ready! (v8.17.3 - SEEKING FIX + TOUCH)');
        console.log('✓ Supported: MP4, WebM, OGG, MKV, AVI, MOV, M3U8, TS');
        console.log('✓ .TS files: HTTP range-based seeking with lazy loading!');
        console.log('✓ Controls: Speed/Subtitle/Fullscreen at rightmost');
        console.log('✓ Features: Auto subtitles, manual upload, speed control, remaining time');
        console.log('✓ Touch: Center tap=play/pause, Side tap=controls, Double tap=skip 5s');
        console.log('✓ Touch Seek: Adaptive (full width = 60s), shows target time while dragging');
        console.log('Note: Network 404s for subtitle checks are normal (only checking common patterns)');
    }
})();
