import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Flame,
  Ambulance,
  Shield,
  MapPin,
  Send,
  Volume2,
  VolumeX,
  Share2,
  AlertOctagon,
  Copy,
  Check,
  Radio,
  ExternalLink
} from 'lucide-react';
import { UserProfile, GeoLocationState } from '../types/navigation';
import { speechEngine, soundEngine } from '../utils/audio';
import { triggerHaptic, HAPTIC_PATTERNS } from '../utils/haptics';

interface SosSectionProps {
  profile: UserProfile;
  location: GeoLocationState;
}

export const SosSection: React.FC<SosSectionProps> = ({ profile, location }) => {
  const [isActivatingMasterSos, setIsActivatingMasterSos] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [activeAlertDetails, setActiveAlertDetails] = useState<any | null>(null);
  const [sirenPlaying, setSirenPlaying] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSendingApi, setIsSendingApi] = useState<boolean>(false);

  // Countdown timer when Master SOS is pressed
  useEffect(() => {
    let timer: any = null;
    if (isActivatingMasterSos && countdown > 0) {
      speechEngine.speak(`กำลังส่งสัญญาณฉุกเฉินในอีก ${countdown} วินาที แตะเพื่อยกเลิก`, {
        urgent: true,
      });
      triggerHaptic(HAPTIC_PATTERNS.WARNING);

      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isActivatingMasterSos && countdown === 0) {
      // Countdown finished -> Execute Master SOS
      executeSosDispatch('1669', 'เหตุฉุกเฉินเร่งด่วนที่สุด');
      setIsActivatingMasterSos(false);
      setCountdown(3);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActivatingMasterSos, countdown]);

  // Dispatch SOS Alert to backend and prepare phone/sms intents
  const executeSosDispatch = async (
    serviceType: '1669' | '191' | '199' | 'contact',
    customNote?: string
  ) => {
    setIsSendingApi(true);
    triggerHaptic(HAPTIC_PATTERNS.SOS_PULSE);

    // Start siren sound to attract nearby people
    soundEngine.startEmergencySiren();
    setSirenPlaying(true);

    try {
      const res = await fetch('/api/emergency/sos-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType,
          userProfile: profile,
          location: {
            latitude: location.latitude || 13.7563,
            longitude: location.longitude || 100.5018,
            accuracy: location.accuracy || 10,
            addressDescription: location.address || 'ตำแหน่งปัจจุบันของผู้ใช้งาน',
          },
          customNote: customNote || 'ผู้พิการทางสายตาต้องการความช่วยเหลือด่วน',
        }),
      });

      const data = await res.json();
      setActiveAlertDetails(data);

      speechEngine.speak(data.speechAnnouncement || 'ส่งสัญญาณขอความช่วยเหลือฉุกเฉินเรียบร้อยแล้ว', {
        urgent: true,
      });

      // Automatically trigger dial or SMS intent after voice prompt
      if (data.telNumber) {
        setTimeout(() => {
          window.location.href = `tel:${data.telNumber}`;
        }, 1200);
      }
    } catch (err) {
      console.error('SOS dispatch failed:', err);
      // Fallback direct emergency phone dial
      speechEngine.speak('กำลังโทรออกฉุกเฉินไปยัง ' + serviceType, { urgent: true });
      window.location.href = `tel:${serviceType === 'contact' ? profile.emergencyContact.phone : serviceType}`;
    } finally {
      setIsSendingApi(false);
    }
  };

  const cancelMasterSos = () => {
    setIsActivatingMasterSos(false);
    setCountdown(3);
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    speechEngine.speak('ยกเลิกการส่งสัญญาณฉุกเฉินแล้ว', { urgent: true });
  };

  const toggleSiren = () => {
    if (sirenPlaying) {
      soundEngine.stopEmergencySiren();
      setSirenPlaying(false);
      speechEngine.speak('ปิดเสียงไซเรนฉุกเฉินแล้ว');
    } else {
      soundEngine.startEmergencySiren();
      setSirenPlaying(true);
      speechEngine.speak('เปิดเสียงไซเรนฉุกเฉินเพื่อส่งเสียงเตือนผู้คนรอบข้าง');
    }
  };

  const getCoordinatesString = () => {
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (ความแม่นยำ ±${Math.round(
        location.accuracy || 10
      )}ม.)`;
    }
    return 'กำลังค้นหาสัญญาณดาวเทียม GPS...';
  };

  const getGoogleMapsLink = () => {
    if (location.latitude && location.longitude) {
      return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    }
    return 'https://maps.google.com';
  };

  const copyGpsToClipboard = () => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    const link = getGoogleMapsLink();
    navigator.clipboard.writeText(
      `[พิกัดฉุกเฉิน The Eye of Kitti] ตำแหน่งคุณ ${profile.fullName}: ${link} (ละติจูด/ลองจิจูด: ${location.latitude}, ${location.longitude})`
    );
    setCopiedLink(true);
    speechEngine.speak('คัดลอกลิงก์พิกัดตำแหน่งปัจจุบันแล้ว สามารถนำไปส่งต่อได้ทันที');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <section
      aria-label="ระบบขอความช่วยเหลือฉุกเฉิน SOS สำหรับผู้พิการทางสายตา"
      className="bg-[#071536] border-2 border-red-500 rounded-3xl p-5 md:p-6 shadow-[0_4px_35px_rgba(239,68,68,0.25)] relative overflow-hidden"
    >
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-[#0f2d6b]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold shadow-lg shadow-red-600/30 border border-[#ffd700]">
            <ShieldAlert className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl md:text-2xl font-black text-red-500 tracking-wide flex items-center gap-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                <span>ระบบขอความช่วยเหลือ SOS</span>
              </h2>
              <span className="text-[#ffd700] text-xs">✦</span>
            </div>
            <p className="text-[#93c5fd] text-sm font-medium">
              เชื่อมต่อสายด่วนฉุกเฉิน + ส่งพิกัดดาวเทียมเรียลไทม์
            </p>
          </div>
        </div>

        {/* Siren alarm beacon button */}
        <button
          onClick={toggleSiren}
          type="button"
          className={`p-3 rounded-2xl border transition flex items-center gap-1.5 active:scale-95 ${
            sirenPlaying
              ? 'bg-red-600 text-white border-white animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.7)]'
              : 'bg-[#0c2459] text-[#00e5ff] border-[#00e5ff]/40 hover:bg-[#103073]'
          }`}
          title="เปิด/ปิด เสียงหวอดไซเรนฉุกเฉิน"
          aria-label={sirenPlaying ? 'ปิดเสียงไซเรนฉุกเฉิน' : 'เปิดเสียงไซเรนฉุกเฉินเรียกร้องความสนใจรอบข้าง'}
        >
          {sirenPlaying ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-red-400" />}
          <span className="text-xs font-bold hidden sm:inline">
            {sirenPlaying ? 'หยุดไซเรน' : 'เสียงไซเรน'}
          </span>
        </button>
      </div>

      {/* CURRENT GPS COORDINATE DISPLAY (HIGH CONTRAST) */}
      <div className="my-4 p-3.5 bg-[#030a21] rounded-2xl border border-[#0f2d6b] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-red-950/80 text-red-400 border border-red-800/40">
            <MapPin className="w-5 h-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#93c5fd] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>พิกัดปัจจุบันของคุณ</span>
              {location.latitude && (
                <span className="inline-block w-2 h-2 rounded-full bg-[#00e5ff] animate-ping"></span>
              )}
            </div>
            <div className="text-sm md:text-base font-mono font-black text-[#ffd700] truncate drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
              {getCoordinatesString()}
            </div>
          </div>
        </div>

        {/* Copy / Speak GPS button */}
        <button
          onClick={copyGpsToClipboard}
          type="button"
          className="shrink-0 p-2.5 bg-[#0c2459] hover:bg-[#103073] active:scale-95 text-[#00e5ff] rounded-xl border border-[#00e5ff]/40 transition"
          title="คัดลอกพิกัด GPS ส่งต่อ"
          aria-label="คัดลอกพิกัดตำแหน่งแผนที่ไปยังคลิปบอร์ด"
        >
          {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      {/* MASTER GIANT SOS BUTTON (With 3-sec safety countdown & 3% gold rim) */}
      <div className="mb-5">
        {!isActivatingMasterSos ? (
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.SOS_PULSE);
              setIsActivatingMasterSos(true);
              setCountdown(3);
            }}
            type="button"
            className="w-full py-5 px-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 active:scale-98 text-white font-black text-2xl md:text-3xl tracking-wider shadow-[0_0_35px_rgba(239,68,68,0.45)] border-4 border-[#ffd700] flex items-center justify-center gap-3 transition cursor-pointer"
            aria-label="กดปุ่มฉุกเฉิน SOS ส่งสัญญาณขอความช่วยเหลือทันที"
          >
            <AlertOctagon className="w-9 h-9 animate-pulse text-[#ffd700]" />
            <span>กดฉุกเฉิน SOS ด่วน</span>
          </button>
        ) : (
          <div className="w-full p-5 rounded-3xl bg-red-700 border-4 border-white text-white flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="text-xl md:text-2xl font-black">
              กำลังส่งสัญญาณฉุกเฉินใน {countdown} วินาที...
            </div>
            <p className="text-sm text-red-100">ระบบจะโทรออก 1669 และส่งพิกัดตำแหน่งอัตโนมัติ</p>
            <button
              onClick={cancelMasterSos}
              type="button"
              className="py-3 px-8 rounded-2xl bg-white text-[#03081e] font-black text-lg shadow-xl active:scale-95 transition border-2 border-[#ffd700]"
              aria-label="แตะเพื่อยกเลิกการส่งสัญญาณฉุกเฉิน"
            >
              แตะที่นี่เพื่อยกเลิก
            </button>
          </div>
        )}
      </div>

      {/* EMERGENCY SERVICES QUICK-DIAL CARDS (1669, 191, 199, Emergency Contact) */}
      <div className="space-y-2">
        <div className="text-xs uppercase font-black tracking-wider text-[#93c5fd] px-1 flex items-center gap-1.5">
          <span>เลือกกดโทรฉุกเฉินโดยตรงพร้อมส่งพิกัด</span>
          <span className="text-[#ffd700] text-xs">✦</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Hospital / EMS (1669) */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              executeSosDispatch('1669', 'ผู้ป่วยฉุกเฉิน/บาดเจ็บ ต้องการรถพยาบาลด่วน');
            }}
            type="button"
            className="p-4 rounded-2xl bg-[#030a21] hover:bg-[#071536] active:scale-97 border-2 border-red-500/80 hover:border-red-400 text-left flex items-center gap-3.5 transition group shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            aria-label="โทรฉุกเฉิน 1669 โรงพยาบาลและกู้ชีพฉุกเฉิน"
          >
            <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition border border-[#ffd700]">
              <Ambulance className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-lg">โรงพยาบาล / กู้ชีพ</span>
                <span className="px-2 py-0.5 rounded-lg bg-red-950 border border-red-500 text-red-300 font-mono font-black text-sm">
                  1669
                </span>
              </div>
              <div className="text-xs text-[#93c5fd] mt-0.5">
                สถาบันการแพทย์ฉุกเฉินแห่งชาติ (EMS)
              </div>
            </div>
          </button>

          {/* 2. Police (191) */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              executeSosDispatch('191', 'เหตุด่วนเหตุร้าย ต้องการตำรวจสายตรวจด่วน');
            }}
            type="button"
            className="p-4 rounded-2xl bg-[#030a21] hover:bg-[#071536] active:scale-97 border-2 border-[#00e5ff]/70 hover:border-[#00e5ff] text-left flex items-center gap-3.5 transition group shadow-[0_0_15px_rgba(0,229,255,0.15)]"
            aria-label="โทรฉุกเฉิน 191 แจ้งเหตุด่วนเหตุร้าย ตำรวจสายตรวจ"
          >
            <div className="w-12 h-12 rounded-xl bg-[#0088cc] text-white flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition border border-[#ffd700]">
              <Shield className="w-6 h-6 text-[#e0f2fe]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-lg">สถานีตำรวจ / สายตรวจ</span>
                <span className="px-2 py-0.5 rounded-lg bg-[#0c2459] border border-[#00e5ff] text-[#00e5ff] font-mono font-black text-sm">
                  191
                </span>
              </div>
              <div className="text-xs text-[#93c5fd] mt-0.5">
                ศูนย์รับแจ้งเหตุด่วนเหตุร้าย
              </div>
            </div>
          </button>

          {/* 3. Fire / Rescue (199) */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              executeSosDispatch('199', 'เหตุอัคคีภัย เพลิงไหม้ หรือภัยพิบัติฉุกเฉิน');
            }}
            type="button"
            className="p-4 rounded-2xl bg-[#030a21] hover:bg-[#071536] active:scale-97 border-2 border-[#ffd700]/70 hover:border-[#ffd700] text-left flex items-center gap-3.5 transition group shadow-[0_0_15px_rgba(255,215,0,0.15)]"
            aria-label="โทรฉุกเฉิน 199 ดับเพลิงและกู้ภัย"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#03081e] flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition border border-[#ffd700]">
              <Flame className="w-6 h-6 text-[#03081e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-lg">ดับเพลิง / กู้ภัย</span>
                <span className="px-2 py-0.5 rounded-lg bg-[#0c2459] border border-[#ffd700] text-[#ffd700] font-mono font-black text-sm">
                  199
                </span>
              </div>
              <div className="text-xs text-[#93c5fd] mt-0.5">
                ป้องกันและบรรเทาสาธารณภัย
              </div>
            </div>
          </button>

          {/* 4. Family Emergency Contact */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              executeSosDispatch('contact', `ขอความช่วยเหลือด่วนจาก ${profile.emergencyContact.name}`);
            }}
            type="button"
            className="p-4 rounded-2xl bg-[#030a21] hover:bg-[#071536] active:scale-97 border-2 border-emerald-500/80 hover:border-emerald-400 text-left flex items-center gap-3.5 transition group shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            aria-label={`โทรหาผู้ติดต่อฉุกเฉิน ${profile.emergencyContact.name}`}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition border border-[#ffd700]">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-lg truncate">
                  {profile.emergencyContact.name}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-400 text-emerald-300 font-mono font-black text-xs">
                  {profile.emergencyContact.relationship}
                </span>
              </div>
              <div className="text-xs font-mono text-[#ffd700] mt-0.5 font-bold">
                โทร: {profile.emergencyContact.phone}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ACTIVE SOS STATUS BANNER (When SOS is dispatched) */}
      {activeAlertDetails && (
        <div className="mt-4 p-4 rounded-2xl bg-red-950 border-2 border-red-400 text-white space-y-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-black uppercase text-red-300">
                ส่งสัญญาณขอความช่วยเหลือแล้ว
              </div>
              <div className="text-lg font-black text-white">
                {activeAlertDetails.serviceName}
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-red-800 text-xs font-bold">
              ID: {activeAlertDetails.alertId}
            </span>
          </div>

          <p className="text-sm text-neutral-200">
            พิกัดแผนที่: {getGoogleMapsLink()}
          </p>

          {/* Quick share actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`tel:${activeAlertDetails.telNumber}`}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center gap-1.5 shadow"
            >
              <PhoneCall className="w-4 h-4" />
              โทร {activeAlertDetails.telNumber}
            </a>

            <a
              href={activeAlertDetails.smsIntentUrl}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm flex items-center gap-1.5 border border-neutral-700"
            >
              <Send className="w-4 h-4" />
              ส่ง SMS พิกัด
            </a>

            <a
              href={activeAlertDetails.whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              แชร์ WhatsApp/LINE
            </a>
          </div>
        </div>
      )}
    </section>
  );
};
