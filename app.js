/* =============================================================================
   Zeno AI Assistant - Main Application Orchestrator
   Coordinates Storage, Providers, Chat Engine, Agent Mode, Modes, and API Client.
   ============================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // --- UI Elements ---
  const htmlElement = document.documentElement;

  // Login Overlay & Forms
  const loginOverlay = document.getElementById("login-overlay");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginErrorMsg = document.getElementById("login-error-msg");

  // Left Sidebar
  const newChatBtn = document.getElementById("new-chat-btn");
  const pinnedChatsList = document.getElementById("pinned-chats-list");
  const recentChatsList = document.getElementById("recent-chats-list");
  const agentModeToggle = document.getElementById("agent-mode-toggle");
  const agentModeDesc = document.getElementById("agent-mode-desc");
  const settingsBtn = document.getElementById("settings-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const sidebarLeft = document.querySelector(".sidebar-left");

  // Main Header
  const profileAvatarBtn = document.getElementById("profile-avatar-btn");
  const profileDropdown = document.getElementById("profile-dropdown");
  const headerBrandBtn = document.getElementById("header-brand-btn");
  const zenoVersionPopup = document.getElementById("zeno-version-popup");
  const mobileSidebarToggle = document.getElementById("sidebar-toggle-mobile");

  // Main Workspace
  const chatContainer = document.getElementById("chat-container");
  const emptyState = document.getElementById("empty-state");
  const messagesList = document.getElementById("messages-list");
  const typingIndicator = document.getElementById("typing-indicator");
  const quickCards = document.querySelectorAll(".action-card");

  // Mode Panels (inline inputs)
  const modePanel = document.getElementById("mode-panel");
  const modePanelName = document.getElementById("mode-panel-name");
  const modePanelIcon = document.getElementById("mode-panel-icon");
  const modePanelBody = document.getElementById("mode-panel-body");
  const modePanelClose = document.getElementById("mode-panel-close");

  // Input & Footer
  const promptInput = document.getElementById("prompt-input");
  const sendBtn = document.getElementById("send-btn");
  const attachBtn = document.getElementById("attach-btn");
  const micBtn = document.getElementById("mic-btn");
  const fileInput = document.getElementById("file-input");
  const fileAttachmentBadge = document.getElementById("file-attachment-badge");

  // Image Preview & Analysis Elements
  const imagePreviewBar = document.getElementById("image-preview-bar");
  const imagePreviewThumb = document.getElementById("image-preview-thumb");
  const imagePreviewRemove = document.getElementById("image-preview-remove");
  const imagePreviewFilename = document.getElementById("image-preview-filename");

  // Profile Image Settings Elements
  const settingsProfilePreview = document.getElementById("settings-profile-preview");
  const settingsUploadProfileBtn = document.getElementById("settings-upload-profile-btn");
  const settingsProfileFileInput = document.getElementById("settings-profile-file-input");
  const settingsResetProfileBtn = document.getElementById("settings-reset-profile-btn");

  // Image Lightbox Modal Elements
  const imageLightboxModal = document.getElementById("image-lightbox-modal");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxDownload = document.getElementById("lightbox-download");

  // Floating AI Agent Bottom-Left
  const floatingAgentContainer = document.getElementById("floating-agent-container");
  const floatingAgentBtn = document.getElementById("floating-agent-btn");
  const agentPopupCard = document.getElementById("agent-popup-card");
  const agentPopupClose = document.getElementById("agent-popup-close");
  const btnClipboard = document.getElementById("agent-btn-clipboard");
  const btnScreenshot = document.getElementById("agent-btn-screenshot");

  // Settings Modal & Tabs
  const settingsModal = document.getElementById("settings-modal");
  const settingsModalClose = document.getElementById("settings-modal-close");
  const themeSelect = document.getElementById("theme-select");
  const modelSelect = document.getElementById("model-select");
  const tempSlider = document.getElementById("temp-slider");
  const tempVal = document.getElementById("temp-val");
  const prefAnimations = document.getElementById("pref-animations");
  const settingsResetBtn = document.getElementById("settings-reset-btn");
  const settingsSaveBtn = document.getElementById("settings-save-btn");
  const dropdownSettingsTrigger = document.getElementById("dropdown-settings-trigger");
  
  const themeBarToggleBtn = document.getElementById("theme-bar-toggle-btn");
  const colorPickerContainer = document.getElementById("color-picker-container");
  const colorSwatches = document.querySelectorAll(".color-swatch");

  // Provider elements inside settings
  const providerSelect = document.getElementById("provider-select");
  const providerKeyInput = document.getElementById("provider-key-input");
  const providerStatusBadge = document.getElementById("provider-status-badge");
  const providerTestBtn = document.getElementById("provider-test-btn");

  // State Variables
  let activeChatId = null;
  let currentUser = null;
  let activeAccentTheme = "blue";
  let attachedImageBase64 = null;
  let activeMode = null;

  // Mode Banner Elements
  const modeBanner = document.getElementById("mode-banner");
  const modeBannerText = document.getElementById("mode-banner-text");
  const modeBannerClose = document.getElementById("mode-banner-close");

  const MODE_META = {
    explain: { icon: "🔍", label: "Explain Error Mode", apiMode: "explain_error" },
    optimize: { icon: "⚡", label: "Optimize Code Mode", apiMode: "optimize" },
    debug: { icon: "🐛", label: "Debug Mode", apiMode: "debug" }
  };

  function showModeBanner(mode) {
    const meta = MODE_META[mode];
    if (!meta || !modeBanner) return;
    activeMode = mode;
    modeBannerText.textContent = meta.label + " · ON";
    modeBanner.classList.add("show");
  }

  function hideModeBanner() {
    activeMode = null;
    if (modeBanner) modeBanner.classList.remove("show");
  }

  // Top banner Exit button
  if (modeBannerClose) {
    modeBannerClose.addEventListener("click", () => {
      hideModeBanner();
      modePanel.classList.remove("show");
      modePanel.classList.remove("enabled");
      if (window.ZenoModes) window.ZenoModes.currentMode = null;
    });
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================
  async function initApp() {
    // 1. Initialize Canvas Background
    if (window.ZenoBackground) {
      window.ZenoBackground.init();
    }

    // 2. Setup visual preferences and tabs before auth to ensure layout consistency
    loadVisualSettings();
    setupSettingsTabs();

    // 3. Perform JWT check with Backend
    const hasToken = localStorage.getItem("zeno_auth_token");
    if (hasToken) {
      currentUser = await window.ZenoAPI.checkAuth();
      if (currentUser) {
        // Auth success - finalize workspace loading
        const pName = document.querySelector(".dropdown-name");
        const pEmail = document.querySelector(".dropdown-email");
        if (pName) pName.textContent = currentUser.name;
        if (pEmail) pEmail.textContent = currentUser.email;
        renderChatHistory();
        bypassStartupSequence();
      } else {
        // Auth failed - redirect to login
        abortStartupSequence();
      }
    } else {
      // No token - show login immediately
      abortStartupSequence();
    }



    // 5. Initialize Quick Action Card Panels
    // Pass null for closeBtn — exit is handled directly below
    if (window.ZenoModes) {
      window.ZenoModes.init(quickCards, modePanel, null, modePanelName, modePanelIcon, modePanelBody);
    }
    // Banner is shown only when user submits from inside the panel (via triggerCustomModeSubmit)

    // Exit Mode button — single authoritative handler
    if (modePanelClose) {
      modePanelClose.addEventListener("click", () => {
        modePanel.classList.remove("show");
        modePanel.classList.remove("enabled");
        if (window.ZenoModes) window.ZenoModes.currentMode = null;
        hideModeBanner();
      });
    }

    // 6. Initialize AI Agent Mode elements
    if (window.ZenoAgentMode) {
      window.ZenoAgentMode.init(agentModeToggle, agentModeDesc, floatingAgentContainer, floatingAgentBtn, agentPopupCard);
    }
  }

  // ===========================================================================
  // AUTHENTICATION FLOW
  // ===========================================================================
  function showLoginView() {
    loginOverlay.classList.add("active");
  }

  function hideLoginView() {
    loginOverlay.classList.remove("active");
  }

  function bypassStartupSequence() {
    const introOverlay = document.getElementById("startup-intro-overlay");
    const appContainer = document.querySelector(".app-container");
    if (introOverlay) {
      introOverlay.style.transition = "opacity 300ms ease-out";
      introOverlay.style.opacity = "0";
      setTimeout(() => {
        introOverlay.style.display = "none";
        document.body.classList.remove("startup-active");
      }, 300);
    } else {
      document.body.classList.remove("startup-active");
    }
    if (appContainer) {
      appContainer.style.opacity = "1";
      appContainer.style.clipPath = "none";
      appContainer.style.transition = "none";
    }
    hideLoginView();
  }

  function abortStartupSequence() {
    const introOverlay = document.getElementById("startup-intro-overlay");
    if (introOverlay) {
      introOverlay.style.display = "none";
      introOverlay.style.opacity = "0";
    }
    document.body.classList.remove("startup-active");
    showLoginView();
  }

  function onAuthSuccess(user) {
    currentUser = user;
    
    // Update profile names
    const pName = document.querySelector(".dropdown-name");
    const pEmail = document.querySelector(".dropdown-email");
    if (pName) pName.textContent = user.name;
    if (pEmail) pEmail.textContent = user.email;

    // Load Chat History list
    renderChatHistory();

    // Trigger cinematic startup sequence
    runStartupSequence();
  }

  function runStartupSequence() {
    // 1. Add startup-active class to body
    document.body.classList.add("startup-active");
    
    const introOverlay = document.getElementById("startup-intro-overlay");
    const introLogo = document.querySelector(".startup-logo");
    const introText = document.querySelector(".startup-text-wrapper");
    
    // Ensure initial state
    introOverlay.style.display = "flex";
    introOverlay.style.opacity = "0";
    introOverlay.style.background = "#000000";
    introLogo.style.opacity = "0";
    introLogo.style.transform = "scale(0.6)";
    introLogo.classList.remove("animate-reveal", "pulse", "revealed");
    introText.style.opacity = "0";
    introText.classList.remove("animate-fade-in");

    // Fade into completely black screen
    introOverlay.style.transition = "opacity 400ms ease-in-out";
    // Trigger layout reflow
    introOverlay.offsetHeight;
    introOverlay.style.opacity = "1";

    // Wait for fade to complete (400ms)
    setTimeout(() => {
      // Hide the login view now that screen is fully black
      hideLoginView();
      
      // Keep black for remaining 600ms (making it 1 second total of black screen)
      setTimeout(() => {
        // --- STEP 2: Logo Reveal (800ms) ---
        introLogo.classList.add("animate-reveal");
        
        setTimeout(() => {
          // Subtle pulse after logo settles
          introLogo.classList.add("pulse");
          introLogo.classList.add("revealed");
          
          setTimeout(() => {
            // --- STEP 3: Welcome Text (700ms) ---
            introText.classList.add("animate-fade-in");
            
            setTimeout(() => {
              // --- STEP 4: Slow Interface Reveal (1200ms) ---
              // Fade out the startup overlay content slowly to reveal the homepage underneath
              introOverlay.style.transition = "opacity 1200ms ease-in-out";
              introOverlay.style.opacity = "0";
              
              setTimeout(() => {
                // --- STEP 5: Homepage Ready & Cascading Fade-In ---
                introOverlay.style.display = "none";
                
                // Add cascade-active class to body
                document.body.classList.add("cascade-active");
                
                const elements = [
                  { class: "cascade-1" },
                  { class: "cascade-2" },
                  { class: "cascade-3" },
                  { class: "cascade-4" },
                  { class: "cascade-5" }
                ];
                
                elements.forEach((item, index) => {
                  setTimeout(() => {
                    document.body.classList.add(item.class);
                  }, index * 100);
                });
                
                // After cascade completes, clean up all startup classes
                setTimeout(() => {
                  document.body.classList.remove("startup-active");
                  document.body.classList.remove("cascade-active");
                  elements.forEach(item => document.body.classList.remove(item.class));
                  
                  // Enable logo idle animation on welcome screen logo
                  const welcomeLogo = document.querySelector(".welcome-logo-svg");
                  if (welcomeLogo) {
                    welcomeLogo.classList.add("logo-breath-active");
                  }
                  
                  // Also show system notification after homepage is ready
                  pushSystemNotification(`Welcome back, ${currentUser ? currentUser.name : 'Developer'}`);
                }, elements.length * 100 + 800);
                
              }, 1200); // end step 4
              
            }, 700); // end step 3
            
          }, 800); // end step 2 pulse
          
        }, 800); // end step 2 reveal
        
      }, 600); // end step 1 remaining time
      
    }, 400); // end transition fade-to-black
  }

  // ===========================================================================
  // SIGN IN / SIGN UP MAIN SWITCHER & PASSWORD VISIBILITY CONTROLLER
  // ===========================================================================
  const mainAuthBarBtns = document.querySelectorAll(".auth-main-bar-btn");
  const mainAuthViews = document.querySelectorAll(".main-auth-view");
  const loginWelcomeTitle = document.querySelector(".login-welcome");
  const loginTagline = document.querySelector(".login-tagline");

  function switchToAuthView(viewId) {
    mainAuthBarBtns.forEach(btn => {
      if (btn.dataset.view === viewId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    mainAuthViews.forEach(view => {
      if (view.id === viewId) {
        view.classList.add("active");
        view.style.display = "block";
      } else {
        view.classList.remove("active");
        view.style.display = "none";
      }
    });

    // Update left hero text contextually
    if (viewId === "main-view-signup") {
      if (loginWelcomeTitle) loginWelcomeTitle.textContent = "Join Zeno AI";
      if (loginTagline) loginTagline.textContent = "Create your account to experience next-gen AI";
    } else if (viewId === "main-view-otp") {
      if (loginWelcomeTitle) loginWelcomeTitle.textContent = "Email Verification";
      if (loginTagline) loginTagline.textContent = "Sign in securely via 4-digit Gmail OTP";
    } else {
      if (loginWelcomeTitle) loginWelcomeTitle.textContent = "Welcome back!";
      if (loginTagline) loginTagline.textContent = "Sign in to continue to Zeno AI Assistant";
    }
  }

  mainAuthBarBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchToAuthView(btn.dataset.view);
    });
  });

  // Footer Cross-Links
  const linkGotoSignup = document.getElementById("link-goto-signup");
  const linkOtpGotoSignup = document.getElementById("link-otp-goto-signup");
  const linkGotoSignin = document.getElementById("link-goto-signin");
  const loginSwitchToOtp = document.getElementById("login-switch-to-otp");

  if (linkGotoSignup) {
    linkGotoSignup.addEventListener("click", (e) => {
      e.preventDefault();
      switchToAuthView("main-view-signup");
    });
  }

  if (linkOtpGotoSignup) {
    linkOtpGotoSignup.addEventListener("click", (e) => {
      e.preventDefault();
      switchToAuthView("main-view-signup");
    });
  }

  if (linkGotoSignin) {
    linkGotoSignin.addEventListener("click", (e) => {
      e.preventDefault();
      switchToAuthView("main-view-signin");
    });
  }

  if (loginSwitchToOtp) {
    loginSwitchToOtp.addEventListener("click", (e) => {
      e.preventDefault();
      switchToAuthView("main-view-otp");
    });
  }

  // Password Visibility Eye Toggle Handler
  document.querySelectorAll(".toggle-password-visibility").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetInputId = btn.dataset.input;
      const targetInput = document.getElementById(targetInputId);
      if (!targetInput) return;

      const eyeOpen = btn.querySelector(".eye-open");
      const eyeClosed = btn.querySelector(".eye-closed");

      if (targetInput.type === "password") {
        targetInput.type = "text";
        if (eyeOpen) eyeOpen.style.display = "none";
        if (eyeClosed) eyeClosed.style.display = "inline";
      } else {
        targetInput.type = "password";
        if (eyeOpen) eyeOpen.style.display = "inline";
        if (eyeClosed) eyeClosed.style.display = "none";
      }
    });
  });

  // Login form submit
  const loginSubmitBtn = document.getElementById("login-submit-btn");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginErrorMsg) loginErrorMsg.style.display = "none";
      const u = loginEmail.value.trim();
      const p = loginPassword.value;

      setBtnLoading(loginSubmitBtn, true);

      try {
        const user = await window.ZenoAPI.login(u, p);
        onAuthSuccess(user);
      } catch (err) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = err.message || "Login failed";
          loginErrorMsg.style.display = "block";
        }
      } finally {
        setBtnLoading(loginSubmitBtn, false);
      }
    });
  }

  // ===========================================================================
  // SIGN UP / USER CREATION CONTROLLER
  // ===========================================================================
  const signupForm = document.getElementById("signup-form");
  const signupName = document.getElementById("signup-name");
  const signupEmail = document.getElementById("signup-email");
  const signupUsername = document.getElementById("signup-username");
  const signupPassword = document.getElementById("signup-password");
  const signupConfirmPassword = document.getElementById("signup-confirm-password");
  const signupMatchHint = document.getElementById("signup-password-match-hint");
  const signupErrorMsg = document.getElementById("signup-error-msg");
  const signupSubmitBtn = document.getElementById("signup-submit-btn");

  // Real-time password match validator
  function checkPasswordMatch() {
    if (!signupMatchHint || !signupPassword || !signupConfirmPassword) return;
    const p1 = signupPassword.value;
    const p2 = signupConfirmPassword.value;

    if (!p2) {
      signupMatchHint.style.display = "none";
      return;
    }

    signupMatchHint.style.display = "flex";
    if (p1 === p2) {
      signupMatchHint.className = "password-match-hint match-success";
      signupMatchHint.textContent = "✅ Passwords match";
    } else {
      signupMatchHint.className = "password-match-hint match-error";
      signupMatchHint.textContent = "❌ Passwords do not match";
    }
  }

  if (signupPassword && signupConfirmPassword) {
    signupPassword.addEventListener("input", checkPasswordMatch);
    signupConfirmPassword.addEventListener("input", checkPasswordMatch);
  }

  // Auto-fill username suggestion from email
  if (signupEmail && signupUsername) {
    signupEmail.addEventListener("blur", () => {
      if (!signupUsername.value.trim() && signupEmail.value.includes("@")) {
        signupUsername.value = signupEmail.value.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (signupErrorMsg) signupErrorMsg.style.display = "none";

      const name = signupName.value.trim();
      const email = signupEmail.value.trim();
      const username = signupUsername.value.trim();
      const password = signupPassword.value;
      const confirmPassword = signupConfirmPassword.value;

      if (!name || !email || !password) {
        if (signupErrorMsg) {
          signupErrorMsg.textContent = "Please fill in all required fields.";
          signupErrorMsg.style.display = "block";
        }
        return;
      }

      if (password.length < 6) {
        if (signupErrorMsg) {
          signupErrorMsg.textContent = "Password must be at least 6 characters long.";
          signupErrorMsg.style.display = "block";
        }
        return;
      }

      if (password !== confirmPassword) {
        if (signupErrorMsg) {
          signupErrorMsg.textContent = "Passwords do not match. Please verify.";
          signupErrorMsg.style.display = "block";
        }
        return;
      }

      setBtnLoading(signupSubmitBtn, true);

      try {
        const user = await window.ZenoAPI.register({
          name,
          email,
          username,
          password,
          confirmPassword
        });

        onAuthSuccess(user);
      } catch (err) {
        if (signupErrorMsg) {
          signupErrorMsg.textContent = err.message || "Failed to create account. Please try again.";
          signupErrorMsg.style.display = "block";
        }
      } finally {
        setBtnLoading(signupSubmitBtn, false);
      }
    });
  }

  // ===========================================================================
  // EMAIL OTP AUTHENTICATION & VERIFICATION CONTROLLER
  // ===========================================================================
  let otpTimerInterval = null;
  let otpExpiresAt = 0;
  let activeOtpEmail = "";



  // 2. OTP UI Component References
  const otpRequestForm = document.getElementById("otp-request-form");
  const otpEmailInput = document.getElementById("otp-email-input");
  const otpSendBtn = document.getElementById("otp-send-btn");
  const otpRequestErrorMsg = document.getElementById("otp-request-error-msg");

  const otpStepRequest = document.getElementById("otp-step-request");
  const otpStepVerify = document.getElementById("otp-step-verify");
  const otpTargetEmailDisplay = document.getElementById("otp-target-email-display");
  const otpChangeEmailBtn = document.getElementById("otp-change-email-btn");

  const otpDigitInputs = [
    document.getElementById("otp-digit-1"),
    document.getElementById("otp-digit-2"),
    document.getElementById("otp-digit-3"),
    document.getElementById("otp-digit-4")
  ];

  const otpTimerBadge = document.getElementById("otp-timer-badge");
  const otpCountdownText = document.getElementById("otp-countdown-text");
  const otpResendBtn = document.getElementById("otp-resend-btn");
  const otpVerifyStatusMsg = document.getElementById("otp-verify-status-msg");
  const otpVerifyBtn = document.getElementById("otp-verify-btn");

  // Helper: Show/Hide button spinner
  function setBtnLoading(btn, isLoading) {
    if (!btn) return;
    const btnText = btn.querySelector(".btn-text");
    const btnSpinner = btn.querySelector(".btn-spinner");
    btn.disabled = isLoading;
    if (isLoading) {
      if (btnText) btnText.style.display = "none";
      if (btnSpinner) btnSpinner.style.display = "inline-flex";
    } else {
      if (btnText) btnText.style.display = "inline";
      if (btnSpinner) btnSpinner.style.display = "none";
    }
  }

  // Helper: Display Status Banner
  function showOtpStatus(msg, type = "error") {
    if (!otpVerifyStatusMsg) return;
    otpVerifyStatusMsg.className = `otp-status-msg ${type}`;
    otpVerifyStatusMsg.textContent = msg;
    otpVerifyStatusMsg.style.display = "block";
  }

  function hideOtpStatus() {
    if (otpVerifyStatusMsg) otpVerifyStatusMsg.style.display = "none";
  }

  // 3. Countdown Timer Engine (05:00 -> 00:00)
  function startOtpCountdown(expiresAtTimestamp) {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    otpExpiresAt = expiresAtTimestamp;

    if (otpTimerBadge) otpTimerBadge.classList.remove("expired");
    if (otpResendBtn) otpResendBtn.disabled = true;

    function updateTick() {
      const remainingMs = otpExpiresAt - Date.now();
      if (remainingMs <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
        if (otpCountdownText) otpCountdownText.textContent = "00:00";
        if (otpTimerBadge) otpTimerBadge.classList.add("expired");
        if (otpResendBtn) otpResendBtn.disabled = false;
        showOtpStatus("OTP Expired. Please click Resend OTP to get a new code.", "error");
        return;
      }

      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      if (otpCountdownText) otpCountdownText.textContent = formatted;
    }

    updateTick();
    otpTimerInterval = setInterval(updateTick, 1000);
  }

  // 4. Send OTP Request
  async function triggerSendOTP(emailVal) {
    if (!emailVal) return;
    if (otpRequestErrorMsg) otpRequestErrorMsg.style.display = "none";
    hideOtpStatus();

    // Reset success screen view
    const formWrap = document.getElementById("otp-verify-form-wrap");
    const successScreen = document.getElementById("otp-success-screen");
    if (formWrap) formWrap.style.display = "block";
    if (successScreen) successScreen.style.display = "none";

    setBtnLoading(otpSendBtn, true);

    try {
      const res = await window.ZenoAPI.sendOTP(emailVal);
      activeOtpEmail = emailVal;

      if (otpTargetEmailDisplay) otpTargetEmailDisplay.textContent = emailVal;

      // Reset digit input boxes
      otpDigitInputs.forEach(input => {
        if (input) {
          input.value = "";
          input.classList.remove("filled", "shake", "typing-scale");
        }
      });

      // Switch to Step 2 Verification view
      if (otpStepRequest) otpStepRequest.style.display = "none";
      if (otpStepVerify) otpStepVerify.style.display = "block";

      // Start 5:00 countdown timer (300,000 ms)
      startOtpCountdown(res.expiresAt || (Date.now() + 300000));

      // Focus first digit box
      setTimeout(() => {
        if (otpDigitInputs[0]) otpDigitInputs[0].focus();
      }, 100);

      // Handle Live Test Inbox Preview link
      const previewWrap = document.getElementById("otp-inbox-preview-wrap");
      const previewBtn = document.getElementById("otp-inbox-preview-btn");
      if (res.previewUrl && previewWrap && previewBtn) {
        previewBtn.href = res.previewUrl;
        previewWrap.style.display = "block";
      } else if (previewWrap) {
        previewWrap.style.display = "none";
      }

      // DEV MODE: auto-fill OTP digits if backend returned devOtp
      if (res.devOtp && otpDigitInputs.length >= 4) {
        const digits = String(res.devOtp).split('');
        digits.forEach((d, i) => { if (otpDigitInputs[i]) otpDigitInputs[i].value = d; });
        showOtpStatus(`✅ Dev mode — no email configured. Code auto-filled below. Check backend terminal too.`, "success");
      } else {
        showOtpStatus(`Verification code sent to ${emailVal}. Valid for 5 minutes.`, "success");
        setTimeout(() => hideOtpStatus(), 5000);
      }

    } catch (err) {
      if (otpRequestErrorMsg) {
        otpRequestErrorMsg.textContent = err.message || "Failed to send OTP";
        otpRequestErrorMsg.style.display = "block";
      }
    } finally {
      setBtnLoading(otpSendBtn, false);
    }
  }

  if (otpRequestForm) {
    otpRequestForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailVal = otpEmailInput.value.trim();
      triggerSendOTP(emailVal);
    });
  }

  // Change Email Link Handler
  if (otpChangeEmailBtn) {
    otpChangeEmailBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (otpTimerInterval) clearInterval(otpTimerInterval);
      hideOtpStatus();
      if (otpStepVerify) otpStepVerify.style.display = "none";
      if (otpStepRequest) otpStepRequest.style.display = "block";
      if (otpEmailInput) otpEmailInput.focus();
    });
  }

  // Resend OTP Button Handler
  if (otpResendBtn) {
    otpResendBtn.addEventListener("click", async () => {
      if (!activeOtpEmail || otpResendBtn.disabled) return;
      otpResendBtn.disabled = true;
      try {
        const res = await window.ZenoAPI.sendOTP(activeOtpEmail);
        startOtpCountdown(res.expiresAt || (Date.now() + 300000));
        otpDigitInputs.forEach(i => { if (i) { i.value = ""; i.classList.remove("filled", "typing-scale"); } });
        if (otpDigitInputs[0]) otpDigitInputs[0].focus();

        const previewWrap = document.getElementById("otp-inbox-preview-wrap");
        const previewBtn = document.getElementById("otp-inbox-preview-btn");
        if (res.previewUrl && previewWrap && previewBtn) {
          previewBtn.href = res.previewUrl;
          previewWrap.style.display = "block";
        }

        showOtpStatus(`New verification code sent to ${activeOtpEmail}`, "success");
      } catch (err) {
        showOtpStatus(err.message || "Failed to resend OTP", "error");
        otpResendBtn.disabled = false;
      }
    });
  }

  // 5. 4-Digit Input Navigation (Auto-advance, Backspace, Paste)
  otpDigitInputs.forEach((input, index) => {
    if (!input) return;

    // Handle Input & Auto-Advance
    input.addEventListener("input", () => {
      const val = input.value.replace(/[^0-9]/g, "");
      input.value = val;

      if (val) {
        input.classList.add("filled", "typing-scale");
        setTimeout(() => input.classList.remove("typing-scale"), 200);

        if (index < 3 && otpDigitInputs[index + 1]) {
          otpDigitInputs[index + 1].focus();
        }
      } else {
        input.classList.remove("filled", "typing-scale");
      }

      // Auto verify if all 4 digits are entered
      const fullCode = otpDigitInputs.map(i => (i ? i.value : "")).join("");
      if (fullCode.length === 4) {
        triggerVerifyOTP();
      }
    });

    // Handle Backspace Key Navigation
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (!input.value && index > 0 && otpDigitInputs[index - 1]) {
          otpDigitInputs[index - 1].focus();
          otpDigitInputs[index - 1].value = "";
          otpDigitInputs[index - 1].classList.remove("filled", "typing-scale");
        }
      }
    });

    // Handle Clipboard Paste (Distributes 4 digits)
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData("text");
      const digits = pasteData.replace(/[^0-9]/g, "").slice(0, 4);

      if (digits) {
        digits.split("").forEach((char, idx) => {
          if (otpDigitInputs[idx]) {
            otpDigitInputs[idx].value = char;
            otpDigitInputs[idx].classList.add("filled");
          }
        });

        const lastIdx = Math.min(digits.length - 1, 3);
        if (otpDigitInputs[lastIdx]) otpDigitInputs[lastIdx].focus();

        if (digits.length === 4) {
          triggerVerifyOTP();
        }
      }
    });
  });

  // 6. Verify OTP Handler
  async function triggerVerifyOTP() {
    const otpCode = otpDigitInputs.map(i => (i ? i.value : "")).join("");

    if (otpCode.length < 4) {
      showOtpStatus("Please enter all 4 digits of the verification code", "warning");
      return;
    }

    if (Date.now() > otpExpiresAt) {
      showOtpStatus("OTP Expired. Please click Resend OTP.", "error");
      otpDigitInputs.forEach(i => { if (i) i.classList.add("shake"); });
      setTimeout(() => otpDigitInputs.forEach(i => { if (i) i.classList.remove("shake"); }), 500);
      return;
    }

    hideOtpStatus();
    setBtnLoading(otpVerifyBtn, true);

    try {
      const res = await window.ZenoAPI.verifyOTP(activeOtpEmail, otpCode);
      if (otpTimerInterval) clearInterval(otpTimerInterval);

      // Show animated green checkmark screen
      const formWrap = document.getElementById("otp-verify-form-wrap");
      const successScreen = document.getElementById("otp-success-screen");
      if (formWrap) formWrap.style.display = "none";
      if (successScreen) successScreen.style.display = "flex";

      setTimeout(() => {
        onAuthSuccess(res.user);
      }, 1200);

    } catch (err) {
      showOtpStatus(err.message || "Invalid OTP code. Please try again.", "error");
      otpDigitInputs.forEach(i => { if (i) i.classList.add("shake"); });
      setTimeout(() => otpDigitInputs.forEach(i => { if (i) i.classList.remove("shake"); }), 500);
    } finally {
      setBtnLoading(otpVerifyBtn, false);
    }
  }

  if (otpVerifyBtn) {
    otpVerifyBtn.addEventListener("click", triggerVerifyOTP);
  }

  // Logout button triggers
  const triggerLogout = async (e) => {
    if (e) e.preventDefault();
    await window.ZenoAPI.logout();
    currentUser = null;
    activeChatId = null;
    resetChatWorkspace();
    showLoginView();
    pushSystemNotification("Signed out of workspace.");
  };

  if (logoutBtn) logoutBtn.addEventListener("click", triggerLogout);
  const signOutLink = document.querySelector(".profile-dropdown .logout");
  if (signOutLink) signOutLink.addEventListener("click", triggerLogout);

  // ===========================================================================
  // SETTINGS MODAL & TABS MANAGEMENT
  // ===========================================================================
  function setupSettingsTabs() {
    const tabBtns = document.querySelectorAll(".settings-tab-btn");
    const tabPanels = document.querySelectorAll(".settings-tab-panel");

    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabPanels.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const target = btn.dataset.target;
        const panel = document.getElementById(target);
        if (panel) panel.classList.add("active");
      });
    });

    // Populate active Provider details when opening provider tab
    if (providerSelect) {
      providerSelect.value = window.ZenoProviders.getActiveProvider();
      providerKeyInput.value = window.ZenoProviders.getAPIKey(providerSelect.value);

      providerSelect.addEventListener("change", () => {
        const val = providerSelect.value;
        providerKeyInput.value = window.ZenoProviders.getAPIKey(val);
        providerStatusBadge.textContent = "Unknown";
        providerStatusBadge.className = "provider-status-badge unknown";
      });

      // Save custom key on typing
      providerKeyInput.addEventListener("input", () => {
        window.ZenoProviders.setAPIKey(providerSelect.value, providerKeyInput.value.trim());
      });
    }

    // Test Provider connection button
    if (providerTestBtn) {
      providerTestBtn.addEventListener("click", async () => {
        const prov = providerSelect.value;
        const key = providerKeyInput.value.trim();

        providerStatusBadge.textContent = "Testing...";
        providerStatusBadge.className = "provider-status-badge unknown";

        try {
          const res = await window.ZenoAPI.testProviderConnection(prov, key);
          providerStatusBadge.textContent = "Connected";
          providerStatusBadge.className = "provider-status-badge success";
          pushSystemNotification(`Successfully verified connection to ${prov}`);
        } catch (err) {
          providerStatusBadge.textContent = "Failed";
          providerStatusBadge.className = "provider-status-badge failed";
          pushSystemNotification(`Verification failed: ${err.message}`);
        }
      });
    }
  }

  // Visual options toggling
  if (themeBarToggleBtn && colorPickerContainer) {
    themeBarToggleBtn.addEventListener("click", () => {
      colorPickerContainer.classList.toggle("collapsed");
    });
  }

  colorSwatches.forEach(swatch => {
    swatch.addEventListener("click", () => {
      colorSwatches.forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      const color = swatch.dataset.color;
      activeAccentTheme = color;
      htmlElement.setAttribute("data-accent-theme", color);
    });
  });

  // Open settings
  if (settingsBtn) settingsBtn.addEventListener("click", () => settingsModal.classList.add("show"));
  if (dropdownSettingsTrigger) {
    dropdownSettingsTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      profileDropdown.classList.remove("show");
      settingsModal.classList.add("show");
    });
  }
  if (settingsModalClose) settingsModalClose.addEventListener("click", () => settingsModal.classList.remove("show"));

  settingsSaveBtn.addEventListener("click", () => {
    // Save provider selection AND api key
    if (providerSelect) {
      window.ZenoProviders.setActiveProvider(providerSelect.value);
    }
    if (providerKeyInput && providerSelect) {
      window.ZenoProviders.setAPIKey(providerSelect.value, providerKeyInput.value.trim());
    }
    
    // Save visual configuration
    localStorage.setItem("zeno-theme", themeSelect.value);
    localStorage.setItem("zeno-accent-theme", activeAccentTheme);
    localStorage.setItem("zeno-model", modelSelect.value);
    localStorage.setItem("zeno-temp", tempSlider.value);
    localStorage.setItem("zeno-animations", prefAnimations.checked ? "true" : "false");

    htmlElement.setAttribute("data-theme", themeSelect.value);
    htmlElement.setAttribute("data-accent-theme", activeAccentTheme);

    settingsModal.classList.remove("show");
    pushSystemNotification("Configuration saved.");
  });

  settingsResetBtn.addEventListener("click", () => {
    themeSelect.value = "dark";
    modelSelect.value = "zeno-3.5-pro";
    tempSlider.value = "0.2";
    tempVal.textContent = "0.2";
    prefAnimations.checked = true;
    activeAccentTheme = "blue";
    htmlElement.setAttribute("data-theme", "dark");
    htmlElement.setAttribute("data-accent-theme", "blue");
    colorSwatches.forEach(s => {
      s.classList.remove("active");
      if (s.dataset.color === "blue") s.classList.add("active");
    });
    pushSystemNotification("Restored default parameters.");
  });

  tempSlider.addEventListener("input", () => {
    tempVal.textContent = tempSlider.value;
  });

  function loadVisualSettings() {
    const theme = localStorage.getItem("zeno-theme") || "dark";
    const accent = localStorage.getItem("zeno-accent-theme") || "blue";
    const model = localStorage.getItem("zeno-model") || "zeno-3.5-pro";
    const temp = localStorage.getItem("zeno-temp") || "0.2";
    const anim = localStorage.getItem("zeno-animations") !== "false";

    htmlElement.setAttribute("data-theme", theme);
    htmlElement.setAttribute("data-accent-theme", accent);
    activeAccentTheme = accent;

    if (themeSelect) themeSelect.value = theme;
    if (modelSelect) modelSelect.value = model;
    if (tempSlider) {
      tempSlider.value = temp;
      tempVal.textContent = temp;
    }
    if (prefAnimations) prefAnimations.checked = anim;

    colorSwatches.forEach(s => {
      s.classList.remove("active");
      if (s.dataset.color === accent) s.classList.add("active");
    });
  }

  // ===========================================================================
  // CHAT HISTORY MANAGEMENT
  // ===========================================================================
  function renderChatHistory() {
    if (!window.ZenoStorage) return;
    const chats = window.ZenoStorage.getChats();

    pinnedChatsList.innerHTML = "";
    recentChatsList.innerHTML = "";

    chats.forEach(chat => {
      const li = document.createElement("li");
      li.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
      li.dataset.chatId = chat.id;

      const chatIcon = chat.pinned
        ? `<svg class="item-icon pinned" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`
        : `<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

      li.innerHTML = `
        ${chatIcon}
        <span class="item-text" title="Double click to rename">${chat.title}</span>
        <div class="item-actions">
          <button class="action-btn pin-chat-btn" title="${chat.pinned ? 'Unpin Chat' : 'Pin Chat'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 22 12 17 22 22 12 2"></polygon></svg>
          </button>
          <button class="action-btn delete-chat-btn" title="Delete Chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // Single Click -> Load Conversation
      li.addEventListener("click", (e) => {
        if (e.target.closest(".action-btn")) return;
        loadChatSession(chat.id);
      });

      // Double Click -> Rename Conversation
      const textSpan = li.querySelector(".item-text");
      textSpan.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const currentTitle = textSpan.textContent;
        const input = document.createElement("input");
        input.type = "text";
        input.value = currentTitle;
        input.className = "chat-rename-input";
        textSpan.replaceWith(input);
        input.focus();

        const saveRename = () => {
          const newTitle = input.value.trim() || currentTitle;
          window.ZenoStorage.renameChat(chat.id, newTitle);
          renderChatHistory();
        };

        input.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") saveRename();
          if (evt.key === "Escape") renderChatHistory();
        });
        input.addEventListener("blur", saveRename);
      });

      // Pin/Unpin Action
      const pinBtn = li.querySelector(".pin-chat-btn");
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (chat.pinned) {
          window.ZenoStorage.unpinChat(chat.id);
        } else {
          window.ZenoStorage.pinChat(chat.id);
        }
        renderChatHistory();
      });

      // Delete Action
      const deleteBtn = li.querySelector(".delete-chat-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.ZenoStorage.deleteChat(chat.id);
        if (activeChatId === chat.id) {
          resetChatWorkspace();
        }
        renderChatHistory();
      });

      if (chat.pinned) {
        pinnedChatsList.appendChild(li);
      } else {
        recentChatsList.appendChild(li);
      }
    });

    // Auto-select first chat is disabled so that page starts on the home page
  }

  function loadChatSession(id) {
    activeChatId = id;
    const chat = window.ZenoStorage.getChat(id);
    if (!chat) return;

    // Highlight selected item in sidebar list
    document.querySelectorAll(".chat-history-list .chat-item").forEach(item => {
      item.classList.remove("active");
      if (Number(item.dataset.chatId) === id) item.classList.add("active");
    });

    // Hide home page welcome screen completely (new screen)
    emptyState.classList.remove("has-messages");
    emptyState.style.display = "none";
    messagesList.innerHTML = "";

    // Render conversation messages feed using Chat Engine
    chat.messages.forEach(msg => {
      const bubble = window.ZenoChatEngine.renderMessage(msg, handleRegenerateRequest);
      messagesList.appendChild(bubble);
    });

    window.ZenoChatEngine.scrollToBottom(chatContainer);
  }

  function resetChatWorkspace() {
    activeChatId = null;
    emptyState.classList.remove("has-messages");
    emptyState.style.display = "flex";
    messagesList.innerHTML = "";
    promptInput.value = "";
    promptInput.style.height = "auto";
    sendBtn.setAttribute("disabled", "true");
    document.querySelectorAll(".chat-history-list .chat-item").forEach(item => item.classList.remove("active"));
    // Also deactivate any active mode and hide banner
    hideModeBanner();
    if (window.ZenoModes) window.ZenoModes.closeModePanel(modePanel);
  }

  // New Chat button → go back to home screen
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      resetChatWorkspace();
    });
  }

  // ===========================================================================
  // AI ASSISTANT CHAT ENGAGEMENTS
  // ===========================================================================
  async function handleSendRequest() {
    const text = promptInput.value.trim();
    if (!text && !attachedImageBase64) return;

    promptInput.value = "";
    promptInput.style.height = "auto";
    sendBtn.setAttribute("disabled", "true");

    // Close any open action card input panels
    if (window.ZenoModes) window.ZenoModes.closeModePanel(modePanel);

    const isNewChatFromHome = (activeChatId === null);

    // If activeChatId is null, automatically create one
    if (activeChatId === null) {
      let chatTitle = text ? text.slice(0, 30) : 'Image Analysis';
      const newChat = window.ZenoStorage.createChat(chatTitle);
      activeChatId = newChat.id;
      renderChatHistory();
    }

    const chat = window.ZenoStorage.getChat(activeChatId);
    if (!chat) return;

    if (isNewChatFromHome) {
      emptyState.classList.add("has-messages");
      emptyState.style.display = "flex"; // Ensure it stays visible
    }

    // Determine query text
    const queryText = text || (attachedImageBase64 ? "Please analyze this image in detail and describe what you see, including any text, code, diagrams, or errors." : "");

    // Capture image before clearing
    const imageToSend = attachedImageBase64;

    // Append User message to storage and feed
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: queryText,
      image: imageToSend || null
    };

    chat.messages.push(userMsg);
    window.ZenoStorage.saveMessages(activeChatId, chat.messages);

    const userBubble = window.ZenoChatEngine.renderMessage(userMsg);
    messagesList.appendChild(userBubble);
    window.ZenoChatEngine.scrollToBottom(chatContainer);

    clearAttachedImage();

    // Determine mode to call
    const currentModeType = activeMode ? (MODE_META[activeMode]?.apiMode || 'chat') : 'chat';

    // Call API Backend
    await callBackendAI(chat, queryText, imageToSend, currentModeType);
  }

  async function callBackendAI(chatObj, textPrompt, imageBase64Data = null, modeType = "chat") {
    // Append loading pill directly below user message in messages list
    if (typingIndicator && messagesList) {
      messagesList.appendChild(typingIndicator);
      typingIndicator.style.display = "flex";
      if (window.ZenoPuzzleLoader) {
        window.ZenoPuzzleLoader.start(
          document.getElementById("puzzle-loader-canvas"),
          document.getElementById("puzzle-dots-el")
        );
      }
      window.ZenoChatEngine.scrollToBottom(chatContainer);
    }

    try {
      const activeProvider = window.ZenoProviders.getActiveProvider();
      const userKey = window.ZenoProviders.getAPIKey(activeProvider);

      // Pass prior messages excluding the current newly pushed message
      const priorHistory = chatObj.messages.slice(0, -1).slice(-10);

      const res = await window.ZenoAPI.chat({
        message: textPrompt,
        mode: modeType,
        provider: activeProvider,
        apiKey: userKey,
        chatHistory: priorHistory,
        imageBase64: imageBase64Data
      });

      // Stop puzzle loader animation and hide pill
      if (window.ZenoPuzzleLoader) window.ZenoPuzzleLoader.stop();
      if (typingIndicator) typingIndicator.style.display = "none";

      // Save AI Response to database list
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: res.response
      };

      chatObj.messages.push(aiMsg);
      window.ZenoStorage.saveMessages(activeChatId, chatObj.messages);

      // Render to workspace conversation feed
      const aiBubble = window.ZenoChatEngine.renderMessage(aiMsg, handleRegenerateRequest);
      messagesList.appendChild(aiBubble);
      window.ZenoChatEngine.scrollToBottom(chatContainer);

    } catch (err) {
      if (window.ZenoPuzzleLoader) window.ZenoPuzzleLoader.stop();
      if (typingIndicator) typingIndicator.style.display = "none";
      pushSystemNotification(`AI Error: ${err.message}`);
    }
  }

  // Regenerate Response trigger handler
  async function handleRegenerateRequest(msgId) {
    if (!activeChatId) return;
    const chat = window.ZenoStorage.getChat(activeChatId);
    if (!chat) return;

    // Find the message index
    const index = chat.messages.findIndex(m => m.id === msgId);
    if (index === -1) return;

    // Find the preceding user message to reuse prompt
    const userMsg = chat.messages.slice(0, index).reverse().find(m => m.role === "user");
    if (!userMsg) return;

    // Splice history to discard responses from target index onwards
    chat.messages = chat.messages.slice(0, index);
    window.ZenoStorage.saveMessages(activeChatId, chat.messages);

    // Refresh UI display list
    loadChatSession(activeChatId);

    // Resend
    await callBackendAI(chat, userMsg.content, userMsg.image ? userMsg.image.split(",")[1] : null);
  }

  // Quick Action Card panel submit hooks
  window.ZenoApp = {
    triggerCustomModeSubmit(mode, promptText, imageBase64 = null) {
      if (window.ZenoModes) window.ZenoModes.closeModePanel(modePanel);

      // Show mode banner at the top
      showModeBanner(mode);

      // Switch to chat view (hide welcome, show messages)
      emptyState.style.display = "none";

      // Create new chat for action card output if needed
      if (activeChatId === null) {
        const modeTitles = { explain: "Explain Error Analysis", optimize: "Code Optimization", debug: "Debug Session" };
        const newChat = window.ZenoStorage.createChat(modeTitles[mode] || "Quick Mode Analysis");
        activeChatId = newChat.id;
        renderChatHistory();
      }

      const chat = window.ZenoStorage.getChat(activeChatId);
      if (!chat) return;

      const userMsg = {
        id: Date.now(),
        role: "user",
        content: promptText,
        image: imageBase64 ? `data:image/png;base64,${imageBase64}` : null
      };

      chat.messages.push(userMsg);
      window.ZenoStorage.saveMessages(activeChatId, chat.messages);

      const bubble = window.ZenoChatEngine.renderMessage(userMsg);
      messagesList.appendChild(bubble);
      window.ZenoChatEngine.scrollToBottom(chatContainer);

      // Map frontend mode name to backend API mode name
      const apiMode = MODE_META[mode] ? MODE_META[mode].apiMode : "chat";
      callBackendAI(chat, promptText, imageBase64, apiMode);
    }
  };

  // Input events
  promptInput.addEventListener("input", () => {
    sendBtn.disabled = !promptInput.value.trim() && !attachedImageBase64;
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendRequest();
    }
  });

  sendBtn.addEventListener("click", handleSendRequest);

  // ── Image Attachment & Preview Handlers ────────────────────────────────────
  function setAttachedImage(dataUrl, fileName = "image.png") {
    attachedImageBase64 = dataUrl;
    if (imagePreviewThumb) imagePreviewThumb.src = dataUrl;
    if (imagePreviewFilename) imagePreviewFilename.textContent = fileName;
    if (imagePreviewBar) imagePreviewBar.style.display = "block";
    if (fileAttachmentBadge) fileAttachmentBadge.textContent = "📎 " + fileName;
    sendBtn.disabled = false;
  }

  function clearAttachedImage() {
    attachedImageBase64 = null;
    if (fileInput) fileInput.value = "";
    if (imagePreviewThumb) imagePreviewThumb.src = "";
    if (imagePreviewBar) imagePreviewBar.style.display = "none";
    if (fileAttachmentBadge) fileAttachmentBadge.textContent = "";
    sendBtn.disabled = !promptInput.value.trim();
  }

  if (imagePreviewRemove) {
    imagePreviewRemove.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearAttachedImage();
    });
  }

  // File picker button
  if (attachBtn && fileInput) {
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        pushSystemNotification("Please select an image file (PNG, JPG, WebP, etc.)");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target.result, file.name);
        pushSystemNotification(`Attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  }

  // Clipboard Paste support (Ctrl+V into prompt input)
  promptInput.addEventListener("paste", (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachedImage(event.target.result, "clipboard-screenshot.png");
            pushSystemNotification("Image pasted from clipboard");
          };
          reader.readAsDataURL(blob);
        }
        break;
      }
    }
  });

  // Drag and drop image files onto footer/workspace
  const footerEl = document.querySelector(".workspace-footer");
  if (footerEl) {
    ['dragenter', 'dragover'].forEach(eventName => {
      footerEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        footerEl.classList.add("drag-over");
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      footerEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        footerEl.classList.remove("drag-over");
      });
    });
    footerEl.addEventListener("drop", (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0 && files[0].type.startsWith("image/")) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedImage(event.target.result, file.name);
          pushSystemNotification(`Attached: ${file.name}`);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ── Lightbox Modal for Chat Images ─────────────────────────────────────────
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.tagName === "IMG" && (target.classList.contains("chat-uploaded-img") || target.closest(".message-content") || target.closest(".message-image-wrap"))) {
      if (target.classList.contains("zeno-logo-img") || target.classList.contains("header-brain-logo") || target.id === "image-preview-thumb") return;
      if (imageLightboxModal && lightboxImg) {
        lightboxImg.src = target.src;
        if (lightboxDownload) lightboxDownload.href = target.src;
        imageLightboxModal.style.display = "flex";
      }
    }
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", () => {
      if (imageLightboxModal) imageLightboxModal.style.display = "none";
    });
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener("click", () => {
      if (imageLightboxModal) imageLightboxModal.style.display = "none";
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageLightboxModal && imageLightboxModal.style.display === "flex") {
      imageLightboxModal.style.display = "none";
    }
  });



  // ── User Profile Image Management ──────────────────────────────────────────
  const DEFAULT_PROFILE_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100";

  function applyProfileAvatar(src) {
    const avatarUrl = src || DEFAULT_PROFILE_AVATAR;
    document.querySelectorAll(".profile-avatar-img").forEach(img => {
      img.src = avatarUrl;
    });
    if (settingsProfilePreview) {
      settingsProfilePreview.src = avatarUrl;
    }
  }

  // Initialize profile image from localStorage
  const savedProfileImage = localStorage.getItem("zeno_profile_image");
  if (savedProfileImage) {
    applyProfileAvatar(savedProfileImage);
  }

  // Settings profile image upload from folder
  if (settingsUploadProfileBtn && settingsProfileFileInput) {
    settingsUploadProfileBtn.addEventListener("click", () => {
      settingsProfileFileInput.click();
    });

    settingsProfileFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        pushSystemNotification("Please select an image file (PNG, JPG, WebP, etc.)");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        try {
          localStorage.setItem("zeno_profile_image", dataUrl);
          applyProfileAvatar(dataUrl);
          pushSystemNotification("Profile image updated successfully!");
        } catch (err) {
          console.warn("Could not save to localStorage (quota exceeded):", err);
          applyProfileAvatar(dataUrl);
          pushSystemNotification("Profile image updated for current session");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Settings profile image reset to default
  if (settingsResetProfileBtn) {
    settingsResetProfileBtn.addEventListener("click", () => {
      localStorage.removeItem("zeno_profile_image");
      applyProfileAvatar(DEFAULT_PROFILE_AVATAR);
      if (settingsProfileFileInput) settingsProfileFileInput.value = "";
      pushSystemNotification("Profile image reset to default");
    });
  }

  // Voice Input (Microphone) integration
  if (micBtn && window.ZenoVoice) {
    let oldPlaceholder = "";
    let accumulatedTranscript = "";
    let silenceTimer = null;

    function stopMicUI() {
      micBtn.classList.remove("recording");
      if (promptInput.placeholder === "🎙️ Listening...") {
        promptInput.placeholder = oldPlaceholder;
      }
    }

    micBtn.addEventListener("click", () => {
      if (window.ZenoVoice.isListening) {
        // Manual stop
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        window.ZenoVoice.stopListening();
        stopMicUI();
      } else {
        // Start listening
        oldPlaceholder = promptInput.placeholder;
        promptInput.placeholder = "🎙️ Listening...";
        accumulatedTranscript = promptInput.value;
        if (accumulatedTranscript && !accumulatedTranscript.endsWith(" ")) {
          accumulatedTranscript += " ";
        }

        window.ZenoVoice.startListening(
          (transcript) => {
            // Each result replaces the running accumulated portion
            promptInput.value = accumulatedTranscript + transcript;
            sendBtn.disabled = false;

            // After each recognized phrase, update the base and reset silence timer
            accumulatedTranscript = promptInput.value;
            if (!accumulatedTranscript.endsWith(" ")) accumulatedTranscript += " ";

            // 3-second silence → auto-stop
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
              if (window.ZenoVoice.isListening) {
                window.ZenoVoice.stopListening();
                stopMicUI();
              }
            }, 3000);
          },
          (errorMsg) => {
            if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
            pushSystemNotification(errorMsg);
            stopMicUI();
          },
          () => {
            if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
            stopMicUI();
          }
        );
        micBtn.classList.add("recording");
      }
    });
  }



  // ===========================================================================
  // AI AGENT WIDGET LOGIC & EVENT POPUP BUTTONS
  // ===========================================================================
  if (floatingAgentBtn && agentPopupCard) {
    floatingAgentBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      agentPopupCard.classList.toggle("show");
    });

    if (agentPopupClose) {
      agentPopupClose.addEventListener("click", () => agentPopupCard.classList.remove("show"));
    }

    document.addEventListener("click", (e) => {
      if (!floatingAgentContainer.contains(e.target)) {
        agentPopupCard.classList.remove("show");
      }
    });

    // 1. Analyze Clipboard
    if (btnClipboard) {
      btnClipboard.addEventListener("click", async () => {
        agentPopupCard.classList.remove("show");
        pushSystemNotification("Scanning clipboard contents...");
        try {
          const text = await navigator.clipboard.readText();
          if (!text) {
            pushSystemNotification("Clipboard is empty.");
            return;
          }
          if (activeChatId === null) {
            const newChat = window.ZenoStorage.createChat("Clipboard Scan");
            activeChatId = newChat.id;
            renderChatHistory();
          }
          const chat = window.ZenoStorage.getChat(activeChatId);
          await callBackendAI(chat, `Analyze this clipboard text:\n\n${text}`);
        } catch (err) {
          pushSystemNotification(`Failed to read clipboard: ${err.message}`);
        }
      });
    }

    // 2. Analyze Screenshot
    if (btnScreenshot) {
      btnScreenshot.addEventListener("click", () => {
        agentPopupCard.classList.remove("show");
        pushSystemNotification("Screenshot OCR tool ready. Please upload via Debug Mode panel.");
      });
    }
  }

  // Header click version popup close triggers
  if (headerBrandBtn && zenoVersionPopup) {
    headerBrandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      zenoVersionPopup.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!zenoVersionPopup.contains(e.target) && !headerBrandBtn.contains(e.target)) {
        zenoVersionPopup.classList.remove("show");
      }
    });
  }

  if (profileAvatarBtn && profileDropdown) {
    profileAvatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target) && !profileAvatarBtn.contains(e.target)) {
        profileDropdown.classList.remove("show");
      }
    });
  }

  // Mobile drawer sidebar toggle
  if (mobileSidebarToggle && sidebarLeft) {
    mobileSidebarToggle.addEventListener("click", () => {
      sidebarLeft.classList.toggle("active");
    });
  }

  function pushSystemNotification(text) {
    const toast = document.createElement("div");
    toast.className = "system-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--accent-color);
      color: #fff;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 99999;
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

  // Startup Orchestration
  initApp();

  // Login Particles Generator
  function generateLoginParticles() {
    const container = document.getElementById("login-particles");
    if (!container) return;
    const colors = [
      "rgba(168, 85, 247, 0.7)",
      "rgba(99, 102, 241, 0.6)",
      "rgba(236, 72, 153, 0.5)",
      "rgba(59, 130, 246, 0.4)"
    ];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";

      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = 2 + Math.random() * 3;
      const tx = (Math.random() - 0.5) * 200 + "px";
      const ty = (Math.random() - 0.5) * 200 + "px";
      const delay = Math.random() * 15;
      const duration = 10 + Math.random() * 20;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.cssText = `
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        box-shadow: 0 0 ${size * 4}px ${color};
        --tx: ${tx};
        --ty: ${ty};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
      `;
      container.appendChild(p);
    }
  }
});
