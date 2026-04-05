'use strict';

import './styles.css';
import { FloatingReviewWindow } from './windows/FloatingReviewWindow.js';
import { FloatingExplainWindow } from './windows/FloatingExplainWindow.js';

// Singleton instances
const windowInstances = {
  review: null,
  explain: null
};

console.log('[CS] Content script loaded on:', window.location.href);

// Notify the service worker that this content script is ready to receive messages.
// The SW awaits this signal after injecting us, instead of using a fixed delay.
chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {});

/**
 * Get or create window instance (singleton factory).
 * Reuses the same instance until DOM is removed (e.g. page unload / destroy()).
 * Closing the window (hide) does not remove DOM, so the same instance is reused.
 */
function getWindowInstance(type, WindowClass) {
  if (windowInstances[type] && !windowInstances[type].exists()) {
    windowInstances[type] = null;
  }
  if (!windowInstances[type]) {
    windowInstances[type] = new WindowClass();
  }
  return windowInstances[type];
}

// Listen for messages from background script (one handler, linear flow)
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'toggleFloatingWindow') {
    console.log('[CS] Toggle window message received, timestamp:', request.timestamp);
    
    // Ignore stale messages (older than 5 seconds)
    const messageAge = Date.now() - (request.timestamp || 0);
    console.log('[CS] Message age:', messageAge, 'ms');
    if (messageAge > 5000) {
      console.log('[CS] ❌ IGNORING stale toggleFloatingWindow message (too old)');
      return false;
    }
    
    const win = getWindowInstance('review', FloatingReviewWindow);
    win.toggle();
    return false;
  }
  if (request.action === 'explainText') {
    console.log('[CS] ========== EXPLAIN MESSAGE RECEIVED ==========');
    console.log('[CS] Request text:', request.text?.substring(0, 50) + (request.text?.length > 50 ? '...' : ''));
    console.log('[CS] Request text length:', request.text?.length);
    console.log('[CS] Request timestamp:', request.timestamp);
    
    // Ignore stale messages (older than 5 seconds)
    const messageAge = Date.now() - (request.timestamp || 0);
    console.log('[CS] Message age:', messageAge, 'ms');
    if (messageAge > 5000) {
      console.log('[CS] ❌ IGNORING stale message (too old)');
      return false;
    }
    
    // Reuse same explain window instance; show() updates content and makes it visible
    const win = getWindowInstance('explain', FloatingExplainWindow);
    
    console.log('[CS] Window exists:', !!win.window);
    console.log('[CS] Window display:', win.window?.style.display);
    console.log('[CS] Window selectedText:', win.selectedText?.substring(0, 50) + (win.selectedText?.length > 50 ? '...' : ''));
    console.log('[CS] ✅ Calling win.show()');
    
    win.show(request.text);
    return false;
  }
  return false;
});

// Handle window resize - adjust positions if they go out of bounds
window.addEventListener('resize', () => {
  Object.values(windowInstances).forEach(instance => {
    if (instance && instance.exists() && instance.window.style.display !== 'none') {
      const rect = instance.window.getBoundingClientRect();
      const safe = instance.ensureWindowInBounds(rect);
      Object.assign(instance.window.style, {
        left: `${safe.left}px`,
        top: `${safe.top}px`,
        width: `${safe.width}px`,
        height: `${safe.height}px`
      });
    }
  });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  Object.values(windowInstances).forEach(instance => {
    if (instance) instance.destroy();
  });
});
