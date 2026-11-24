import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  Bell,
  Volume2,
  CheckCircle,
  ExternalLink,
  Send,
  Radio,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { playOrderAlertChime, triggerSystemNotification } from './utils/notifications';

interface PhoneAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneAlertsModal: React.FC<PhoneAlertsModalProps> = ({ isOpen, onClose }) => {
  const [topic, setTopic] = useState('lagoslife_orders_hq');
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3000/api/v1/admin/notifications/settings')
        .then((r) => r.json())
        .then((res) => {
          if (res?.success && res?.data?.ntfyTopic) {
            setTopic(res.data.ntfyTopic);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subscriptionUrl = `https://ntfy.sh/${topic}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(subscriptionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendTestPush = async () => {
    setLoading(true);
    setTestSent(false);

    // Play local chime so user hears audio feedback right away
    playOrderAlertChime(false);

    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/notifications/test-phone-push', {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.success) {
        setTestSent(true);
      }
    } catch (err) {
      console.error('Failed to trigger test push:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        playOrderAlertChime(false);
        triggerSystemNotification(
          '🔔 Lagos Life Admin Notifications Enabled',
          'You will receive instant sound and visual alerts when any customer purchases currency!',
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-surface border border-surface-border p-4 sm:p-7 shadow-2xl text-left overflow-y-auto max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Live Phone & Mobile Lock-Screen Alerts
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-2.5 h-2.5 mr-1 text-emerald-400 animate-pulse" />
                Live 0s Push
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Receive immediate, loud sound alerts and lock-screen banners on your <strong>iPhone</strong> and <strong>Android</strong> phone the instant a player buys game currency!
            </p>
          </div>
        </div>

        {/* 1-Tap Subscription Link Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-surface-card to-cyan-950/30 border border-emerald-500/30 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Your Direct Push Channel
              </div>
              <div className="font-mono text-sm sm:text-base font-bold text-white mt-0.5 break-all">
                {subscriptionUrl}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-surface-border/60 hover:bg-surface-border text-xs font-semibold text-white flex items-center space-x-1.5 transition shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={subscriptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-500/20 shrink-0"
              >
                <span>Open On Phone</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Phone Setup Guide: iPhone & Android */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* iPhone / iOS Card */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
                  🍏
                </div>
                <div className="font-bold text-sm text-white">Apple iPhone (iOS)</div>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Install the free <strong className="text-white">ntfy</strong> app from the{' '}
                  <span className="text-emerald-400">Apple App Store</span>.
                </li>
                <li>
                  Open the app, tap <strong className="text-white">+</strong> (Add Topic), and type:{' '}
                  <code className="text-emerald-300 font-bold bg-black/40 px-1 py-0.5 rounded">{topic}</code>
                </li>
                <li>
                  Tap <strong className="text-white">Subscribe</strong>. That's it!
                </li>
              </ol>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-border/60 text-[11px] text-slate-400 flex items-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
              Lock-screen banners & sounds play even with screen locked!
            </div>
          </div>

          {/* Android Card */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  🤖
                </div>
                <div className="font-bold text-sm text-white">Google Android</div>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Install the free <strong className="text-white">ntfy</strong> app from{' '}
                  <span className="text-emerald-400">Google Play</span>.
                </li>
                <li>
                  Open the app, tap <strong className="text-white">+</strong> (Add Topic), and enter:{' '}
                  <code className="text-emerald-300 font-bold bg-black/40 px-1 py-0.5 rounded">{topic}</code>
                </li>
                <li>
                  Tap <strong className="text-white">Subscribe</strong> and allow notifications.
                </li>
              </ol>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-border/60 text-[11px] text-slate-400 flex items-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
              Full ringtone + custom vibration buzz on every order!
            </div>
          </div>
        </div>

        {/* Browser Chime & Audio Test */}
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">In-Browser Sound Chime & System Notifications</div>
              <div className="text-[11px] text-slate-400">
                Browser sound: <span className="text-emerald-400 font-semibold">Active (Web Audio)</span> • Status: <span className="font-mono text-slate-200">{browserPermission}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => playOrderAlertChime(false)}
              className="px-3 py-1.5 rounded-xl bg-surface-border/60 hover:bg-surface-border text-xs font-semibold text-white flex items-center space-x-1.5 transition"
            >
              <Volume2 className="w-3.5 h-3.5 text-primary" />
              <span>Test Chime</span>
            </button>
            {browserPermission !== 'granted' && (
              <button
                onClick={handleEnableBrowserNotifications}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-surface-dark text-xs font-bold transition"
              >
                Enable Notifications
              </button>
            )}
          </div>
        </div>

        {/* Send Test Notification Button */}
        <div className="pt-2">
          <button
            onClick={handleSendTestPush}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? (
              <span>Sending Push to Your Phone...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>⚡ Send Test Alert to My Phone Now</span>
              </>
            )}
          </button>

          {testSent && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Test push sent to <strong>{topic}</strong>! Look at your iPhone / Android phone now.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
