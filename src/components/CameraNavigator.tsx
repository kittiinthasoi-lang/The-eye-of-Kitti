import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Compass,
  Volume2,
  VolumeX,
  Battery,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  RefreshCw,
  Eye,
  Zap,
  Mic,
  MicOff,
  Navigation,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { VisionAnalysisResult, ObstacleItem } from '../types/navigation';
import { speechEngine, soundEngine } from '../utils/audio';
import { triggerHaptic, HAPTIC_PATTERNS } from '../utils/haptics';

interface CameraNavigatorProps {
  onClose: () => void;
  batteryCadence: 'fast' | 'balanced' | 'eco' | 'manual';
  onCadenceChange: (c: 'fast' | 'balanced' | 'eco' | 'manual') => void;
}

// Pre-packaged realistic street scenarios for instant testing or when camera is blocked/desktop
const REALISTIC_SIMULATION_SCENARIOS = [
  {
    id: 'sim-pole',
    title: 'ทางเท้า: เสาไฟฟ้าตรงกลาง + เบรลล์บล็อกขวา',
    description: 'จำลองสถานการณ์ทางเท้าไทย มีเสาไฟฟ้ากีดขวางในระยะ 1.5 เมตร',
    svgPrompt: 'obstacle-pole',
    mockResult: {
      speechThai: 'ระวังเสาไฟฟ้าตรงกลางทางเดินในระยะ 1.5 เมตร มีเบรลล์บล็อกเลี่ยงไปทางขวา',
      speechEnglish: 'Warning: Utility pole in center at 1.5 meters. Tactile paving leads to the right.',
      urgency: 'warning' as const,
      direction: 'right' as const,
      distanceMeters: 1.5,
      pathStatus: 'partially_blocked' as const,
      tactilePavingDetected: true,
      obstacles: [
        { name: 'เสาไฟฟ้าคอนกรีต', position: 'center' as const, distance: '1.5 เมตร', risk: 'high' as const },
        { name: 'บล็อกทางเดินคนตาบอด', position: 'right' as const, distance: '0.5 เมตร', risk: 'low' as const }
      ]
    }
  },
  {
    id: 'sim-bike',
    title: 'ทางเท้า: มอเตอร์ไซค์จอดขวาง + ทางแคบ',
    description: 'จำลองจักรยานยนต์จอดบนทางเท้า ขวางทางเดินตรงหน้า',
    svgPrompt: 'obstacle-bike',
    mockResult: {
      speechThai: 'หยุดก่อน! มีมอเตอร์ไซค์จอดขวางทางเท้าตรงหน้า 1 เมตร ให้เบี่ยงซ้ายก้าวช้าๆ',
      speechEnglish: 'Stop! Motorbike parked on walkway 1 meter ahead. Veer left slowly.',
      urgency: 'danger' as const,
      direction: 'left' as const,
      distanceMeters: 1.0,
      pathStatus: 'blocked' as const,
      tactilePavingDetected: false,
      obstacles: [
        { name: 'รถจักรยานยนต์จอดขวาง', position: 'center' as const, distance: '1.0 เมตร', risk: 'high' as const }
      ]
    }
  },
  {
    id: 'sim-stairs',
    title: 'สะพานลอย/ทางเชื่อม: บันไดลง 4 ขั้น',
    description: 'จำลองจุดต่างระดับ บันไดลงสะพานลอยหรือทางลาด',
    svgPrompt: 'obstacle-stairs',
    mockResult: {
      speechThai: 'ระวัง! ข้างหน้า 2 เมตรมีบันไดลง 4 ขั้น ก้าวอย่างระมัดระวัง มีราวจับด้านซ้าย',
      speechEnglish: 'Caution: 4 steps going down ahead in 2 meters. Handrail available on left.',
      urgency: 'warning' as const,
      direction: 'step_down' as const,
      distanceMeters: 2.0,
      pathStatus: 'stairs_curb' as const,
      tactilePavingDetected: true,
      obstacles: [
        { name: 'บันไดลง 4 ขั้น', position: 'center' as const, distance: '2.0 เมตร', risk: 'high' as const },
        { name: 'ราวจับสเตนเลส', position: 'left' as const, distance: '0.8 เมตร', risk: 'low' as const }
      ]
    }
  },
  {
    id: 'sim-zebra',
    title: 'ทางม้าลาย: ทางข้ามถนนปลอดภัย',
    description: 'จำลองทางม้าลายคนข้าม ถนนโล่ง สัญญาณไฟคนข้าม',
    svgPrompt: 'obstacle-zebra',
    mockResult: {
      speechThai: 'พบทางม้าลายตรงหน้า 1 เมตร ถนนโล่ง ไม่มีรถแล่นผ่าน สามารถเริ่มข้ามได้',
      speechEnglish: 'Zebra crossing ahead in 1 meter. Street is clear to cross.',
      urgency: 'safe' as const,
      direction: 'straight' as const,
      distanceMeters: 1.0,
      pathStatus: 'zebra_crossing' as const,
      tactilePavingDetected: true,
      obstacles: []
    }
  },
  {
    id: 'sim-clear',
    title: 'ทางเดินโล่ง: ทางเท้ามาตรฐาน มีเบรลล์บล็อก',
    description: 'ทางเท้าโล่ง ไม่มีสิ่งกีดขวางในระยะ 10 เมตร',
    svgPrompt: 'obstacle-clear',
    mockResult: {
      speechThai: 'ทางข้างหน้าโล่ง ปลอดภัยมาก มีเบรลล์บล็อกนำทางตรง เดินต่อไปได้เลย',
      speechEnglish: 'Path ahead is clear and safe. Tactile paving present. Continue straight.',
      urgency: 'safe' as const,
      direction: 'straight' as const,
      distanceMeters: 6.0,
      pathStatus: 'clear' as const,
      tactilePavingDetected: true,
      obstacles: []
    }
  }
];

export const CameraNavigator: React.FC<CameraNavigatorProps> = ({
  onClose,
  batteryCadence,
  onCadenceChange
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastAnalysis, setLastAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

  // Simulation mode switcher
  const [useSimulationMode, setUseSimulationMode] = useState<boolean>(false);
  const [selectedSimIndex, setSelectedSimIndex] = useState<number>(0);

  // Voice Query Recognition state
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceQueryText, setVoiceQueryText] = useState<string>('');

  // Cadence interval timer
  const analysisTimerRef = useRef<any>(null);

  // Cadence intervals in ms (Energy optimized - does NOT run every second)
  const getIntervalMs = useCallback(() => {
    switch (batteryCadence) {
      case 'fast':
        return 2800; // 2.8s: responsive walking
      case 'balanced':
        return 4000; // 4.0s: balanced battery & safety
      case 'eco':
        return 6000; // 6.0s: eco power saver for long commutes
      case 'manual':
        return null; // On-demand only (tap to scan)
    }
  }, [batteryCadence]);

  // Initial greeting
  useEffect(() => {
    speechEngine.speak(
      'เปิดโหมดนำทางด้วยกล้อง AI ระบบ The Eye of Kitti กำลังสแกนเส้นทางและสิ่งกีดขวาง',
      { urgent: true }
    );
    triggerHaptic(HAPTIC_PATTERNS.SUCCESS);

    return () => {
      speechEngine.stop();
      soundEngine.stopEmergencySiren();
    };
  }, []);

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('อุปกรณ์ไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      setVideoTrack(track);
      setStreamActive(true);
      setUseSimulationMode(false);
    } catch (err: any) {
      console.warn('Camera access unavailable, switching to real street simulation mode:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องหลังได้ (หรือใช้งานบนคอมพิวเตอร์)');
      setStreamActive(false);
      setUseSimulationMode(true);
    }
  };

  // Stop camera on unmount
  useEffect(() => {
    startCamera();

    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
      }
    };
  }, []);

  // Flashlight toggle
  const toggleFlashlight = async () => {
    if (!videoTrack) return;
    try {
      const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
      if (capabilities && capabilities.torch) {
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: !flashlightOn }],
        });
        setFlashlightOn(!flashlightOn);
        speechEngine.speak(!flashlightOn ? 'เปิดไฟฉายช่วยส่องทางแล้ว' : 'ปิดไฟฉายแล้ว');
      } else {
        speechEngine.speak('สมาร์ทโฟนนี้ไม่รองรับการควบคุมไฟฉายผ่านเบราว์เซอร์');
      }
    } catch {
      speechEngine.speak('ไม่สามารถเปิดไฟฉายได้');
    }
  };

  // Perform AI Frame Capture & Analysis
  const captureAndAnalyze = useCallback(async (customQuery?: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const startMs = Date.now();

    try {
      let imageBase64: string = '';

      if (useSimulationMode || !streamActive || !videoRef.current) {
        // Use simulation scenario frame or SVG generator
        const activeScenario = REALISTIC_SIMULATION_SCENARIOS[selectedSimIndex];
        // Generate an on-canvas simulation street frame for Gemini to analyze
        if (canvasRef.current) {
          const cvs = canvasRef.current;
          cvs.width = 640;
          cvs.height = 480;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            // Draw realistic street view simulation
            ctx.fillStyle = '#262626';
            ctx.fillRect(0, 0, 640, 480);
            // Sidewalk pavement
            ctx.fillStyle = '#404040';
            ctx.beginPath();
            ctx.moveTo(80, 480);
            ctx.lineTo(260, 240);
            ctx.lineTo(380, 240);
            ctx.lineTo(560, 480);
            ctx.fill();

            // Tactile yellow paving
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.moveTo(340, 480);
            ctx.lineTo(340, 240);
            ctx.lineTo(365, 240);
            ctx.lineTo(380, 480);
            ctx.fill();

            // Scenario obstacle drawing
            if (activeScenario.id === 'sim-pole') {
              ctx.fillStyle = '#737373';
              ctx.fillRect(290, 160, 45, 260); // concrete pole in center
              ctx.fillStyle = '#dc2626';
              ctx.font = 'bold 24px sans-serif';
              ctx.fillText('เสาไฟฟ้า 1.5ม.', 250, 150);
            } else if (activeScenario.id === 'sim-bike') {
              ctx.fillStyle = '#3b82f6';
              ctx.fillRect(240, 280, 140, 90); // parked motorbike
              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 24px sans-serif';
              ctx.fillText('มอเตอร์ไซค์ขวางทาง 1ม.', 200, 260);
            } else if (activeScenario.id === 'sim-stairs') {
              ctx.fillStyle = '#525252';
              for (let i = 0; i < 4; i++) {
                ctx.fillRect(180 + i * 15, 340 + i * 25, 260 - i * 30, 20);
              }
              ctx.fillStyle = '#f59e0b';
              ctx.font = 'bold 24px sans-serif';
              ctx.fillText('บันไดลง 4 ขั้น 2ม.', 230, 320);
            } else if (activeScenario.id === 'sim-zebra') {
              ctx.fillStyle = '#ffffff';
              for (let i = 0; i < 6; i++) {
                ctx.fillRect(120 + i * 70, 360, 40, 90);
              }
              ctx.fillStyle = '#10b981';
              ctx.font = 'bold 24px sans-serif';
              ctx.fillText('ทางม้าลายปลอดภัย', 230, 330);
            }

            imageBase64 = cvs.toDataURL('image/jpeg', 0.65);
          }
        }
      } else if (videoRef.current && canvasRef.current) {
        // Real camera snapshot downscaled to 640x480 for fast battery-saving transmission
        const cvs = canvasRef.current;
        cvs.width = 640;
        cvs.height = 480;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          imageBase64 = cvs.toDataURL('image/jpeg', 0.65);
        }
      }

      // Call server-side API with Gemini 3.8 Flash
      const res = await fetch('/api/navigation/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mode: batteryCadence,
          userQuery: customQuery || voiceQueryText || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Analysis server error');
      }

      const data: VisionAnalysisResult = await res.json();
      data.timestamp = Date.now();
      setLastAnalysis(data);
      setLastAnalysisTime(Date.now());

      // Trigger multi-sensory feedback based on urgency
      if (!isAudioMuted && data.speechThai) {
        speechEngine.speak(data.speechThai, { urgent: data.urgency === 'danger' });
      }

      // Audio spatial sonar & haptic
      if (data.urgency === 'danger') {
        soundEngine.playDangerChirp();
        triggerHaptic(HAPTIC_PATTERNS.DANGER);
      } else if (data.urgency === 'warning') {
        const firstObstacle = data.obstacles[0];
        soundEngine.playSpatialSonar(
          firstObstacle?.position || 'center',
          data.distanceMeters || 2.0
        );
        triggerHaptic(HAPTIC_PATTERNS.WARNING);
      } else if (data.tactilePavingDetected) {
        soundEngine.playTactileChime();
        triggerHaptic(HAPTIC_PATTERNS.TACTILE_BLOCK);
      } else {
        triggerHaptic(HAPTIC_PATTERNS.TAP);
      }
    } catch (err) {
      console.error('Vision analysis error:', err);
      // Fallback to active scenario result if network glitch
      if (useSimulationMode) {
        const scenario = REALISTIC_SIMULATION_SCENARIOS[selectedSimIndex];
        setLastAnalysis(scenario.mockResult);
        if (!isAudioMuted) {
          speechEngine.speak(scenario.mockResult.speechThai, { urgent: true });
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    isAnalyzing,
    useSimulationMode,
    streamActive,
    selectedSimIndex,
    batteryCadence,
    voiceQueryText,
    isAudioMuted,
  ]);

  // Set up cadence interval (Smart timer - prevents draining battery)
  useEffect(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    const interval = getIntervalMs();
    if (interval !== null) {
      // Run once shortly after mount
      const initialTimeout = setTimeout(() => {
        captureAndAnalyze();
      }, 700);

      analysisTimerRef.current = setInterval(() => {
        captureAndAnalyze();
      }, interval);

      return () => {
        clearTimeout(initialTimeout);
        if (analysisTimerRef.current) {
          clearInterval(analysisTimerRef.current);
        }
      };
    }
  }, [batteryCadence, getIntervalMs, captureAndAnalyze]);

  // Voice Command Recognition (Web Speech Recognition)
  const toggleVoiceCommand = () => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speechEngine.speak('เบราว์เซอร์นี้ยังไม่รองรับการรับเสียงคำสั่ง กรุณากดปุ่มสแกนโดยตรง');
      captureAndAnalyze('ข้างหน้ามีอะไรบ้าง มีสิ่งกีดขวางหรือไม่');
      return;
    }

    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        speechEngine.speak('กำลังฟังคำสั่งเสียงของคุณ พูดได้เลย');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceQueryText(transcript);
        setIsListeningVoice(false);
        speechEngine.speak(`รับคำสั่ง: ${transcript}`);
        captureAndAnalyze(transcript);
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
        speechEngine.speak('ไม่ได้รับยินเสียงชัดเจน กำลังสแกนสิ่งกีดขวางปกติ');
        captureAndAnalyze();
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch {
      setIsListeningVoice(false);
      captureAndAnalyze();
    }
  };

  // Get color styles for urgency status
  const getUrgencyBadge = () => {
    if (!lastAnalysis) return null;
    switch (lastAnalysis.urgency) {
      case 'danger':
        return {
          bg: 'bg-red-600',
          text: 'text-white',
          border: 'border-red-400',
          icon: AlertTriangle,
          label: 'อันตราย! หยุดหรือเลี่ยงทันที',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500',
          text: 'text-neutral-950',
          border: 'border-amber-300',
          icon: AlertTriangle,
          label: 'เตือน: มีสิ่งกีดขวางข้างหน้า',
        };
      case 'safe':
        return {
          bg: 'bg-emerald-600',
          text: 'text-white',
          border: 'border-emerald-300',
          icon: ShieldCheck,
          label: 'เส้นทางปลอดภัย เดินตรงไปได้',
        };
      default:
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          border: 'border-blue-300',
          icon: Sparkles,
          label: 'ข้อมูลเส้นทาง',
        };
    }
  };

  const badge = getUrgencyBadge();

  return (
    <div
      role="region"
      aria-label="หน้าจอนำทางจากกล้อง AI แบบเรียลไทม์ The Eye of Kitti"
      className="fixed inset-0 z-50 bg-black flex flex-col text-white select-none overflow-hidden"
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP BAR: Accessibility Controls & Battery Cadence */}
      <header className="bg-[#071536]/95 backdrop-blur-md border-b-2 border-[#00e5ff] p-3 md:p-4 flex items-center justify-between z-20 shadow-[0_4px_20px_rgba(0,229,255,0.2)]">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              speechEngine.speak('ออกจากโหมดนำทางกล้อง');
              onClose();
            }}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0c2459] hover:bg-[#103073] active:scale-95 text-[#00e5ff] font-black border border-[#00e5ff]/40"
            aria-label="กลับหน้าหลัก"
          >
            <ChevronLeft className="w-6 h-6 text-[#00e5ff]" />
            <span className="text-base hidden sm:inline">หน้าหลัก</span>
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#03081e] border border-[#00e5ff]/50">
            <div className="w-6 h-6 rounded-lg overflow-hidden border border-[#ffd700] shrink-0">
              <img
                src="/logo.jpg"
                alt="The Eye of Kitti Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-black text-[#00e5ff] text-sm md:text-base tracking-wide drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              The Eye of Kitti
            </span>
            <span className="text-[#ffd700] text-xs">✦</span>
          </div>
        </div>

        {/* Battery cadence modes & Sound control */}
        <div className="flex items-center gap-2">
          {/* Battery Saver Cadence Selector */}
          <div className="flex items-center bg-neutral-950 rounded-xl p-1 border border-neutral-800">
            <button
              onClick={() => {
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                onCadenceChange('eco');
                speechEngine.speak('เปลี่ยนเป็นโหมดประหยัดแบตเตอรี่ สแกนทุก 6 วินาที');
              }}
              title="โหมดประหยัดพลังงาน (ทุก 6 วินาที)"
              aria-label="โหมดประหยัดพลังงาน แบตเตอรี่อยู่ได้นาน สแกนทุก 6 วินาที"
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                batteryCadence === 'eco'
                  ? 'bg-emerald-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ประหยัด (6วิ)
            </button>
            <button
              onClick={() => {
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                onCadenceChange('balanced');
                speechEngine.speak('เปลี่ยนเป็นโหมดสมดุล สแกนทุก 4 วินาที');
              }}
              title="โหมดสมดุล (ทุก 4 วินาที)"
              aria-label="โหมดสมดุล สแกนทุก 4 วินาที"
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                batteryCadence === 'balanced'
                  ? 'bg-amber-400 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              สมดุล (4วิ)
            </button>
            <button
              onClick={() => {
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                onCadenceChange('manual');
                speechEngine.speak('เปลี่ยนเป็นโหมดกดสแกนด้วยตนเองเมื่อต้องการ ประหยัดแบตเตอรี่สูงสุด');
              }}
              title="โหมดกดสแกนเอง (ประหยัดแบตเตอรี่สูงสุด)"
              aria-label="โหมดกดสแกนด้วยตนเองเมื่อต้องการ"
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                batteryCadence === 'manual'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              กดเอง
            </button>
          </div>

          {/* Flashlight toggle */}
          {videoTrack && (
            <button
              onClick={toggleFlashlight}
              type="button"
              className={`p-2.5 rounded-xl border transition ${
                flashlightOn
                  ? 'bg-yellow-400 text-black border-yellow-300'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
              title="เปิด/ปิด ไฟฉายช่วยมองกลางคืน"
              aria-label={flashlightOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉายช่วยส่องทาง'}
            >
              <Zap className="w-5 h-5" />
            </button>
          )}

          {/* Mute Voice Toggle */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              const nextMuted = !isAudioMuted;
              setIsAudioMuted(nextMuted);
              if (nextMuted) speechEngine.stop();
              else speechEngine.speak('เปิดเสียงนำทางแล้ว');
            }}
            type="button"
            className={`p-2.5 rounded-xl border transition ${
              isAudioMuted
                ? 'bg-red-950/80 text-red-300 border-red-700'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
            }`}
            title="เปิด/ปิด เสียงบรรยาย"
            aria-label={isAudioMuted ? 'เปิดเสียงบรรยายนำทาง' : 'ปิดเสียงบรรยายนำทาง'}
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT: Camera Video Feed or High-Fidelity Street Simulation */}
      <main className="relative flex-1 bg-neutral-950 flex items-center justify-center overflow-hidden">
        {/* Real Camera Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${
            useSimulationMode ? 'hidden' : 'block'
          }`}
        />

        {/* Street Simulation Canvas / Display when camera unavailable or simulation selected */}
        {useSimulationMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-4">
            <div className="relative w-full max-w-lg aspect-video rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl bg-neutral-950 flex flex-col items-center justify-center">
              {/* Graphic representation of scenario */}
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center border-2 border-amber-400">
                  <Navigation className="w-8 h-8 animate-bounce" />
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {REALISTIC_SIMULATION_SCENARIOS[selectedSimIndex].title}
                </div>
                <p className="text-neutral-300 text-sm max-w-sm">
                  {REALISTIC_SIMULATION_SCENARIOS[selectedSimIndex].description}
                </p>
                <div className="inline-block px-3 py-1 bg-neutral-800 rounded-full text-xs text-neutral-400 font-mono">
                  [โหมดจำลองถนนคนเดินจริง - เหมาะสำหรับทดสอบ AI]
                </div>
              </div>
            </div>

            {/* Scenario Selector Pills */}
            <div className="w-full max-w-lg mt-3 overflow-x-auto pb-2 flex gap-2">
              {REALISTIC_SIMULATION_SCENARIOS.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedSimIndex(idx);
                    triggerHaptic(HAPTIC_PATTERNS.TAP);
                    speechEngine.speak(`เลือกสถานการณ์: ${sc.title}`);
                    setTimeout(() => captureAndAnalyze(), 300);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedSimIndex === idx
                      ? 'bg-amber-400 text-neutral-950 shadow-lg'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {sc.title.split(':')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visual Target Reticle / Accessibility Crosshairs for partial sight & low vision */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-4 border-amber-400/50 rounded-3xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-neutral-950 text-xs font-black px-2 py-0.5 rounded">
              ระยะสายตา AI
            </div>
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-amber-400"></div>
              <div className="h-6 w-0.5 bg-amber-400 absolute"></div>
            </div>
          </div>
        </div>

        {/* Camera Switcher to Simulation Mode Banner (If camera permission issues) */}
        {cameraError && !useSimulationMode && (
          <div className="absolute top-4 left-4 right-4 z-30 bg-neutral-900/90 border-2 border-amber-400 p-4 rounded-2xl text-center">
            <p className="text-amber-300 font-bold mb-2">{cameraError}</p>
            <button
              onClick={() => setUseSimulationMode(true)}
              className="px-4 py-2 bg-amber-400 text-neutral-950 font-black rounded-xl text-sm"
            >
              สลับเป็นโหมดจำลองถนนคนเดินจริงเพื่อทดสอบ AI
            </button>
          </div>
        )}

        {/* TOP OVERLAY: Big Accessible Speech Banner (WCAG High Contrast Banner) */}
        <div className="absolute top-4 left-3 right-3 z-20">
          {badge && (
            <div
              className={`${badge.bg} ${badge.text} border-2 ${badge.border} p-4 rounded-3xl shadow-2xl flex items-start gap-3.5 animate-in slide-in-from-top-4`}
            >
              <badge.icon className="w-8 h-8 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-xs uppercase font-black tracking-wider opacity-90">
                  {badge.label}
                </div>
                <div className="text-xl md:text-2xl font-black mt-0.5 leading-snug">
                  {lastAnalysis?.speechThai || 'ระบบกำลังตรวจสอบสภาพถนน...'}
                </div>
                {lastAnalysis?.obstacles && lastAnalysis.obstacles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lastAnalysis.obstacles.map((obs, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-black/40 text-white border border-white/20"
                      >
                        {obs.name} ({obs.position === 'center' ? 'ตรงกลาง' : obs.position === 'left' ? 'ด้านซ้าย' : 'ด้านขวา'} {obs.distance})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Analysis spinner watermark */}
        {isAnalyzing && (
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 bg-neutral-900/90 text-amber-400 px-4 py-2 rounded-full border border-amber-400 flex items-center gap-2 shadow-xl">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-black">AI กำลังวิเคราะห์ภาพ...</span>
          </div>
        )}
      </main>

      {/* BOTTOM CONTROLS: Oversized Accessible Tap Zones for Visually Impaired Users */}
      <footer className="bg-[#071536] border-t-2 border-[#00e5ff] p-4 z-20 flex flex-col gap-3 shadow-[0_-4px_30px_rgba(0,229,255,0.2)]">
        {/* Real-time Voice readout indicator */}
        <div className="flex items-center justify-between text-xs text-[#93c5fd] font-bold px-1">
          <div className="flex items-center gap-1.5">
            <Battery className="w-4 h-4 text-[#00e5ff]" />
            <span>
              {batteryCadence === 'eco'
                ? 'ประหยัดแบตเตอรี่ (สแกนอัตโนมัติทุก 6 วิ)'
                : batteryCadence === 'balanced'
                ? 'สมดุล (สแกนอัตโนมัติทุก 4 วิ)'
                : batteryCadence === 'fast'
                ? 'ตรวจจับเร่งด่วน (2.8 วิ)'
                : 'กดสแกนเมื่อต้องการ (ประหยัดพลังงานสูงสุด)'}
            </span>
          </div>

          {lastAnalysisTime && (
            <span className="font-mono text-[#ffd700] font-bold">
              อัปเดตล่าสุด {new Date(lastAnalysisTime).toLocaleTimeString('th-TH')}
            </span>
          )}
        </div>

        {/* Giant Accessible Touch Controls Grid */}
        <div className="grid grid-cols-4 gap-3">
          {/* 1. Speech Re-read button */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              if (lastAnalysis?.speechThai) {
                speechEngine.speak(lastAnalysis.speechThai, { urgent: true });
              } else {
                speechEngine.speak('ยังไม่มีข้อมูลการวิเคราะห์ล่าสุด กำลังสแกน');
                captureAndAnalyze();
              }
            }}
            type="button"
            className="col-span-1 py-4 bg-[#0c2459] hover:bg-[#103073] active:scale-95 text-[#00e5ff] rounded-2xl border-2 border-[#00e5ff]/50 flex flex-col items-center justify-center gap-1 transition shadow-[0_0_15px_rgba(0,229,255,0.15)]"
            aria-label="ฟังเสียงคำแนะนำซ้ำอีกครั้ง"
          >
            <Volume2 className="w-7 h-7 text-[#00e5ff]" />
            <span className="text-xs font-bold text-[#e0f2fe]">ฟังซ้ำ</span>
          </button>

          {/* 2. Instant Scan (Giant Core Action Button - Neon Blue 27% + Gold 3%) */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              speechEngine.speak('กำลังถ่ายภาพและวิเคราะห์ทันที');
              captureAndAnalyze();
            }}
            disabled={isAnalyzing}
            type="button"
            className="col-span-2 py-4 bg-gradient-to-r from-[#00b4d8] via-[#00e5ff] to-[#38bdf8] hover:brightness-110 active:scale-95 text-[#03081e] font-black rounded-2xl flex items-center justify-center gap-2.5 transition shadow-[0_0_35px_rgba(0,229,255,0.5)] border-4 border-[#ffd700]"
            aria-label="กดเพื่อสแกนสิ่งกีดขวางทันที"
          >
            <Camera className={`w-8 h-8 text-[#03081e] ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="text-xl md:text-2xl font-black text-[#03081e]">
              {isAnalyzing ? 'กำลังสแกน...' : 'สแกนเส้นทาง'}
            </span>
          </button>

          {/* 3. Voice Query / Hands-free speech */}
          <button
            onClick={toggleVoiceCommand}
            type="button"
            className={`col-span-1 py-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition shadow-lg active:scale-95 ${
              isListeningVoice
                ? 'bg-red-600 text-white border-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                : 'bg-[#0c2459] hover:bg-[#103073] text-[#00e5ff] border-[#00e5ff]/50 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
            }`}
            aria-label="พูดคำสั่งเสียงสอบถามสิ่งกีดขวาง เช่น ข้างหน้ามีอะไร"
          >
            {isListeningVoice ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7 text-[#ffd700]" />}
            <span className="text-xs font-bold text-[#e0f2fe]">{isListeningVoice ? 'กำลังฟัง' : 'สั่งด้วยเสียง'}</span>
          </button>
        </div>

        {/* Camera / Simulation Switcher bar */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              const nextMode = !useSimulationMode;
              setUseSimulationMode(nextMode);
              if (nextMode) {
                speechEngine.speak('เปิดโหมดจำลองถนนและสิ่งกีดขวางสำหรับทดสอบ');
              } else {
                speechEngine.speak('สลับเป็นโหมดกล้องถ่ายทอดสด');
                startCamera();
              }
            }}
            className="text-xs text-amber-400/90 underline font-semibold hover:text-amber-300 p-1"
          >
            {useSimulationMode ? '← สลับไปใช้กล้องจริงของเครื่อง' : 'สลับไปทดสอบสถานการณ์ถนนจำลอง (5 รูปแบบ)'}
          </button>

          <span className="text-xs text-neutral-400">
            ระบบปัญญาประดิษฐ์ The Eye of Kitti
          </span>
        </div>
      </footer>
    </div>
  );
};
