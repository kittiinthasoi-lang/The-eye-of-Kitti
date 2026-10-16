import React, { useState, useEffect } from 'react';
import {
  Camera,
  Eye,
  ShieldAlert,
  Compass,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Info,
  Radio,
  MapPin,
  Mic,
  BatteryCharging,
  Settings
} from 'lucide-react';
import { UserProfile, GeoLocationState } from './types/navigation';
import { UserProfileCard } from './components/UserProfileCard';
import { CameraNavigator } from './components/CameraNavigator';
import { SosSection } from './components/SosSection';
import { LiveMapViewer } from './components/LiveMapViewer';
import { speechEngine, soundEngine } from './utils/audio';
import { triggerHaptic, HAPTIC_PATTERNS } from './utils/haptics';

const INITIAL_PROFILE: UserProfile = {
  id: 'user-001',
  fullName: 'คุณกิตติ อินทสร้อย',
  phone: '081-999-8877',
  impairmentLevel: 'total_blindness',
  bloodType: 'O',
  congenitalDiseases: 'ไม่มีโรคประจำตัวร้ายแรง',
  allergies: 'ไม่มีประวัติแพ้ยา',
  preferredLanguage: 'th',
  emergencyContact: {
    name: 'คุณสมศรี อินทสร้อย',
    relationship: 'มารดา / ผู้ดูแลหลัก',
    phone: '089-123-4567',
  },
  audioSpeed: 1.1,
  audioVolume: 1.0,
  hapticEnabled: true,
  highContrastMode: true,
  batterySaverCadence: 'balanced', // 4s cadence
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('kitti_user_profile');
      return saved ? JSON.parse(saved) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [isCameraNavOpen, setIsCameraNavOpen] = useState<boolean>(false);
  const [batteryCadence, setBatteryCadence] = useState<'fast' | 'balanced' | 'eco' | 'manual'>(
    profile.batterySaverCadence || 'balanced'
  );

  const [location, setLocation] = useState<GeoLocationState>({
    latitude: 13.7563, // Default to Bangkok center
    longitude: 100.5018,
    accuracy: 8,
    heading: 0,
    speed: 0,
    address: 'กรุงเทพมหานคร, ประเทศไทย',
    timestamp: Date.now(),
  });

  const [hasStartedAudio, setHasStartedAudio] = useState<boolean>(false);

  // Save profile updates to localStorage
  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    try {
      localStorage.setItem('kitti_user_profile', JSON.stringify(updated));
    } catch {}
  };

  // Real GPS Geolocation tracking
  const requestLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
            address: `พิกัด (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
          });
        },
        (err) => {
          console.warn('Geolocation warning, keeping fallback:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  useEffect(() => {
    requestLocation();
    let watchId: number | null = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          }));
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Voice welcome guidance on first interaction
  const handleWelcomeSpeech = () => {
    if (!hasStartedAudio) {
      setHasStartedAudio(true);
      triggerHaptic(HAPTIC_PATTERNS.TAP);
      speechEngine.speak(
        'ยินดีต้อนรับสู่ The Eye of Kitti ระบบนำทางเพื่ออิสรภาพของผู้พิการทางสายตา มีปุ่มโปรไฟล์ผู้ใช้อยู่ด้านบน ปุ่มเริ่มนำทางกล้องอยู่ถัดมา แผนที่นำทางคนเดิน และปุ่มขอความช่วยเหลือฉุกเฉิน เอสโอเอส อยู่ด้านล่างสุด',
        { urgent: true }
      );
    }
  };

  const openCameraNav = () => {
    triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
    setIsCameraNavOpen(true);
  };

  return (
    <div
      onClick={handleWelcomeSpeech}
      className="min-h-screen bg-[#03081e] text-[#e0f2fe] font-sans selection:bg-[#00e5ff] selection:text-[#03081e]"
    >
      {/* ACCESSIBLE SKIP LINK FOR SCREEN READERS */}
      <a
        href="#main-nav-button"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:p-4 focus:bg-[#00e5ff] focus:text-[#03081e] focus:font-black focus:rounded-xl"
      >
        ข้ามไปยังปุ่มเริ่มนำทางจากกล้อง
      </a>

      {/* TOP HEADER / LOGO & STATUS */}
      <header className="sticky top-0 z-40 bg-[#071536]/95 backdrop-blur-md border-b-2 border-[#00e5ff] px-4 py-3 shadow-[0_4px_25px_rgba(0,229,255,0.18)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo with 3% Neon Gold Accent Rim */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.5)] shrink-0 bg-[#03081e]">
              <img
                src="/logo.jpg"
                alt="ตราสัญลักษณ์ The Eye of Kitti"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl md:text-2xl font-black text-[#00e5ff] tracking-wide leading-tight drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                  The Eye of Kitti
                </h1>
                <span className="text-[#ffd700] text-xs font-black animate-pulse">✦</span>
              </div>
              <p className="text-xs font-semibold text-[#93c5fd]">
                ระบบนำทางและช่วยเหลือผู้พิการทางสายตา
              </p>
            </div>
          </div>

          {/* Quick Audio Help */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                speechEngine.speak(
                  `คำแนะนำการใช้งาน The Eye of Kitti: หน้าจอเรียงตามลำดับคือ 1. โปรไฟล์ของคุณ ${profile.fullName}, 2. ปุ่มใหญ่เริ่มนำทางด้วยกล้อง AI, 3. แผนที่นำทางคนเดินถนน, และ 4. ระบบขอความช่วยเหลือฉุกเฉิน SOS โรงพยาบาล 1669 ตำรวจ 191 และดับเพลิง 199`,
                  { urgent: true }
                );
              }}
              className="p-2.5 rounded-xl bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/50 flex items-center gap-1.5 transition active:scale-95 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
              aria-label="ฟังคำอธิบายวิธีใช้งานแอปพลิเคชัน"
              title="ฟังคำอธิบายวิธีใช้งาน"
            >
              <Volume2 className="w-5 h-5 text-[#00e5ff]" />
              <span className="text-xs font-bold hidden sm:inline">วิธีใช้งาน</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        {/* 1. TOP SECTION: USER PROFILE (หน้าแรกจะมีโปรไฟล์ผู้ใช้ข้อมูลเบื้องต้น) */}
        <UserProfileCard profile={profile} onUpdateProfile={handleUpdateProfile} />

        {/* 2. MIDDLE SECTION: GIANT CAMERA NAVIGATION BUTTON (ปุ่มกดนำทางจากกล้อง) */}
        <section
          id="main-nav-button"
          aria-label="ปุ่มหลักสำหรับเปิดระบบนำทางด้วยกล้อง AI"
          className="space-y-3"
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm font-black text-[#00e5ff] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#ffd700]" />
              <span className="drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
                ระบบนำทางด้วยกล้อง AI อัจฉริยะ
              </span>
            </div>
            <span className="text-xs font-bold text-[#7dd3fc]">
              โหมดแบตเตอรี่: {batteryCadence === 'eco' ? 'ประหยัด 6วิ' : batteryCadence === 'balanced' ? 'สมดุล 4วิ' : 'กดสแกนเอง'}
            </span>
          </div>

          {/* Giant Accessible Master Navigation Trigger Button (Neon Blue 27% + Neon Gold 3% + Deep Navy) */}
          <button
            onClick={openCameraNav}
            type="button"
            className="w-full py-8 md:py-10 px-6 rounded-3xl bg-gradient-to-r from-[#00b4d8] via-[#00e5ff] to-[#38bdf8] hover:brightness-110 active:scale-98 text-[#03081e] shadow-[0_0_35px_rgba(0,229,255,0.45)] border-4 border-[#ffd700] transition flex flex-col items-center justify-center gap-3 cursor-pointer group"
            aria-label="กดปุ่มนี้เพื่อเปิดกล้องนำทางแบบเรียลไทม์ ตรวจจับสิ่งกีดขวางและฟังเสียงบอกทาง"
          >
            {/* Logo Emblem badge with gold rim & camera indicator */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.6)] group-hover:scale-105 transition bg-[#03081e]">
                <img
                  src="/logo.jpg"
                  alt="ตราสัญลักษณ์ The Eye of Kitti"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#03081e] text-[#ffd700] border-2 border-[#ffd700] shadow-md">
                <Camera className="w-5 h-5 text-[#ffd700]" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-2xl md:text-3xl font-black tracking-wide text-[#03081e]">
                กดเริ่มนำทางด้วยกล้อง AI
              </div>
              <p className="text-sm md:text-base font-extrabold text-[#051c4a] max-w-md mx-auto">
                ตรวจจับสิ่งกีดขวาง ทางม้าลาย บันได พร้อมเสียงบอกทางภาษาไทยแบบเรียลไทม์
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-[#03081e] text-[#00e5ff] text-xs font-black px-4 py-1.5 rounded-full mt-1 border border-[#00e5ff]/50 shadow-[0_0_10px_rgba(0,229,255,0.3)]">
              <Zap className="w-3.5 h-3.5 text-[#ffd700] animate-pulse" />
              <span>ประหยัดพลังงานแบตเตอรี่สมาร์ทโฟน • แม่นยำสูงสุด</span>
            </div>
          </button>
        </section>

        {/* 3. REORDERED: PEDESTRIAN MAP IS NOW ABOVE SOS EMERGENCY (เอาแผนที่นำทางคนเดินมาไว้ข้างบน ระบบขอความช่วยเหลือ) */}
        <LiveMapViewer location={location} onRefreshLocation={requestLocation} />

        {/* 4. SOS EMERGENCY SECTION (ระบบขอความช่วยเหลือฉุกเฉิน) */}
        <SosSection profile={profile} location={location} />
      </main>

      {/* FULLSCREEN CAMERA NAVIGATION MODAL */}
      {isCameraNavOpen && (
        <CameraNavigator
          onClose={() => setIsCameraNavOpen(false)}
          batteryCadence={batteryCadence}
          onCadenceChange={(c) => {
            setBatteryCadence(c);
            handleUpdateProfile({ ...profile, batterySaverCadence: c });
          }}
        />
      )}

      {/* FOOTER / BRANDING & MISSION */}
      <footer className="border-t border-[#00e5ff]/30 bg-[#071536]/80 py-8 px-4 text-center text-xs text-[#93c5fd] space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.5)] bg-[#03081e]">
          <img
            src="/logo.jpg"
            alt="The Eye of Kitti"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="font-black text-[#00e5ff] text-base tracking-wide flex items-center justify-center gap-1.5">
          <span>The Eye of Kitti (ดวงตาของกิตติ)</span>
          <span className="text-[#ffd700]">✦</span>
        </p>
        <p className="max-w-md mx-auto text-[#bae6fd]">
          ตั้งเป้าหมายหลักในการอำนวยความสะดวกการใช้ชีวิตประจำวันให้เป็นอิสระสำหรับผู้พิการทางสายตา
        </p>
      </footer>
    </div>
  );
}
