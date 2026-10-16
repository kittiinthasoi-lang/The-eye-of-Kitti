export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  impairmentLevel: 'total_blindness' | 'low_vision_severe' | 'low_vision_moderate';
  bloodType: string;
  congenitalDiseases: string;
  allergies: string;
  preferredLanguage: 'th' | 'en';
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  audioSpeed: number; // 0.8 - 1.5
  audioVolume: number; // 0 - 1
  hapticEnabled: boolean;
  highContrastMode: boolean;
  batterySaverCadence: 'fast' | 'balanced' | 'eco' | 'manual'; // 2.5s, 4s, 6s, or tap
}

export interface ObstacleItem {
  name: string;
  position: 'left' | 'center' | 'right';
  distance: string;
  risk: 'high' | 'medium' | 'low';
}

export interface VisionAnalysisResult {
  speechThai: string;
  speechEnglish?: string;
  urgency: 'danger' | 'warning' | 'safe' | 'info';
  direction: 'stop' | 'straight' | 'left' | 'right' | 'step_up' | 'step_down';
  distanceMeters?: number;
  pathStatus: 'clear' | 'partially_blocked' | 'blocked' | 'stairs_curb' | 'zebra_crossing';
  tactilePavingDetected?: boolean;
  obstacles: ObstacleItem[];
  vibratePattern?: number[];
  timestamp?: number;
}

export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  address?: string;
  timestamp: number | null;
  error?: string | null;
}
