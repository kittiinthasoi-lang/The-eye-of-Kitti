import React, { useState } from 'react';
import { User, Phone, HeartPulse, ShieldAlert, Volume2, Edit3, Check, X, Eye } from 'lucide-react';
import { UserProfile } from '../types/navigation';
import { speechEngine } from '../utils/audio';
import { triggerHaptic, HAPTIC_PATTERNS } from '../utils/haptics';

interface UserProfileCardProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ profile, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(profile);

  const readProfileAloud = () => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    const impairmentText =
      profile.impairmentLevel === 'total_blindness'
        ? 'ตาบอดสนิท'
        : profile.impairmentLevel === 'low_vision_severe'
        ? 'สายตาเลือนรางมาก'
        : 'สายตาเลือนรางปานกลาง';

    const text = `โปรไฟล์ผู้ใช้: คุณ ${profile.fullName}, สถานะสายตา: ${impairmentText}, กรุ๊ปเลือด ${profile.bloodType}, ผู้ติดต่อฉุกเฉินคือคุณ ${profile.emergencyContact.name} ความสัมพันธ์ ${profile.emergencyContact.relationship} เบอร์โทร ${profile.emergencyContact.phone.split('').join(' ')}`;
    speechEngine.speak(text, { urgent: true });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
    triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
    speechEngine.speak('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว', { urgent: true });
  };

  const getImpairmentLabel = (level: string) => {
    switch (level) {
      case 'total_blindness':
        return 'ตาบอดสนิท (Total Blindness)';
      case 'low_vision_severe':
        return 'สายตาเลือนรางมาก (Severe Low Vision)';
      case 'low_vision_moderate':
        return 'สายตาเลือนรางปานกลาง (Moderate Low Vision)';
      default:
        return 'ผู้พิการทางการมองเห็น';
    }
  };

  return (
    <section
      aria-label="โปรไฟล์ผู้ใช้งานและข้อมูลฉุกเฉินเบื้องต้น"
      className="bg-[#071536] border-2 border-[#00e5ff] rounded-3xl p-5 md:p-6 shadow-[0_4px_30px_rgba(0,229,255,0.2)] relative overflow-hidden"
    >
      {/* Visual Accent Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#0f2d6b]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d2ff] to-[#0088cc] text-[#03081e] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)] border border-[#ffd700]">
            <User className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl md:text-2xl font-black text-[#00e5ff] tracking-wide drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                {profile.fullName}
              </h2>
              <span className="text-[#ffd700] text-xs">✦</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#93c5fd] text-sm font-medium">
              <Eye className="w-4 h-4 text-[#ffd700]" aria-hidden="true" />
              <span className="text-[#bae6fd]">{getImpairmentLabel(profile.impairmentLevel)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Read aloud button */}
          <button
            onClick={readProfileAloud}
            type="button"
            className="p-3 bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 active:scale-95 text-[#00e5ff] rounded-2xl border border-[#00e5ff]/50 transition flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.2)]"
            title="กดเพื่อฟังข้อมูลโปรไฟล์ด้วยเสียง"
            aria-label="กดเพื่อฟังข้อมูลโปรไฟล์ด้วยเสียง"
          >
            <Volume2 className="w-6 h-6" />
          </button>

          {/* Edit button */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              setIsEditing(true);
              speechEngine.speak('เปิดหน้าแก้ไขข้อมูลส่วนตัวและผู้ติดต่อฉุกเฉิน');
            }}
            type="button"
            className="p-3 bg-[#0c2459] hover:bg-[#103073] active:scale-95 text-[#e0f2fe] rounded-2xl border border-[#00e5ff]/30 transition flex items-center justify-center"
            title="แก้ไขข้อมูลส่วนตัว"
            aria-label="แก้ไขข้อมูลส่วนตัว"
          >
            <Edit3 className="w-6 h-6 text-[#93c5fd]" />
          </button>
        </div>
      </div>

      {/* Profile Details Grid (High contrast WCAG compliant) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4 text-base">
        {/* Emergency Contact */}
        <div className="bg-[#030a21] p-4 rounded-2xl border border-[#0f2d6b] flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-950/80 text-red-400 border border-red-800/40 mt-0.5">
            <Phone className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-[#93c5fd] font-bold">
              ผู้ติดต่อฉุกเฉิน (บุคคลใกล้ชิด)
            </div>
            <div className="text-white font-bold text-lg mt-0.5">
              {profile.emergencyContact.name} ({profile.emergencyContact.relationship})
            </div>
            <div className="text-[#ffd700] font-mono font-black text-base mt-0.5 drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
              {profile.emergencyContact.phone}
            </div>
          </div>
        </div>

        {/* Health & Medical notes */}
        <div className="bg-[#030a21] p-4 rounded-2xl border border-[#0f2d6b] flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 mt-0.5">
            <HeartPulse className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-[#93c5fd] font-bold">
              ข้อมูลทางการแพทย์ & กรุ๊ปเลือด
            </div>
            <div className="text-white font-bold text-lg mt-0.5 flex items-center gap-2">
              <span className="text-[#00e5ff] font-bold">กรุ๊ป {profile.bloodType}</span>
              {profile.congenitalDiseases && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#0c2459] text-[#bae6fd]">
                  {profile.congenitalDiseases}
                </span>
              )}
            </div>
            <div className="text-[#93c5fd] text-sm mt-0.5 line-clamp-1">
              แพ้ยา: {profile.allergies || 'ไม่มีข้อมูลการแพ้ยา'}
            </div>
          </div>
        </div>
      </div>

      {/* Editing Modal / Drawer */}
      {isEditing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="แก้ไขข้อมูลโปรไฟล์ผู้ใช้งาน"
          className="fixed inset-0 z-50 bg-[#03081e]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#071536] border-2 border-[#00e5ff] rounded-3xl w-full max-w-lg p-6 text-white shadow-[0_0_50px_rgba(0,229,255,0.35)] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#0f2d6b]">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                  แก้ไขข้อมูลส่วนตัว & ฉุกเฉิน
                </h3>
                <span className="text-[#ffd700]">✦</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 text-[#93c5fd] hover:text-white rounded-xl bg-[#0c2459]"
                aria-label="ปิดหน้าแก้ไข"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-left">
              <div>
                <label className="block text-sm font-bold text-[#93c5fd] mb-1">
                  ชื่อ-นามสกุล ของผู้ใช้งาน
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-[#00e5ff]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#93c5fd] mb-1">
                  เบอร์โทรศัพท์ของผู้ใช้งาน
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#00e5ff]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#93c5fd] mb-1">
                  ระดับความบกพร่องทางการมองเห็น
                </label>
                <select
                  value={formData.impairmentLevel}
                  onChange={(e: any) =>
                    setFormData({ ...formData, impairmentLevel: e.target.value })
                  }
                  className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-[#00e5ff]"
                >
                  <option value="total_blindness">ตาบอดสนิท (Total Blindness)</option>
                  <option value="low_vision_severe">สายตาเลือนรางมาก (Severe Low Vision)</option>
                  <option value="low_vision_moderate">สายตาเลือนรางปานกลาง (Moderate Low Vision)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#93c5fd] mb-1">กรุ๊ปเลือด</label>
                  <select
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#00e5ff]"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="O">O</option>
                    <option value="AB">AB</option>
                    <option value="ไม่ระบุ">ไม่ระบุ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#93c5fd] mb-1">โรคประจำตัว</label>
                  <input
                    type="text"
                    placeholder="เช่น ความดัน, หอบหืด"
                    value={formData.congenitalDiseases}
                    onChange={(e) =>
                      setFormData({ ...formData, congenitalDiseases: e.target.value })
                    }
                    className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e5ff]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#0f2d6b]">
                <div className="text-sm font-black text-[#ffd700] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span>ข้อมูลผู้ติดต่อฉุกเฉิน (จะได้รับพิกัดเมื่อกด SOS)</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#93c5fd] mb-1">
                      ชื่อ-นามสกุล บุคคลติดต่อฉุกเฉิน
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.emergencyContact.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            name: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00e5ff]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#93c5fd] mb-1">ความสัมพันธ์</label>
                      <input
                        type="text"
                        placeholder="เช่น มารดา, สามี, พี่สาว"
                        value={formData.emergencyContact.relationship}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: {
                              ...formData.emergencyContact,
                              relationship: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00e5ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#93c5fd] mb-1">เบอร์โทรติดต่อ</label>
                      <input
                        type="tel"
                        required
                        value={formData.emergencyContact.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: {
                              ...formData.emergencyContact,
                              phone: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-[#030a21] border border-[#0f2d6b] rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-[#00e5ff]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#0c2459] hover:bg-[#103073] text-[#93c5fd] font-bold transition text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00b4d8] to-[#00e5ff] text-[#03081e] font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] border-2 border-[#ffd700] transition active:scale-95"
                >
                  <Check className="w-5 h-5 text-[#03081e]" />
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
