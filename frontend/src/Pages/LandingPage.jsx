import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, EyeOff, Heart } from 'lucide-react';
import lpBg from '../assets/lpBg.png';
import RulesModal from '../Components/RulesModal';
import Logo from '../Components/Logo';

// 1. IMPORT YOUR PICTURES HERE
import pic1 from '../assets/tired.png';
import pic2 from '../assets/idont.png';
import pic3 from '../assets/pain.png';
import pic4 from '../assets/flowers.png';
import pic5 from '../assets/some.png';
import pic6 from '../assets/survive.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

  const handleAcceptRules = () => {
    setShowRules(false);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-stone-900 relative flex items-center justify-center overflow-hidden">
      
      {/* Background Image with WARM Overlay */}
      <div className="absolute inset-0 z-0">
        <img src={lpBg} alt="Cozy Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-rose-950/30 to-stone-900/70 backdrop-blur-[3px]"></div>
      </div>

      {/* Background Floating Emojis */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <span className="absolute top-[15%] left-[15%] text-4xl opacity-40 animate-float">🌸</span>
        <span className="absolute top-[55%] left-[8%] text-5xl opacity-30 animate-float animation-delay-4000">🕯️</span>
        <span className="absolute top-[25%] right-[15%] text-4xl opacity-40 animate-float animation-delay-2000">🍃</span>
        <span className="absolute bottom-[25%] right-[8%] text-5xl opacity-30 animate-float">✨</span>
      </div>

      {/* ========================================== */}
      {/* LEFT SIDE PICTURES (xl+ only, edge-anchored) */}
      {/* ========================================== */}
      <div className="absolute left-4 xl:left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-start gap-6 z-0 pointer-events-none">
        <img
          src={pic1}
          alt="Aesthetic 1"
          className="relative top-[110px] w-[180px] 2xl:w-[240px] h-[240px] 2xl:h-[320px] object-cover rounded-2xl opacity-70 hover:opacity-100 transition-opacity"
        />
        <img
          src={pic2}
          alt="Aesthetic 2"
          className="relative left-[-40px] 2xl:left-[-90px] w-[260px] 2xl:w-[340px] h-[300px] 2xl:h-[380px] object-cover rounded-2xl opacity-70 hover:opacity-100 transition-opacity"
        />
        <img
          src={pic3}
          alt="Aesthetic 3"
          className="relative bottom-[110px] w-[180px] 2xl:w-[240px] h-[240px] 2xl:h-[320px] object-cover rounded-2xl opacity-70 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* ========================================== */}
      {/* RIGHT SIDE PICTURES (xl+ only, edge-anchored) */}
      {/* ========================================== */}
      <div className="absolute right-4 xl:right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-end gap-6 z-0 pointer-events-none">
        <img
          src={pic4}
          alt="Aesthetic 4"
          className="relative top-[110px] w-[180px] 2xl:w-[240px] h-[240px] 2xl:h-[320px] object-cover rounded-2xl opacity-70 hover:opacity-100 transition-opacity"
        />
        <img
          src={pic5}
          alt="Aesthetic 5"
          className="relative right-[-40px] 2xl:right-[-90px] w-[260px] 2xl:w-[340px] h-[300px] 2xl:h-[380px] object-cover rounded-2xl opacity-70 hover:opacity-100 transition-opacity"
        />
        <img
          src={pic6}
          alt="Aesthetic 6"
          className="relative bottom-[110px] w-[180px] 2xl:w-[240px] h-[240px] 2xl:h-[320px] object-cover rounded-2xl opacity-70 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-2xl mx-auto">
        <Logo size={64} className="sm:hidden mx-auto mb-4 rounded-3xl animate-float drop-shadow-2xl" />
        <Logo size={104} className="hidden sm:block mx-auto mb-5 rounded-[1.75rem] animate-float drop-shadow-2xl" />
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-amber-50 mb-4 tracking-tight drop-shadow-lg">
          Vent<span className="bg-gradient-to-r from-rose-300 to-amber-200 text-transparent bg-clip-text">Space</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-rose-100/90 mb-8 sm:mb-10 leading-relaxed font-light">
          A place to vent your thoughts, feelings, and emotions without fear. <br className="hidden sm:block" /> Let your mind breathe.
        </p>

        {/* Core Features Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-10 sm:mb-12">
          <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-rose-200/20 flex flex-col items-center gap-2 hover:bg-white/20 transition-all">
            <EyeOff className="text-rose-300" size={22} />
            <span className="text-amber-50 font-medium text-sm sm:text-base">Anonymous</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-rose-200/20 flex flex-col items-center gap-2 hover:bg-white/20 transition-all">
            <Shield className="text-amber-300" size={22} />
            <span className="text-amber-50 font-medium text-sm sm:text-base">Safe Space</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-rose-200/20 flex flex-col items-center gap-2 hover:bg-white/20 transition-all">
            <Users className="text-pink-300" size={22} />
            <span className="text-amber-50 font-medium text-sm sm:text-base">Real People</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-rose-200/20 flex flex-col items-center gap-2 hover:bg-white/20 transition-all">
            <Heart className="text-red-300" size={22} />
            <span className="text-amber-50 font-medium text-sm sm:text-base">No Judgment</span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => setShowRules(true)}
          className="bg-gradient-to-r from-rose-400 to-amber-400 hover:from-rose-500 hover:to-amber-500 text-stone-900 px-8 py-3.5 sm:px-10 sm:py-4 rounded-full text-lg sm:text-xl font-semibold transition-all shadow-2xl hover:shadow-rose-500/30 hover:scale-105 flex items-center gap-3 mx-auto"
        >
          Continue <span className="text-2xl">→</span>
        </button>

        <p className="mt-8 text-sm text-rose-200/60 italic">
          Step into a space that's all yours.
        </p>
      </div>

      <RulesModal 
        isOpen={showRules} 
        onClose={() => setShowRules(false)} 
        onAccept={handleAcceptRules} 
      />
    </div>
  );
};

export default LandingPage;