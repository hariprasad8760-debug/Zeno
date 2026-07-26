/* ==========================================================================
   Zeno AI Assistant - Interactive Logic (Prototype UI)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // --- UI Elements ---
  const htmlElement = document.documentElement;
  
  // Left Sidebar Toggles & Actions
  const newChatBtn = document.getElementById("new-chat-btn");
  const chatHistoryList = document.getElementById("chat-history-list");
  const agentModeToggle = document.getElementById("agent-mode-toggle");
  const agentModeDesc = document.getElementById("agent-mode-desc");
  const settingsBtn = document.getElementById("settings-btn");
  const mobileSidebarToggle = document.getElementById("sidebar-toggle-mobile");
  const sidebarLeft = document.querySelector(".sidebar-left");

  // Main Header
  const profileAvatarBtn = document.getElementById("profile-avatar-btn");
  const profileDropdown = document.getElementById("profile-dropdown");

  // Main Chat Workspace & Empty State
  const chatContainer = document.getElementById("chat-container");
  const emptyState = document.getElementById("empty-state");
  const welcomeNormalView = document.getElementById("welcome-normal-view");
  const agentActivatedView = document.getElementById("agent-activated-view");
  const messagesList = document.getElementById("messages-list");
  const typingIndicator = document.getElementById("typing-indicator");
  const quickCards = document.querySelectorAll(".action-card");

  // Input & Footer
  const promptInput = document.getElementById("prompt-input");
  const sendBtn = document.getElementById("send-btn");
  const attachBtn = document.getElementById("attach-btn");
  const fileInput = document.getElementById("file-input");
  const fileAttachmentBadge = document.getElementById("file-attachment-badge");

  // Floating AI Agent Overlay (Bottom-Right)
  const floatingAgentContainer = document.getElementById("floating-agent-container");
  const floatingAgentBtn = document.getElementById("floating-agent-btn");
  const agentPopupCard = document.getElementById("agent-popup-card");
  const agentPopupClose = document.getElementById("agent-popup-close");
  const btnClipboard = document.getElementById("agent-btn-clipboard");
  const btnScreenshot = document.getElementById("agent-btn-screenshot");

  // Area Selection Screenshot Overlay
  const screenshotOverlay = document.getElementById("screenshot-overlay");
  const screenshotCanvasArea = document.getElementById("screenshot-canvas-area");
  const screenshotStatusBanner = document.getElementById("screenshot-status-banner");
  const clipboardLoaderToast = document.getElementById("clipboard-loader-toast");

  // Settings Modal Elements
  const settingsModal = document.getElementById("settings-modal");
  const settingsModalClose = document.getElementById("settings-modal-close");
  const themeSelect = document.getElementById("theme-select");
  const modelSelect = document.getElementById("model-select");
  const tempSlider = document.getElementById("temp-slider");
  const tempVal = document.getElementById("temp-val");
  const apiKeyInput = document.getElementById("api-key-input");
  const prefAnimations = document.getElementById("pref-animations");
  const settingsResetBtn = document.getElementById("settings-reset-btn");
  const settingsSaveBtn = document.getElementById("settings-save-btn");
  const dropdownSettingsTrigger = document.getElementById("dropdown-settings-trigger");
  
  // Theme Collapsible Swatches
  const themeBarToggleBtn = document.getElementById("theme-bar-toggle-btn");
  const themeChevron = document.getElementById("theme-chevron");
  const colorPickerContainer = document.getElementById("color-picker-container");
  const colorSwatches = document.querySelectorAll(".color-swatch");

  // State Variables
  let activeChatId = 1;
  let chatSessionActive = false;
  let currentModel = "zeno-3.5-pro";
  let prefAnimationsEnabled = true;
  let activeAccentTheme = "blue";
  let particleTimer = null;
  let agentTimer = null;

  // --- Mock Responses Database ---
  const mockResponses = {
    explain: {
      text: "Understood. The React reference loop issue typically occurs when updating a component's state inside the `useEffect` hook without specifying correct dependency arrays, or by modifying variables that trigger another execution. Here is a diagnostic breakdown:",
      code: `// ❌ BUGGY IMPLEMENTATION - Triggers infinite loop
useEffect(() => {
  const count = data.length;
  // State update here re-renders component, which re-runs this effect
  setData([...data, { id: count + 1 }]); 
}, [data]); // <-- 'data' in dependency array triggers the loop!

//  OPTIMIZED SOLUTION
useEffect(() => {
  // Restrict execution. Fetch or run once upon initial render
  fetchInitialData().then(res => {
    setData(res);
  });
}, []); // <-- Empty array indicates running once upon mounting`,
      lang: "javascript",
      conclusion: "Ensure state mutations inside standard hooks are guarded by conditional checks or triggered solely by specific user actions rather than reactive rendering cycles."
    },
    optimize: {
      text: "Optimizing the code script for performance. A recursive Fibonacci calculation has a time complexity of \\(O(2^n)\\) which scales poorly. We can resolve this using dynamic programming or memoization to bring it down to linear time complexity \\(O(n)\\).",
      code: `/* Optimized Dynamic Programming (Iterative) Approach */
function fibonacci(n) {
  if (n <= 1) return n;
  
  let prev2 = 0; // f(n-2)
  let prev1 = 1; // f(n-1)
  let current = 0;
  
  for (let i = 2; i <= n; i++) {
    current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  
  return current;
}

// Time Complexity: O(n)
// Space Complexity: O(1)`,
      lang: "javascript",
      conclusion: "By converting recursive trees into iterative dynamic arrays, you save heap allocations, prevent call stack errors, and minimize execution delay."
    },
    debug: {
      text: "Reviewing environment configuration for connection errors. Port collision (e.g. \`EADDRINUSE: address already in use :::3000\`) occurs because an existing process is holding port bindings. Here is how to diagnose and address it:",
      code: `# 1. Identify which PID is binding the target port (Windows PowerShell)
netstat -aon | findstr :3000

# 2. Terminate the blocking process using the PID found
taskkill /F /PID <PID_NUMBER>

# 3. Alternative (Linux/MacOS)
kill -9 $(lsof -t -i:3000)`,
      lang: "bash",
      conclusion: "Alternatively, you can implement an environment variable configuration in your project to dynamically bind to any unoccupied backup port: \`const PORT = process.env.PORT || 3001;\`."
    },
    agentClipboard: {
      text: "🔔 **AI Agent (Clipboard Scan)**: Scanned clipboard text code snippet. Suggested optimizations:",
      code: `// Found on clipboard:
const calculateTotal = (items) => {
  return items.reduce((acc, item) => acc + item.price * (item.tax || 1.12), 0);
};

// Optimized Variant:
const calculateTotal = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => {
    if (!item || typeof item.price !== 'number') return acc;
    return acc + item.price * (item.tax ?? 1.12);
  }, 0);
};`,
      lang: "javascript",
      conclusion: "Code sanitized with type-check boundaries."
    },
    agentScreenshot: {
      text: "🔔 **AI Agent (Screenshot Analysis)**: Selected area screenshot parsed. Suggested layout refinement:",
      code: `/* Found layout anomaly */
.flex-container {
  display: flex;
  justify-content: center;
  align-items: center; 
}

/* Resolution: Add flex-wrap for adaptive wrapping */
.flex-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}`,
      lang: "css",
      conclusion: "Flex wrapping addresses viewport boundary clipping."
    },
    default: {
      text: "Hello! I am Zeno, your AI coding assistant. This is an interactive mockup showcasing Zeno's high-fidelity developer workspace. I can help explain exceptions, structure pipelines, and optimize code blocks. Try writing simple prompts like 'optimize code' or 'explain React loop'.",
      code: `// Sample coding with Zeno AI
const zeno = {
  version: "3.5",
  mode: "Agent Enabled",
  status: "Operational",
  greet() {
    console.log("Ready to assist!");
  }
};
zeno.greet();`,
      lang: "javascript",
      conclusion: "Use the toggles on the left sidebar to enable AI Agent Background checks, or adjust modal configurations to modify the environment settings."
    }
  };

  // --- Initial Setup & Initialization ---
  loadSettings();

  // --- Event Listeners ---

  // New Chat Action
  newChatBtn.addEventListener("click", resetChatWorkspace);

  // Settings Modal Controls
  settingsBtn.addEventListener("click", () => showModal(settingsModal));
  dropdownSettingsTrigger.addEventListener("click", (e) => {
    e.preventDefault();
    profileDropdown.classList.remove("show");
    showModal(settingsModal);
  });
  settingsModalClose.addEventListener("click", () => hideModal(settingsModal));
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) hideModal(settingsModal);
  });
  settingsResetBtn.addEventListener("click", resetSettingsDefaults);
  settingsSaveBtn.addEventListener("click", saveSettings);
  tempSlider.addEventListener("input", () => {
    tempVal.textContent = tempSlider.value;
  });

  // Collapsible Theme Bar Toggle Click
  themeBarToggleBtn.addEventListener("click", () => {
    colorPickerContainer.classList.toggle("collapsed");
    themeChevron.classList.toggle("rotated");
  });

  // Color Picker Swatches Interaction ("total bar")
  colorSwatches.forEach(swatch => {
    swatch.addEventListener("click", () => {
      colorSwatches.forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      activeAccentTheme = swatch.getAttribute("data-color");
      // Preview instantly
      htmlElement.setAttribute("data-accent-theme", activeAccentTheme);
    });
  });

  // User Profile Dropdown
  profileAvatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("show");
  });
  document.addEventListener("click", (e) => {
    if (!profileContainerContains(e.target)) {
      profileDropdown.classList.remove("show");
    }
  });

  function profileContainerContains(target) {
    return profileAvatarBtn.contains(target) || profileDropdown.contains(target);
  }

  // Sidebar List item selection
  document.querySelectorAll(".chat-history-list .chat-item").forEach(item => {
    setupChatItemEventListener(item);
  });

  function setupChatItemEventListener(item) {
    item.addEventListener("click", (e) => {
      if (e.target.closest(".delete-chat-btn")) return;
      
      document.querySelectorAll(".chat-history-list .chat-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      activeChatId = item.getAttribute("data-chat-id");
      
      loadSimulatedChatSession(activeChatId, item.querySelector(".item-text").textContent);
    });

    const deleteBtn = item.querySelector(".delete-chat-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        item.remove();
        if (item.classList.contains("active")) {
          resetChatWorkspace();
        }
      });
    }
  }

  // Mobile navigation drawer toggle
  mobileSidebarToggle.addEventListener("click", () => {
    sidebarLeft.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebarLeft.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
        sidebarLeft.classList.remove("open");
      }
    }
  });

  // AI Agent Mode Toggle (reverts home screen after 4 seconds)
  agentModeToggle.addEventListener("change", () => {
    const parentPanel = document.querySelector(".agent-mode-panel");
    if (agentModeToggle.checked) {
      parentPanel.classList.add("enabled");
      agentModeDesc.textContent = "Background Agent Enabled";
      floatingAgentContainer.classList.add("visible");
      
      if (agentTimer) {
        clearTimeout(agentTimer);
        agentTimer = null;
      }

      // Show agent animation view and add entry animation class
      welcomeNormalView.style.display = "none";
      agentActivatedView.classList.add("active-animate");
      startAgentParticles();

      // Reset welcome panel layout back to normal greeting after 4 seconds
      agentTimer = setTimeout(() => {
        if (agentModeToggle.checked) {
          agentActivatedView.classList.remove("active-animate");
          welcomeNormalView.style.display = "flex";
          stopAgentParticles();
        }
      }, 4000);

      pushSystemNotification("Zeno Background Agent Activated.");
    } else {
      parentPanel.classList.remove("enabled");
      agentModeDesc.textContent = "Manual mode";
      floatingAgentContainer.classList.remove("visible");
      agentPopupCard.classList.remove("show");

      if (agentTimer) {
        clearTimeout(agentTimer);
        agentTimer = null;
      }
      agentActivatedView.classList.remove("active-animate");
      welcomeNormalView.style.display = "flex";
      stopAgentParticles();
    }
  });

  // Flowing particles inward generation
  function startAgentParticles() {
    stopAgentParticles();
    const emitter = document.getElementById("particle-emitter");
    if (!emitter) return;

    particleTimer = setInterval(() => {
      const particle = document.createElement("div");
      particle.className = "activated-particle";
      
      const angle = Math.random() * 360;
      const startRadius = (80 + Math.random() * 30) + "px";
      
      particle.style.setProperty("--angle", angle + "deg");
      particle.style.setProperty("--start-radius", startRadius);
      particle.style.left = "50%";
      particle.style.top = "50%";
      
      const duration = (1.5 + Math.random() * 1.5) + "s";
      particle.style.animationDuration = duration;
      
      emitter.appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, 3000);
    }, 120);
  }

  function stopAgentParticles() {
    if (particleTimer) {
      clearInterval(particleTimer);
      particleTimer = null;
    }
    const emitter = document.getElementById("particle-emitter");
    if (emitter) emitter.innerHTML = "";
  }

  // Floating Action Button (Bottom-Right)
  floatingAgentBtn.addEventListener("click", () => {
    agentPopupCard.classList.toggle("show");
  });
  agentPopupClose.addEventListener("click", () => {
    agentPopupCard.classList.remove("show");
  });

  // Agent Actions Interaction
  btnClipboard.addEventListener("click", () => {
    agentPopupCard.classList.remove("show");
    clipboardLoaderToast.classList.add("show");
    
    setTimeout(() => {
      clipboardLoaderToast.classList.remove("show");
      
      if (!chatSessionActive) {
        emptyState.style.display = "none";
        messagesList.innerHTML = "";
        chatSessionActive = true;
      }
      
      appendMessage("Analyze clipboard content.", "user");
      typingIndicator.style.display = "flex";
      chatContainer.scrollTop = chatContainer.scrollHeight;

      setTimeout(() => {
        typingIndicator.style.display = "none";
        appendMessage(formatAIResponse(mockResponses.agentClipboard), "ai", "agentClipboard");
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 1200);

    }, 1800);
  });

  // Area Selection Drag Screenshot Flow
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let activeRect = null;

  btnScreenshot.addEventListener("click", () => {
    agentPopupCard.classList.remove("show");
    screenshotOverlay.classList.add("active");
  });

  screenshotCanvasArea.addEventListener("mousedown", (e) => {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    activeRect = document.createElement("div");
    activeRect.className = "selection-rect";
    activeRect.style.left = startX + "px";
    activeRect.style.top = startY + "px";
    screenshotCanvasArea.appendChild(activeRect);
  });

  screenshotCanvasArea.addEventListener("mousemove", (e) => {
    if (!isDrawing || !activeRect) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    const left = currentX < startX ? currentX : startX;
    const top = currentY < startY ? currentY : startY;
    
    activeRect.style.width = width + "px";
    activeRect.style.height = height + "px";
    activeRect.style.left = left + "px";
    activeRect.style.top = top + "px";
  });

  screenshotCanvasArea.addEventListener("mouseup", () => {
    if (!isDrawing) return;
    isDrawing = false;
    
    screenshotStatusBanner.classList.add("show");
    
    setTimeout(() => {
      screenshotStatusBanner.classList.remove("show");
      screenshotOverlay.classList.remove("active");
      if (activeRect) {
        activeRect.remove();
        activeRect = null;
      }

      if (!chatSessionActive) {
        emptyState.style.display = "none";
        messagesList.innerHTML = "";
        chatSessionActive = true;
      }
      
      appendMessage("Captured selected area screenshot.", "user");
      typingIndicator.style.display = "flex";
      chatContainer.scrollTop = chatContainer.scrollHeight;

      setTimeout(() => {
        typingIndicator.style.display = "none";
        appendMessage(formatAIResponse(mockResponses.agentScreenshot), "ai", "agentScreenshot");
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 1500);

    }, 2000);
  });

  // Prompt Area Submissions
  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = (promptInput.scrollHeight) + "px";
    
    if (promptInput.value.trim().length > 0) {
      sendBtn.removeAttribute("disabled");
    } else {
      sendBtn.setAttribute("disabled", "true");
    }
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  });

  sendBtn.addEventListener("click", handlePromptSubmit);

  // File Attachments
  attachBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      const filesCount = fileInput.files.length;
      fileAttachmentBadge.style.display = "flex";
      fileAttachmentBadge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        <span>${filesCount} ${filesCount === 1 ? 'file' : 'files'} attached</span>
      `;
    } else {
      fileAttachmentBadge.style.display = "none";
    }
  });

  // =====================================================================
  // MODE PANEL SYSTEM — Explain Error / Optimize / Debug
  // =====================================================================
  let activeMode = null;

  const modePanel      = document.getElementById("mode-panel");
  const modePanelTitle = document.getElementById("mode-panel-name");
  const modePanelIcon  = document.getElementById("mode-panel-icon");
  const modePanelBody  = document.getElementById("mode-panel-body");
  const modePanelClose = document.getElementById("mode-panel-close");
  const modeStepList   = document.getElementById("mode-step-list");
  const modeBanner     = document.getElementById("mode-banner");
  const modeBannerText = document.getElementById("mode-banner-text");
  const modeBannerIcon = document.getElementById("mode-banner-icon");
  const modeBannerClose = document.getElementById("mode-banner-close");

  const MODE_CONFIG = {
    explain: {
      icon: "🔍",
      label: "Explain Error Mode",
      color: "rgba(239,68,68,0.3)",
      steps: [
        { line: "Line 1", text: "<strong>Import / Declaration</strong> — Module imports and variable declarations are evaluated. Ensure all dependencies are available before use." },
        { line: "Line 5", text: "<strong>Function Definition</strong> — The function is registered in memory. Watch for closure captures that may reference stale values." },
        { line: "Line 12", text: "<strong>Async / Await</strong> — Promise-based execution pauses here. If the awaited expression rejects, the catch block must handle it or the error propagates." },
        { line: "Line 18", text: "<strong>State Mutation ⚠️</strong> — State update triggers re-render. If this is inside a useEffect with the same state in its dependency array, you will get an <em>infinite render loop</em>." },
        { line: "Line 24", text: "<strong>Return / Cleanup</strong> — Component unmount or function exit. Return cleanup functions inside useEffect to prevent memory leaks." },
        { line: "Root Cause", text: "<strong>Infinite Loop Detected</strong> — The state variable used to update the UI is also listed as a dependency, causing every render to trigger another update cycle. <em>Remove it from the dependency array or wrap with a condition.</em>" },
      ]
    },
    optimize: {
      icon: "⚡",
      label: "Optimize Code Mode",
      color: "rgba(139,92,246,0.3)",
      steps: [
        { line: "Step 1", text: "<strong>Static Analysis</strong> — Scanning for redundant variable declarations, unused imports, and dead code branches." },
        { line: "Step 2", text: "<strong>Loop Complexity</strong> — Nested loops detected with O(n²) complexity. Refactoring to use a <em>HashMap lookup</em> to reduce to O(n)." },
        { line: "Step 3", text: "<strong>Memoization</strong> — Recursive calls recalculate identical sub-problems. Applying <em>memoization</em> or iterative dynamic programming reduces redundant computation." },
        { line: "Step 4", text: "<strong>Type Safety</strong> — Missing null checks found. Added <em>optional chaining (?.) </em>and <em>nullish coalescing (??)</em> operators for safer access." },
        { line: "Step 5", text: "<strong>Simplification Complete ✅</strong> — Code reduced by ~40%. Time complexity improved from O(2ⁿ) → O(n). All edge cases are now handled." },
      ]
    },
    debug: {
      icon: "🐛",
      label: "Debug Mode",
      color: "rgba(16,185,129,0.3)",
      steps: [
        { line: "Check 1", text: "<strong>Environment Variables</strong> — Verifying .env file exists and all required keys (API_KEY, PORT, DB_URL) are defined and non-empty." },
        { line: "Check 2", text: "<strong>Dependency Tree</strong> — Running dependency audit. Found 2 version conflicts. Recommended: upgrade <em>react-dom</em> to match <em>react@18.x</em>." },
        { line: "Check 3", text: "<strong>Port Conflict ⚠️</strong> — Port 3000 is already bound by another process. Run <code style='color:#10b981'>netstat -aon | findstr :3000</code> then <code style='color:#10b981'>taskkill /PID &lt;PID&gt; /F</code> to release it." },
        { line: "Check 4", text: "<strong>Error Boundary</strong> — No global error boundary detected. Wrapping root component in <em>ErrorBoundary</em> will prevent full app crashes from uncaught errors." },
        { line: "Fix Applied ✅", text: "<strong>Auto-corrected</strong> — Port reassigned to 3001, dependency tree resolved, environment validated. Code is ready for production build." },
      ]
    }
  };

  // Show mode banner — stays visible until user clicks Exit
  function showModeBanner(icon, text) {
    modeBannerIcon.textContent = icon;
    modeBannerText.textContent = text;
    modeBanner.classList.add("show");
    // No auto-dismiss — user must click Exit
  }

  // Exit button: hide banner and fully deactivate the mode
  modeBannerClose.addEventListener("click", () => {
    deactivateMode(true);
  });

  function activateMode(action) {
    if (activeMode === action) {
      deactivateMode(true);
      return;
    }
    deactivateMode(false);
    activeMode = action;

    const cfg = MODE_CONFIG[action];

    // highlight header button and action card
    document.querySelectorAll(".action-card").forEach(c => {
      c.classList.remove("mode-active");
      if (c.getAttribute("data-action") === action) c.classList.add("mode-active");
    });
    document.querySelectorAll(".header-mode-btn").forEach(b => {
      b.classList.remove("active");
      if (b.getAttribute("data-mode") === action) b.classList.add("active");
    });

    // Show mode banner only — no panel, no step list
    showModeBanner(cfg.icon, cfg.label + " · ON");
  }

  function deactivateMode(clearBanner = true) {
    activeMode = null;
    document.querySelectorAll(".action-card").forEach(c => c.classList.remove("mode-active"));
    document.querySelectorAll(".header-mode-btn").forEach(b => b.classList.remove("active"));
    modePanel.classList.remove("show");
    if (clearBanner) modeBanner.classList.remove("show");
  }

  modePanelClose.addEventListener("click", () => deactivateMode());

  // Quick Action Cards triggers — activate mode panels
  quickCards.forEach(card => {
    card.addEventListener("click", () => {
      const action = card.getAttribute("data-action");
      activateMode(action);
    });
  });

  // Header mode buttons — wire to same activateMode
  document.querySelectorAll(".header-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      activateMode(mode);
      if (!chatSessionActive) {
        emptyState.style.display = "flex";
      }
    });
  });


  // Global Keyboard shortcuts handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideModal(settingsModal);
      agentPopupCard.classList.remove("show");
      profileDropdown.classList.remove("show");
      
      if (screenshotOverlay.classList.contains("active")) {
        screenshotOverlay.classList.remove("active");
        screenshotStatusBanner.classList.remove("show");
        if (activeRect) {
          activeRect.remove();
          activeRect = null;
        }
      }
    }
    
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      resetChatWorkspace();
    }

    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        sidebarLeft.classList.toggle("open");
      } else {
        sidebarLeft.classList.toggle("collapsed");
      }
    }
  });

  // --- Logic Implementations ---

  // Handle message prompt submission
  function handlePromptSubmit() {
    const text = promptInput.value.trim();
    if (!text) return;

    promptInput.value = "";
    promptInput.style.height = "auto";
    sendBtn.setAttribute("disabled", "true");

    fileAttachmentBadge.style.display = "none";
    fileInput.value = "";

    if (!chatSessionActive) {
      emptyState.style.display = "none";
      messagesList.innerHTML = "";
      chatSessionActive = true;
    }

    appendMessage(text, "user");

    const skeletonId = appendSkeletonMessage();
    chatContainer.scrollTop = chatContainer.scrollHeight;

    let responseKey = "default";
    const cleanText = text.toLowerCase();
    if (cleanText.includes("explain") || cleanText.includes("loop") || cleanText.includes("react")) {
      responseKey = "explain";
    } else if (cleanText.includes("optimize") || cleanText.includes("fibonacci") || cleanText.includes("recursive")) {
      responseKey = "optimize";
    } else if (cleanText.includes("debug") || cleanText.includes("port") || cleanText.includes("collision") || cleanText.includes("addr")) {
      responseKey = "debug";
    }

    setTimeout(() => {
      removeSkeletonMessage(skeletonId);

      const responseData = mockResponses[responseKey];
      appendMessage(formatAIResponse(responseData), "ai", responseKey);
      
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 1500 + Math.random() * 800);
  }

  // Skeleton Loader for AI Responses
  let skeletonCount = 0;
  function appendSkeletonMessage() {
    skeletonCount++;
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper ai";
    wrapper.id = `skeleton-msg-${skeletonCount}`;
    wrapper.innerHTML = `
      <div class="message-avatar" title="Zeno AI">
        <!-- Mini brain logo SVG -->
        <svg class="indicator-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:24px;height:24px;">
          <rect x="4" y="4" width="92" height="92" rx="26" fill="var(--accent-color)" fill-opacity="0.15" stroke="var(--accent-color)" stroke-width="6"/>
          <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M 50 20 L 36 26 L 28 38 L 26 50 L 32 64 L 44 72 L 50 78 L 56 72 L 68 64 L 74 50 L 72 38 L 64 26 Z" />
          </g>
        </svg>
      </div>
      <div class="message-bubble">
        <div class="skeleton-msg">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `;
    messagesList.appendChild(wrapper);
    return wrapper.id;
  }

  function removeSkeletonMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Append User/AI chat bubbles
  function appendMessage(content, sender, responseKey = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${sender}`;

    if (sender === "ai") {
      wrapper.innerHTML = `
        <div class="message-avatar" title="Zeno AI">
          <!-- Mini brain cogs logo SVG -->
          <svg class="indicator-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:24px;height:24px;">
            <rect x="4" y="4" width="92" height="92" rx="26" fill="var(--accent-color)" fill-opacity="0.15" stroke="var(--accent-color)" stroke-width="6"/>
            <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 50 20 L 36 26 L 28 38 L 26 50 L 32 64 L 44 72 L 50 78 L 56 72 L 68 64 L 74 50 L 72 38 L 64 26 Z" />
            </g>
          </svg>
        </div>
        <div class="message-bubble">
          <div class="message-body">${content}</div>
          <div class="message-actions">
            <button class="msg-action-btn copy-msg-btn" title="Copy Message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
              <span>Copy</span>
            </button>
            <button class="msg-action-btn regen-msg-btn" data-key="${responseKey}" title="Regenerate Output">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Regenerate</span>
            </button>
          </div>
        </div>
      `;

      const copyBtn = wrapper.querySelector(".copy-msg-btn");
      copyBtn.addEventListener("click", () => {
        const bubbleText = wrapper.querySelector(".message-body").innerText;
        navigator.clipboard.writeText(bubbleText).then(() => {
          copyBtn.querySelector("span").textContent = "Copied!";
          setTimeout(() => {
            copyBtn.querySelector("span").textContent = "Copy";
          }, 1500);
        });
      });

      const regenBtn = wrapper.querySelector(".regen-msg-btn");
      regenBtn.addEventListener("click", () => {
        const key = regenBtn.getAttribute("data-key") || "default";
        regenerateAIResponse(wrapper, key);
      });

      wrapper.querySelectorAll(".code-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const pre = btn.closest(".code-block-container").querySelector("pre");
          navigator.clipboard.writeText(pre.innerText).then(() => {
            const spanText = btn.querySelector("span");
            spanText.textContent = "Copied!";
            setTimeout(() => {
              spanText.textContent = "Copy Code";
            }, 1500);
          });
        });
      });

    } else {
      wrapper.innerHTML = `
        <div class="message-bubble">
          <p>${content}</p>
        </div>
      `;
    }

    messagesList.appendChild(wrapper);
  }

  // Format code highlighting
  function formatAIResponse(data) {
    const tokenRegex = /(\/\/.*|\#.*)|(\"[^\"]*\"|\'[^\']*\'|\`[^\`]*\`)|(\b(?:function|const|let|var|return|export|import|from|typeof|if|else|for|while|new|async|await|try|catch)\b)|(\b(?:console\.log|setData|fetchInitialData|taskkill|findstr|netstat)\b)|(\bd+\b)/g;
    
    let formattedCode = data.code.replace(tokenRegex, (match, comment, string, keyword, functionName) => {
      if (comment) return `<span class="code-comment">${match}</span>`;
      if (string) return `<span class="code-string">${match}</span>`;
      if (keyword) return `<span class="code-keyword">${match}</span>`;
      if (functionName) return `<span class="code-function">${match}</span>`;
      return match;
    });

    return `
      <p>${data.text}</p>
      <div class="code-block-container">
        <div class="code-header">
          <span class="code-lang">${data.lang}</span>
          <button class="code-copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
            <span>Copy Code</span>
          </button>
        </div>
        <pre><code>${formattedCode}</code></pre>
      </div>
      <p>${data.conclusion}</p>
    `;
  }

  // Regenerate Response
  function regenerateAIResponse(messageWrapper, key) {
    const bubbleBody = messageWrapper.querySelector(".message-body");
    bubbleBody.style.opacity = "0.3";
    
    bubbleBody.innerHTML = `
      <div class="skeleton-msg">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;

    setTimeout(() => {
      const newResponse = mockResponses[key];
      bubbleBody.innerHTML = formatAIResponse(newResponse);
      bubbleBody.style.opacity = "1";

      bubbleBody.querySelectorAll(".code-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const pre = btn.closest(".code-block-container").querySelector("pre");
          navigator.clipboard.writeText(pre.innerText).then(() => {
            btn.querySelector("span").textContent = "Copied!";
            setTimeout(() => {
              btn.querySelector("span").textContent = "Copy Code";
            }, 1500);
          });
        });
      });
    }, 1200);
  }

  // Load a simulated chat history thread
  function loadSimulatedChatSession(id, title) {
    chatSessionActive = true;
    emptyState.style.display = "none";
    messagesList.innerHTML = "";

    if (id == 1) {
      appendMessage("How can I resolve the dependency loops inside React useEffect hooks when updating standard local references?", "user");
      appendMessage(formatAIResponse(mockResponses.explain), "ai", "explain");
    } else if (id == 2) {
      appendMessage("Write a JSON parser parser schema structure in Python for parsing complex database APIs.", "user");
      appendMessage(formatAIResponse(mockResponses.default), "ai", "default");
    } else if (id == 3) {
      appendMessage("I'm getting port collisions. How do I fix address already in use on port 3000?", "user");
      appendMessage(formatAIResponse(mockResponses.debug), "ai", "debug");
    } else {
      appendMessage(`Viewing cached conversation thread: "${title}"`, "user");
      appendMessage(formatAIResponse(mockResponses.default), "ai", "default");
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Reset workspace
  function resetChatWorkspace() {
    chatSessionActive = false;
    emptyState.style.display = "flex";
    messagesList.innerHTML = "";
    promptInput.value = "";
    promptInput.style.height = "auto";
    sendBtn.setAttribute("disabled", "true");

    // Deactivate any active mode and hide the banner
    deactivateMode(true);

    // Clear active state on sidebar items
    document.querySelectorAll(".chat-history-list .chat-item").forEach(item => {
      item.classList.remove("active");
    });
  }

  // Modal actions
  function showModal(modal) {
    modal.classList.add("show");
  }

  function hideModal(modal) {
    modal.classList.remove("show");
  }

  // Load settings
  function loadSettings() {
    const savedTheme = localStorage.getItem("zeno-theme") || "dark";
    const savedModel = localStorage.getItem("zeno-model") || "zeno-3.5-pro";
    const savedTemp = localStorage.getItem("zeno-temp") || "0.2";
    const savedAnimations = localStorage.getItem("zeno-animations") === null ? "true" : localStorage.getItem("zeno-animations");
    const savedAccentTheme = localStorage.getItem("zeno-accent-theme") || "blue";

    // Theme mode
    htmlElement.setAttribute("data-theme", savedTheme);
    themeSelect.value = savedTheme;

    // Accent theme
    activeAccentTheme = savedAccentTheme;
    htmlElement.setAttribute("data-accent-theme", savedAccentTheme);
    
    colorSwatches.forEach(s => {
      s.classList.remove("active");
      if (s.getAttribute("data-color") === savedAccentTheme) {
        s.classList.add("active");
      }
    });

    modelSelect.value = savedModel;
    tempSlider.value = savedTemp;
    tempVal.textContent = savedTemp;

    prefAnimationsEnabled = savedAnimations === "true";
    prefAnimations.checked = prefAnimationsEnabled;
    toggleAnimationPerformance(prefAnimationsEnabled);
  }

  // Save settings
  function saveSettings() {
    const selectedTheme = themeSelect.value;
    const selectedModel = modelSelect.value;
    const selectedTemp = tempSlider.value;
    const animationsChecked = prefAnimations.checked;

    localStorage.setItem("zeno-theme", selectedTheme);
    localStorage.setItem("zeno-model", selectedModel);
    localStorage.setItem("zeno-temp", selectedTemp);
    localStorage.setItem("zeno-animations", animationsChecked ? "true" : "false");
    localStorage.setItem("zeno-accent-theme", activeAccentTheme);

    htmlElement.setAttribute("data-theme", selectedTheme);
    htmlElement.setAttribute("data-accent-theme", activeAccentTheme);
    currentModel = selectedModel;
    prefAnimationsEnabled = animationsChecked;
    toggleAnimationPerformance(animationsChecked);

    hideModal(settingsModal);
    pushSystemNotification("Theme and preferences updated.");
  }

  // Reset defaults
  function resetSettingsDefaults() {
    themeSelect.value = "dark";
    modelSelect.value = "zeno-3.5-pro";
    tempSlider.value = "0.2";
    tempVal.textContent = "0.2";
    apiKeyInput.value = "zn_live_58c2b9a71fd10c3b889d";
    prefAnimations.checked = true;
    
    activeAccentTheme = "blue";
    htmlElement.setAttribute("data-accent-theme", "blue");
    colorSwatches.forEach(s => {
      s.classList.remove("active");
      if (s.getAttribute("data-color") === "blue") {
        s.classList.add("active");
      }
    });
  }

  function toggleAnimationPerformance(enabled) {
    if (enabled) {
      document.body.classList.remove("disable-animations");
    } else {
      document.body.classList.add("disable-animations");
    }
  }

  function pushSystemNotification(text) {
    const toast = document.createElement("div");
    toast.className = "system-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--bg-panel);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--border-glow);
      color: var(--text-primary);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: var(--shadow-lg), var(--shadow-glow);
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateX(-50%) translateY(0)";
      toast.style.opacity = "1";
    }, 50);

    setTimeout(() => {
      toast.style.transform = "translateX(-50%) translateY(100px)";
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  loadSimulatedChatSession(1, "Fix React Ref hook loop");
});
