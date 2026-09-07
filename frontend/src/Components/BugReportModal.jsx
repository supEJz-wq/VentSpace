import React, { useState, useEffect } from 'react';
import { X, Bug, Lightbulb, Send, CheckCircle, User } from 'lucide-react';
import { createBugReport, getIdentity } from '../lib/api';
import { getDeviceId } from '../lib/identity';

const BugReportModal = ({ isOpen, onClose, initialMode = 'bug' }) => {
  const [mode, setMode] = useState(initialMode); // 'bug' or 'suggestion'
  const [text, setText] = useState("");
  const [reporterName, setReporterName] = useState("Anonymous User");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  // Sync mode with prop when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      
      const loadIdentity = async () => {
        const deviceId = getDeviceId();
        const identity = await getIdentity(deviceId);
        if (identity && identity.username) {
          setReporterName(identity.username);
        }
      };
      loadIdentity();
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    const deviceId = getDeviceId();
    
    const result = await createBugReport({
      text: text.trim(),
      reporterName: reporterName,
      deviceId: deviceId,
      type: mode,
      imageFile: imageFile
    });

    setIsSubmitting(false);
    if (result) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setText("");
        setImageFile(null);
        onClose();
      }, 2000);
    } else {
      alert("Failed to send report. Please try again later.");
    }
  };

  const isBug = mode === 'bug';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white/95 backdrop-blur-xl border border-purple-100 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-fadeInUp overflow-hidden">
        
        {/* Decor Background */}
        <div className={`absolute top-0 left-0 w-full h-1 ${isBug ? 'bg-red-400' : 'bg-amber-400'}`} />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>

        {isSuccess ? (
          <div className="text-center py-10">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-soft ${isBug ? 'bg-red-100' : 'bg-amber-100'}`}>
              <CheckCircle className={isBug ? 'text-red-500' : 'text-amber-500'} size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-gray-500 font-medium">Your {isBug ? 'bug report' : 'suggestion'} has been sent to the dev team.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-8">
              <div className={`p-4 rounded-3xl ${isBug ? 'bg-red-100' : 'bg-amber-100'}`}>
                {isBug ? <Bug className="text-red-500" size={28} /> : <Lightbulb className="text-amber-500" size={28} />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{isBug ? 'Report a Bug' : 'Share an Idea'}</h2>
                <p className="text-sm text-gray-500 font-medium">{isBug ? "Tell us what's broken." : "What should we build next?"}</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
              <button 
                onClick={() => setMode('bug')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isBug ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Bug Report
              </button>
              <button 
                onClick={() => setMode('suggestion')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!isBug ? 'bg-white text-amber-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Suggestion
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50/50 rounded-xl border border-purple-100">
                <User size={14} className="text-purple-400" />
                <span className="text-xs font-bold text-purple-700">Reporting as: <span className="text-purple-900">{reporterName}</span></span>
              </div>

              <div>
                <textarea
                  autoFocus
                  placeholder={isBug ? "Please describe the bug..." : "Describe your idea or suggestion..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`w-full h-36 px-5 py-4 rounded-[1.5rem] bg-gray-50/50 border focus:outline-none focus:ring-4 text-sm resize-none transition-all ${isBug ? 'focus:ring-red-100 border-red-50' : 'focus:ring-amber-100 border-amber-50'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Attach a Screenshot (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !text.trim()}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 hover:scale-[1.02] active:scale-95 ${isBug ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200' : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200'}`}
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={20} /> Submit {isBug ? 'Bug Report' : 'Idea'}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BugReportModal;
