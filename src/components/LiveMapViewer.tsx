import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass, Volume2, Shield, Ambulance, Eye } from 'lucide-react';
import { GeoLocationState } from '../types/navigation';
import { speechEngine } from '../utils/audio';
import { triggerHaptic, HAPTIC_PATTERNS } from '../utils/haptics';

interface LiveMapViewerProps {
  location: GeoLocationState;
  onRefreshLocation: () => void;
}

export const LiveMapViewer: React.FC<LiveMapViewerProps> = ({ location, onRefreshLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

  const defaultLat = location.latitude || 13.7563;
  const defaultLng = location.longitude || 100.5018;

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 16);

    // OpenStreetMap high readability tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Custom pulsing SVG icon for visually impaired user position (Neon Blue 27% + Neon Gold 3%)
    const userIcon = L.divIcon({
      className: 'user-location-pin',
      html: `
        <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; inset:0; border-radius:50%; background:rgba(0, 229, 255, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width:20px; height:20px; border-radius:50%; background:#00e5ff; border:3px solid #ffd700; box-shadow:0 0 15px rgba(0,229,255,0.8);"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([defaultLat, defaultLng], { icon: userIcon }).addTo(map);
    userMarkerRef.current = marker;

    const circle = L.circle([defaultLat, defaultLng], {
      radius: location.accuracy || 15,
      color: '#00e5ff',
      fillColor: '#00e5ff',
      fillOpacity: 0.12,
      weight: 1.5,
    }).addTo(map);
    accuracyCircleRef.current = circle;

    // Add nearby emergency points of interest (Bangkok/General mock nearby spots around user)
    const mockPOIs = [
      {
        name: 'โรงพยาบาลและศูนย์กู้ชีพ 1669',
        type: 'hospital',
        lat: defaultLat + 0.0035,
        lng: defaultLng + 0.002,
        distance: '420 เมตร',
      },
      {
        name: 'สถานีตำรวจนครบาล (191)',
        type: 'police',
        lat: defaultLat - 0.0028,
        lng: defaultLng - 0.003,
        distance: '380 เมตร',
      },
      {
        name: 'ทางข้ามม้าลาย + สัญญาณเสียงคนตาบอด',
        type: 'crossing',
        lat: defaultLat + 0.001,
        lng: defaultLng - 0.0012,
        distance: '110 เมตร',
      },
      {
        name: 'สถานีรถไฟฟ้า BTS ทางลาดและลิฟต์คนพิการ',
        type: 'transit',
        lat: defaultLat - 0.0015,
        lng: defaultLng + 0.0025,
        distance: '250 เมตร',
      },
    ];

    setNearbyPlaces(mockPOIs);

    mockPOIs.forEach((poi) => {
      const poiIcon = L.divIcon({
        className: 'poi-pin',
        html: `
          <div style="background:${
            poi.type === 'hospital' ? '#dc2626' : poi.type === 'police' ? '#2563eb' : '#059669'
          }; color:white; border-radius:8px; padding:4px 8px; font-weight:800; font-size:11px; white-space:nowrap; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.4);">
            ${poi.name.split(' ')[0]} (${poi.distance})
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
      });

      L.marker([poi.lat, poi.lng], { icon: poiIcon })
        .bindPopup(`<b>${poi.name}</b><br>ระยะทางโดยประมาณ: ${poi.distance}`)
        .addTo(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker position when location changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (location.latitude && location.longitude) {
      const newPos: [number, number] = [location.latitude, location.longitude];
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(newPos);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setRadius(location.accuracy || 15);
      }
      mapInstanceRef.current.panTo(newPos);
    }
  }, [location.latitude, location.longitude, location.accuracy]);

  const speakCurrentLocation = () => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    if (!location.latitude || !location.longitude) {
      speechEngine.speak('กำลังค้นหาสัญญาณดาวเทียม GPS โปรดรอสักครู่');
      return;
    }

    const text = `ตำแหน่งปัจจุบันของคุณ อยู่ที่ละติจูด ${location.latitude.toFixed(
      4
    )}, ลองจิจูด ${location.longitude.toFixed(4)}, ความแม่นยำประมาณ ${Math.round(
      location.accuracy || 10
    )} เมตร. มีทางข้ามม้าลายพร้อมสัญญาณเสียงอยู่ห่างไป 110 เมตร, โรงพยาบาลอยู่ห่าง 420 เมตร`;
    speechEngine.speak(text, { urgent: true });
  };

  return (
    <section
      aria-label="แผนที่ตำแหน่งปัจจุบันและสถานที่ใกล้เคียงสำหรับคนตาบอด"
      className="bg-[#071536] border-2 border-[#00e5ff] rounded-3xl p-5 md:p-6 shadow-[0_4px_30px_rgba(0,229,255,0.2)] relative"
    >
      <div className="flex items-center justify-between pb-4 border-b border-[#0f2d6b]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d2ff] to-[#0088cc] text-[#03081e] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)] border border-[#ffd700]">
            <Compass className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl md:text-2xl font-black text-[#00e5ff] tracking-wide drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                แผนที่นำทางคนเดินถนน
              </h2>
              <span className="text-[#ffd700] text-xs">✦</span>
            </div>
            <p className="text-[#93c5fd] text-sm font-medium">
              แสดงพิกัด GPS ตำแหน่งจุดข้ามถนน และสถานีฉุกเฉิน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Read aloud map info */}
          <button
            onClick={speakCurrentLocation}
            type="button"
            className="p-3 bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 active:scale-95 text-[#00e5ff] rounded-2xl border border-[#00e5ff]/50 transition shadow-[0_0_10px_rgba(0,229,255,0.2)]"
            title="ฟังข้อมูลพิกัดและสถานที่ใกล้เคียงด้วยเสียง"
            aria-label="ฟังเสียงข้อมูลพิกัดและสิ่งอำนวยความสะดวกใกล้เคียง"
          >
            <Volume2 className="w-6 h-6" />
          </button>

          {/* Re-center button */}
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.TAP);
              onRefreshLocation();
              if (mapInstanceRef.current && location.latitude && location.longitude) {
                mapInstanceRef.current.setView([location.latitude, location.longitude], 17);
              }
            }}
            type="button"
            className="p-3 bg-[#0c2459] hover:bg-[#103073] active:scale-95 text-[#00e5ff] rounded-2xl border border-[#00e5ff]/30 transition"
            title="ปรับพิกัดกึ่งกลาง"
            aria-label="ดึงพิกัดกึ่งกลางปัจจุบัน"
          >
            <Navigation className="w-6 h-6 text-[#00e5ff]" />
          </button>
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="mt-4 rounded-2xl overflow-hidden border-2 border-[#00e5ff]/60 relative h-64 md:h-80 bg-[#03081e] z-0 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating location readout overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-[#030a21]/95 backdrop-blur-md p-2.5 rounded-xl border border-[#00e5ff]/50 text-xs text-white flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-1.5 font-mono text-[#ffd700] font-bold truncate drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
            <MapPin className="w-4 h-4 text-[#ffd700] shrink-0" />
            <span>
              {location.latitude && location.longitude
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'กำลังระบุตำแหน่ง...'}
            </span>
          </div>
          <span className="text-[#93c5fd] shrink-0 font-medium">
            ความแม่นยำ ±{Math.round(location.accuracy || 10)}ม.
          </span>
        </div>
      </div>

      {/* Nearby accessibility spots list */}
      <div className="mt-4 space-y-2">
        <div className="text-xs uppercase font-bold text-[#93c5fd] tracking-wider flex items-center gap-1.5">
          <span>จุดอำนวยความสะดวกและจุดฉุกเฉินใกล้คุณ</span>
          <span className="text-[#ffd700] text-xs">✦</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {nearbyPlaces.map((poi, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#030a21] rounded-xl border border-[#0f2d6b] flex items-center justify-between hover:border-[#00e5ff]/40 transition"
            >
              <div className="flex items-center gap-2">
                {poi.type === 'hospital' ? (
                  <Ambulance className="w-4 h-4 text-red-400 shrink-0" />
                ) : poi.type === 'police' ? (
                  <Shield className="w-4 h-4 text-[#00e5ff] shrink-0" />
                ) : (
                  <Eye className="w-4 h-4 text-[#ffd700] shrink-0" />
                )}
                <span className="text-[#e0f2fe] font-medium truncate">{poi.name}</span>
              </div>
              <span className="font-mono text-[#00e5ff] font-bold text-xs shrink-0 ml-2 drop-shadow-[0_0_6px_rgba(0,229,255,0.4)]">
                {poi.distance}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
