/**
 * pyAux - Improved Spotify Playlist Analyser
 * Enhanced JavaScript with better error handling and features
 * Version: 2.0.0
 */

// ==================== CONSTANTS ====================
const ERROR_MESSAGES = {
    INVALID_URL: {
        title: 'Invalid Playlist URL',
        message: 'Please enter a valid Spotify playlist URL',
        icon: '🔗'
    },
    PRIVATE_PLAYLIST: {
        title: 'Private Playlist',
        message: 'This playlist is private. Please make it public or use a different playlist.',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-yellow)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'
    },
    NOT_FOUND: {
        title: 'Playlist Not Found',
        message: 'We couldn\'t find this playlist. Please check the URL and try again.',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    },
    RATE_LIMIT: {
        title: 'Too Many Requests',
        message: 'Please wait a moment before analysing another playlist.',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-yellow)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
    },
    NETWORK_ERROR: {
        title: 'Connection Error',
        message: 'Unable to connect. Please check your internet connection and try again.',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>'
    },
    SERVER_ERROR: {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again in a moment.',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-yellow)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    },
    GENERIC: {
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    }
};

const LOADING_MESSAGES = [
    'Fetching track data...',
    'Analysing artists...',
    'Calculating diversity...',
    'Evaluating genres...',
    'Computing ratings...',
    'Generating recommendations...',
    'Finalising analysis...'
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debounce function to limit rate of function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show an element with animation
 */
function showElement(element) {
    if (!element) return;
    element.style.display = 'flex';
    element.classList.add('show');
    element.setAttribute('aria-hidden', 'false');
}

/**
 * Hide an element
 */
function hideElement(element) {
    if (!element) return;
    element.style.display = 'none';
    element.classList.remove('show');
    element.setAttribute('aria-hidden', 'true');
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/**
 * Enhanced error display with better UX
 */
function showError(message, errorType = 'GENERIC') {
    const errorElement = document.getElementById('errorMessage');
    if (!errorElement) return;
    
    const error = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.GENERIC;
    
    errorElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.5rem;">${error.icon}</span>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 4px;">${error.title}</strong>
                <span>${message || error.message}</span>
            </div>
        </div>
    `;
    errorElement.classList.add('show');
    errorElement.setAttribute('role', 'alert');
    
    // Auto-hide after 7 seconds
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 7000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (!successElement) return;
    
    successElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>${message}</span>
        </div>
    `;
    successElement.classList.add('show');
    
    setTimeout(() => {
        successElement.classList.remove('show');
    }, 5000);
}

/**
 * Validate Spotify playlist URL
 */
function validatePlaylistUrl(url) {
    // Spotify playlist URL patterns
    const patterns = [
        /^https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
        /^spotify:playlist:([a-zA-Z0-9]+)/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

/**
 * Extract playlist ID from URL
 */
function extractPlaylistId(url) {
    const match = url.match(/playlist[\/:]([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

/**
 * Update loading progress
 */
let loadingMessageIndex = 0;
let loadingInterval;

function startLoadingProgress() {
    loadingMessageIndex = 0;
    const statusElement = document.getElementById('loadingStatus');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!statusElement || !progressFill || !progressText) return;
    
    // Update message every 2 seconds
    loadingInterval = setInterval(() => {
        if (loadingMessageIndex < LOADING_MESSAGES.length) {
            statusElement.textContent = LOADING_MESSAGES[loadingMessageIndex];
            const progress = ((loadingMessageIndex + 1) / LOADING_MESSAGES.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
            loadingMessageIndex++;
        } else {
            clearInterval(loadingInterval);
        }
    }, 2000);
}

function stopLoadingProgress() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format duration from milliseconds to mm:ss
 */
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ==================== HOME PAGE ====================

if (document.getElementById('analyseForm')) {
    const form = document.getElementById('analyseForm');
    const urlInput = document.getElementById('playlistUrl');
    const loadingAnimation = document.getElementById('loadingAnimation');
    const analyseBtn = document.getElementById('analyseBtn');
    
    // Real-time URL validation
    if (urlInput) {
        urlInput.addEventListener('input', debounce(() => {
            const url = urlInput.value.trim();
            if (url === '') {
                urlInput.setAttribute('aria-invalid', 'false');
                return;
            }
            
            if (validatePlaylistUrl(url)) {
                urlInput.setAttribute('aria-invalid', 'false');
                urlInput.style.borderColor = 'var(--success-green)';
            } else {
                urlInput.setAttribute('aria-invalid', 'true');
                urlInput.style.borderColor = 'var(--error-red)';
            }
        }, 500));
    }
    
    /**
     * Handle form submission
     */
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Get and validate URL
        const playlistUrl = urlInput.value.trim();
        
        if (!playlistUrl) {
            showError('Please enter a Spotify playlist URL', 'INVALID_URL');
            urlInput.focus();
            return;
        }
        
        if (!validatePlaylistUrl(playlistUrl)) {
            showError('Please enter a valid Spotify playlist URL', 'INVALID_URL');
            urlInput.setAttribute('aria-invalid', 'true');
            urlInput.focus();
            return;
        }
        
        // Disable form during submission
        analyseBtn.disabled = true;
        analyseBtn.style.opacity = '0.6';
        urlInput.disabled = true;
        
        // Show loading animation
        showElement(loadingAnimation);
        startLoadingProgress();
        hideElement(document.getElementById('errorMessage'));
        hideElement(document.getElementById('successMessage'));
        
        try {
            // Get playlist purpose
            const purposeSelect = document.getElementById('playlistPurpose');
            const purpose = purposeSelect ? purposeSelect.value : 'general';
            
            // Send request to Flask backend
            const response = await fetch('/analyse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlist_url: playlistUrl,
                    purpose: purpose
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle different error types
                let errorType = 'GENERIC';
                if (response.status === 404) errorType = 'NOT_FOUND';
                else if (response.status === 429) errorType = 'RATE_LIMIT';
                else if (response.status === 403) errorType = 'PRIVATE_PLAYLIST';
                else if (response.status >= 500) errorType = 'SERVER_ERROR';
                
                throw new Error(data.error || ERROR_MESSAGES[errorType].message);
            }
            
            if (data.success) {
                // Store results in sessionStorage
                sessionStorage.setItem('playlistResults', JSON.stringify(data));
                sessionStorage.setItem('analysisTimestamp', Date.now().toString());
                
                // Show success briefly before redirect
                showSuccess('Analysis complete! Redirecting...');
                
                // Redirect to results page
                setTimeout(() => {
                    window.location.href = '/results';
                }, 1000);
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
            
        } catch (error) {
            stopLoadingProgress();
            hideElement(loadingAnimation);
            
            // Re-enable form
            analyseBtn.disabled = false;
            analyseBtn.style.opacity = '1';
            urlInput.disabled = false;
            
            // Show error message
            if (error.message.includes('fetch')) {
                showError(ERROR_MESSAGES.NETWORK_ERROR.message, 'NETWORK_ERROR');
            } else {
                showError(error.message);
            }
            
            console.error('Analysis error:', error);
        }
    });
    
    // Track mouse position for hover effect
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        inputSection.addEventListener('mousemove', (e) => {
            const rect = inputSection.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            inputSection.style.setProperty('--mouse-x', `${x}%`);
            inputSection.style.setProperty('--mouse-y', `${y}%`);
        });
    }
}

// ==================== PWA INSTALL ====================

let deferredPrompt;

// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install prompt
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.removeAttribute('hidden');
    }
});

/**
 * Install PWA
 */
function installApp() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            showToast('App installed successfully!');
        }
        deferredPrompt = null;
        dismissInstall();
    });
}

/**
 * Dismiss install prompt
 */
function dismissInstall() {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.setAttribute('hidden', '');
    }
    localStorage.setItem('installPromptDismissed', 'true');
}

// Check if user previously dismissed install prompt
if (localStorage.getItem('installPromptDismissed')) {
    dismissInstall();
}

// ==================== PAGE LOAD ANIMATIONS ====================

window.addEventListener('DOMContentLoaded', () => {
    // Animate feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
});

// ==================== ACCESSIBILITY ====================

/**
 * Keyboard navigation support
 */
document.addEventListener('keydown', (event) => {
    // Enter key on buttons
    if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
        event.target.click();
    }
    
    // Escape key to close modals
    if (event.key === 'Escape') {
        closeExamples();
        closeShare();
    }
});

/**
 * Focus trap for modals
 */
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

// Apply focus trap to modals
const modals = document.querySelectorAll('.modal');
modals.forEach(modal => trapFocus(modal));

// ==================== ERROR HANDLING ====================

// Global error handler (for production error tracking if needed)
window.addEventListener('error', (event) => {
    console.error('Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejection:', event.reason);
});

