import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modern OTP Verification React Component
 * 
 * Features:
 * - Dark glassmorphism card centered on black background
 * - Title: "Let's verify your email"
 * - Subtitle: "We've sent a 4-digit code to your email. It'll auto-verify once entered."
 * - 4 rounded OTP input boxes
 * - Orange-red glowing border on focus
 * - Smooth scale animation while typing
 * - Auto-advance on digit entry & Backspace navigation
 * - Numeric input filtering only
 * - Auto-verify when all 4 digits are entered
 * - Green checkmark animation with "Verified Successfully"
 * - Mobile-first responsive layout with modern iOS-like typography
 */
export default function OTPVerification({
  email = "developer@zeno.ai",
  onVerify = async (otp) => console.log("Verifying OTP:", otp),
  onResend = async () => console.log("Resending OTP"),
  onBackToLogin = () => console.log("Back to login")
}) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [activeInputIndex, setActiveInputIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Focus first input box on initial mount
  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  // Live 2:00 Countdown Timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Format countdown as MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Handle single digit typing & auto-advance
  const handleChange = (e, index) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Take last typed digit
    setOtp(newOtp);
    setErrorMessage('');

    // Auto-move focus to next box
    if (index < 3 && inputRefs[index + 1].current) {
      inputRefs[index + 1].current.focus();
      setActiveInputIndex(index + 1);
    }

    // Auto-verify if all 4 digits are entered
    const fullCode = newOtp.join('');
    if (fullCode.length === 4) {
      handleAutoVerify(fullCode);
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs[index - 1].current) {
        inputRefs[index - 1].current.focus();
        setActiveInputIndex(index - 1);
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
      setErrorMessage('');
    }
  };

  // Handle Clipboard Paste (Distribute 4 digits)
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!pasteData) return;

    const newOtp = ['', '', '', ''];
    pasteData.split('').forEach((char, idx) => {
      if (idx < 4) newOtp[idx] = char;
    });
    setOtp(newOtp);
    setErrorMessage('');

    const focusIdx = Math.min(pasteData.length - 1, 3);
    if (inputRefs[focusIdx].current) {
      inputRefs[focusIdx].current.focus();
      setActiveInputIndex(focusIdx);
    }

    if (pasteData.length === 4) {
      handleAutoVerify(pasteData);
    }
  };

  // Automatic Verification Trigger
  const handleAutoVerify = async (code) => {
    if (countdown <= 0) {
      setErrorMessage('OTP Expired. Please request a new code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      await onVerify(code);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err?.message || 'Invalid OTP code. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP Action
  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(120);
    setOtp(['', '', '', '']);
    setErrorMessage('');
    setIsSuccess(false);

    try {
      await onResend();
      if (inputRefs[0].current) {
        inputRefs[0].current.focus();
        setActiveInputIndex(0);
      }
    } catch (err) {
      setErrorMessage('Failed to resend code. Try again later.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white font-sans">
      {/* Centered Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.8)] relative overflow-hidden"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-20 -left-20 w-56 h-56 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <button
          onClick={onBackToLogin}
          className="text-xs text-zinc-400 hover:text-white transition-colors mb-6 inline-flex items-center gap-1.5 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sign In
        </button>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header Title & Subtitle */}
              <div className="text-center mb-8">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2"
                >
                  Let's verify your email
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto"
                >
                  We've sent a 4-digit code to <span className="text-orange-400 font-medium">{email}</span>. It'll auto-verify once entered.
                </motion.p>
              </div>

              {/* 4 OTP Input Boxes */}
              <div className="flex justify-center gap-3 sm:gap-4 my-8">
                {otp.map((digit, index) => {
                  const isFocused = activeInputIndex === index;
                  const isFilled = Boolean(digit);

                  return (
                    <motion.div
                      key={index}
                      animate={{
                        scale: isFilled ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <input
                        ref={inputRefs[index]}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onFocus={() => setActiveInputIndex(index)}
                        onPaste={handlePaste}
                        disabled={isVerifying}
                        className={`w-14 h-16 sm:w-16 sm:h-20 text-center text-2xl sm:text-3xl font-extrabold font-mono rounded-2xl bg-zinc-900/90 border transition-all duration-200 outline-none text-white shadow-inner ${
                          isFocused
                            ? 'border-orange-500 shadow-[0_0_25px_rgba(255,107,0,0.6)] ring-2 ring-orange-500/50 bg-zinc-900'
                            : isFilled
                            ? 'border-orange-500/50 bg-orange-950/20 text-orange-400'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Error Message Banner */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium"
                >
                  {errorMessage}
                </motion.div>
              )}

              {/* Timer & Resend Footer */}
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${countdown > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span>
                    {countdown > 0 ? (
                      <>Expires in <strong className="text-zinc-200 font-mono">{formatTime(countdown)}</strong></>
                    ) : (
                      <span className="text-red-400 font-semibold">Code Expired</span>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend}
                  className={`font-semibold transition-colors ${
                    canResend
                      ? 'text-orange-400 hover:text-orange-300 underline underline-offset-4 cursor-pointer'
                      : 'text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  Resend OTP
                </button>
              </div>
            </motion.div>
          ) : (
            /* Green Checkmark Success Screen */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="py-8 text-center flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, 0] }}
                transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
              >
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-extrabold text-white mb-2"
              >
                Verified Successfully
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-zinc-400"
              >
                Redirecting to your Zeno workspace...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
