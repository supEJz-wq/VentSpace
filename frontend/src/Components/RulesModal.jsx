import React from 'react';
import { X, ShieldCheck, Heart, Users, MessageSquare, AlertCircle } from 'lucide-react';

const RulesModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  const rules = [
    {
      icon: <Users size={20} className="text-rose-400" />,
      title: "Respect the Sanctuary",
      desc: "Be kind. Everyone here is sharing a piece of their heart. Treat it with care."
    },
    {
      icon: <ShieldCheck size={20} className="text-amber-400" />,
      title: "Anonymous but Responsible",
      desc: "No hate speech, harassment, or bullying. We keep this space safe for everyone."
    },
    {
      icon: <AlertCircle size={20} className="text-orange-400" />,
      title: "Privacy First",
      desc: "Don't share personal info—neither yours nor anyone else's. Stay anonymous."
    },
    {
      icon: <MessageSquare size={20} className="text-blue-400" />,
      title: "Real Emotions",
      desc: "Share honestly. This is a place for authentic human connection, not spam."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-stone-900/90 border border-rose-200/20 backdrop-blur-xl w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-fadeInUp">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-rose-200/40 hover:text-rose-200 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-8">
          <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6">
            <Heart className="text-rose-400 fill-rose-400/20" size={28} />
          </div>
          <h2 className="text-3xl font-bold text-amber-50 mb-2">Community Guidelines</h2>
          <p className="text-rose-100/60 font-light italic">Before you enter VentSpace...</p>
        </div>

        <div className="space-y-6 mb-10">
          {rules.map((rule, index) => (
            <div key={index} className="flex gap-4 group">
              <div className="flex-shrink-0 mt-1">
                {rule.icon}
              </div>
              <div>
                <h3 className="text-amber-50 font-semibold mb-1 group-hover:text-rose-300 transition-colors">{rule.title}</h3>
                <p className="text-rose-100/40 text-sm leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onAccept}
            className="w-full bg-gradient-to-r from-rose-400 to-amber-400 hover:from-rose-500 hover:to-amber-500 text-stone-900 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-950/20"
          >
            I Agree & Continue
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 text-rose-100/60 py-3 rounded-2xl text-sm font-medium transition-all"
          >
            Go Back
          </button>
        </div>

        <p className="mt-8 text-center text-[10px] text-rose-200/20 uppercase tracking-widest font-bold">
          Protecting the shared soul of the community
        </p>
      </div>
    </div>
  );
};

export default RulesModal;
