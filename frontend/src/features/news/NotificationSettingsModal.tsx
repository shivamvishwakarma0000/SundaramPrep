import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Clock, ShieldCheck, Sparkles, Send, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { PushNotificationPreferences } from '../../types';

interface NotificationSettingsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubscriptionChange?: (enabled: boolean) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen = true,
  onClose,
  onSubscriptionChange
}) => {
  if (!isOpen) return null;

  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<PushNotificationPreferences>({
    enabled: true,
    frequency: 'HOURLY',
    preferred_morning_time: '08:00',
    preferred_afternoon_time: '13:00',
    preferred_evening_time: '19:00',
    categories_filter: []
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadPrefs() {
      try {
        const token = localStorage.getItem('sundaram_token');
        if (token) {
          const res = await api.getPushPreferences();
          if (res) {
            setPreferences(res);
          }
        }
      } catch (e) {
        // Fallback to local defaults
      }
    }
    loadPrefs();
  }, [isOpen]);

  if (!isOpen) return null;

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setFeedback('Push notifications are not supported by this browser.');
      setFeedbackType('error');
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        setFeedback('Permission was not granted. Please allow notifications in your browser settings.');
        setFeedbackType('error');
        setLoading(false);
        return;
      }

      // Register Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const vapidRes = await api.getVapidKey();
      const convertedKey = urlBase64ToUint8Array(vapidRes.public_key);

      // Subscribe with browser PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      const subData = subscription.toJSON();
      await api.subscribePush({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subData.keys?.p256dh || '',
          auth: subData.keys?.auth || ''
        }
      });

      setPreferences(prev => ({ ...prev, enabled: true }));
      onSubscriptionChange?.(true);
      setFeedback('Push notifications enabled successfully! Hourly reminders are active.');
      setFeedbackType('success');
    } catch (e: any) {
      setFeedback(`Could not complete push registration: ${e.message || 'Error'}`);
      setFeedbackType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (newFrequency: "HOURLY" | "EVERY_2_HOURS" | "THRICE_DAILY" | "DAILY_DIGEST" | "OFF") => {
    const updated = { ...preferences, frequency: newFrequency, enabled: newFrequency !== 'OFF' };
    setPreferences(updated);

    try {
      const token = localStorage.getItem('sundaram_token');
      if (token) {
        await api.updatePushPreferences(updated);
      }
      setFeedback('Notification preferences updated.');
      setFeedbackType('success');
    } catch (e) {
      // Saved locally
    }
  };

  const handleSendTest = async () => {
    if (!('serviceWorker' in navigator)) return;
    setTesting(true);
    setFeedback(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (!sub) {
        setFeedback('No active push subscription found. Click "Enable Notifications" first.');
        setFeedbackType('error');
      } else {
        await api.sendTestPush(sub.endpoint);
        setFeedback('Test notification dispatched! Check your device notifications.');
        setFeedbackType('success');
      }
    } catch (e: any) {
      setFeedback('Could not send test notification.');
      setFeedbackType('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Current Affairs Notifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-muted font-medium">
                Stay ahead with timed high-yield exam alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Permission State Banner */}
          {permissionState !== 'granted' ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Receive Smart UPSC Updates
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Get an hourly nudge with newly verified government schemes, Supreme Court rulings, and economic updates.
                  </p>
                </div>
              </div>
              <button
                onClick={handleEnablePush}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bell className="w-4 h-4" />}
                <span>Enable Browser Notifications</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Browser Push Permission Active</span>
              </div>
              <button
                onClick={handleSendTest}
                disabled={testing}
                className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{testing ? 'Sending...' : 'Test Alert'}</span>
              </button>
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${feedbackType === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'}`}>
              {feedbackType === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{feedback}</span>
            </div>
          )}

          {/* Notification Frequency Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-dark-muted">
              Notification Frequency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'HOURLY', label: 'Hourly (Recommended)', desc: '1 reminder/hour if new news available' },
                { id: 'EVERY_2_HOURS', label: 'Every 2 Hours', desc: 'Balanced revision rhythm' },
                { id: 'THRICE_DAILY', label: '3 Times Daily', desc: 'Morning, Afternoon & Evening' },
                { id: 'DAILY_DIGEST', label: 'Daily Digest Only', desc: 'Evening comprehensive recap' },
              ].map((opt) => {
                const isSelected = preferences.frequency === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSavePreferences(opt.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-black">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anti-Spam & Intelligent Rules Note */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Smart Delivery Rules:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400">
              <li>Notifications are only sent when fresh, verified UPSC news is published.</li>
              <li>If you already read the latest articles on the site, reminders are suppressed.</li>
              <li>Respects your device local timezone.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
