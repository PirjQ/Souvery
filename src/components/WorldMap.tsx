import { useEffect, useRef, useState, useCallback  } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L, { Icon } from 'leaflet';
import { Slider } from '@/components/ui/slider';
import { Souvenir } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Play, Pause, MapPin, Navigation } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button'; // <--- ADD THIS LINE
import 'leaflet/dist/leaflet.css';

// Custom marker icons (no changes here)
const userLocationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#22d3ee" stroke="#111827" stroke-width="2"/>
      <circle cx="16" cy="16" r="4" fill="#111827"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const souvenirIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#fbbf24" stroke="#111827" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#111827"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});


interface WorldMapProps {
  souvenirs: Souvenir[];
  onMapClick: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  souvenirToHighlight?: Souvenir | null;
  onSouvenirHighlighted?: () => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ souvenirToHighlight, onSouvenirHighlighted }: {
  souvenirToHighlight: Souvenir | null;
  onSouvenirHighlighted?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (souvenirToHighlight) {
      map.flyTo(
        [Number(souvenirToHighlight.latitude), Number(souvenirToHighlight.longitude)],
        12,
        { duration: 2, easeLinearity: 0.1 }
      );

      const timeout = setTimeout(() => {
        onSouvenirHighlighted?.();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [souvenirToHighlight, map, onSouvenirHighlighted]);

  return null;
}

export function WorldMap({ souvenirs, onMapClick, selectedLocation, souvenirToHighlight, onSouvenirHighlighted }: WorldMapProps) {
  const mapRef = useRef<any>(null);
  const [selectedSouvenir, setSelectedSouvenir] = useState<Souvenir | null>(null);

  const [isSeeking, setIsSeeking] = useState(false);

  // --- NEW: A ref to hold the popup container element ---
  const popupRef = useRef<HTMLDivElement>(null);

  // --- NEW: Use a useCallback to attach the Leaflet event stopper ---
  const popupContainerRef = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      // This is the key: Use Leaflet's own utility to stop clicks
      L.DomEvent.disableClickPropagation(node);
    }
  }, []);
  
  const [audioState, setAudioState] = useState<{
    isPlaying: boolean;
    currentUrl: string | null;
    progress: number;
  }>({
    isPlaying: false,
    currentUrl: null,
    progress: 0,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      if (isSeeking) return;
      
      if (!audioElement.duration || !isFinite(audioElement.duration)) return;
      setAudioState(prev => ({
        ...prev,
        progress: (audioElement.currentTime / audioElement.duration) * 100,
      }));
    };

    const handleEnded = () => {
      setAudioState({ isPlaying: false, currentUrl: audioState.currentUrl, progress: 100 });
      setTimeout(() => {
         setAudioState({ isPlaying: false, currentUrl: null, progress: 0 });
      }, 300);
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioState.currentUrl, isSeeking]);

  // --- NEW: Handler for when the user drags the slider ---
  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !audioRef.current.duration) return;

    const newProgress = value[0];
    const newTime = (newProgress / 100) * audioRef.current.duration;

    // Update the audio's playback time
    audioRef.current.currentTime = newTime;

    // Also update the state to move the slider thumb immediately
    setAudioState(prev => ({ ...prev, progress: newProgress }));
  };

  const handlePlayToggle = (audioUrl: string) => {
    if (audioState.currentUrl !== audioUrl) {
      audioRef.current?.pause();
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;
      newAudio.play().catch(e => console.error("Audio play error:", e));
      setAudioState({ isPlaying: true, currentUrl: audioUrl, progress: 0 });
    } else {
      if (audioState.isPlaying) {
        audioRef.current?.pause();
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      } else {
        audioRef.current?.play().catch(e => console.error("Audio play error:", e));
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  useEffect(() => {
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[20, 0]}
        zoom={2}
        className="w-full h-full"
        style={{ background: '#111827' }}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapClickHandler onMapClick={onMapClick} />
        <MapController
          souvenirToHighlight={souvenirToHighlight}
          onSouvenirHighlighted={onSouvenirHighlighted}
        />

        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={userLocationIcon}>
            <Popup className="custom-popup">
              <div className="text-center p-2">
                <MapPin className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <p className="text-sm text-gray-700">Your story location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {souvenirs.map((souvenir) => (
          <Marker
            key={souvenir.id}
            position={[souvenir.latitude, souvenir.longitude]}
            icon={souvenirToHighlight?.id === souvenir.id ? userLocationIcon : souvenirIcon}
            eventHandlers={{
              click: () => setSelectedSouvenir(souvenir),
              popupclose: () => {
                if (audioRef.current && audioState.currentUrl === souvenir.audio_url) {
                  audioRef.current.pause();
                  setAudioState({ isPlaying: false, currentUrl: null, progress: 0 });
                }
              }
            }}
          >
            <Popup
              className="custom-popup"
              minWidth={300}
              autoPan={true}
              keepInView={true}
            >
              <div className="space-y-3 p-2" ref={popupContainerRef}>
                <div className="flex items-center gap-2">
                  <img
                    src={souvenir.image_url}
                    alt={souvenir.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{souvenir.title}</h3>
                    <p className="text-xs text-gray-600">
                      {new Date(souvenir.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    <span>Lat: {Number(souvenir.latitude).toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    <span>Lng: {Number(souvenir.longitude).toFixed(4)}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 line-clamp-3">
                  {souvenir.transcript_text}
                </p>

                <div className="flex items-center gap-3 w-full mt-2">
                  <Button
                      onClick={() => handlePlayToggle(souvenir.audio_url)}
                      size="icon"
                      className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
                  >
                      {audioState.isPlaying && audioState.currentUrl === souvenir.audio_url ? (
                          <Pause className="w-4 h-4 pointer-events-none" />
                      ) : (
                          <Play className="w-4 h-4 pointer-events-none" />
                      )}
                  </Button>
                  <div className="w-full">
                      <Slider
                        value={[audioState.currentUrl === souvenir.audio_url ? audioState.progress : 0]}
                        onValueChange={handleSeek}
                        onPointerDown={() => setIsSeeking(true)}
                        onPointerUp={() => setIsSeeking(false)}
                        max={100}
                        step={1}
                        className="w-full cursor-pointer"
                      />
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 inset-x-0 mx-auto w-fit z-[1000]"
      >
        <div className="bg-gray-900/90 backdrop-blur-sm border border-cyan-500/20 rounded-lg px-4 py-2">
          <p className="text-cyan-400 text-sm font-medium">
            Click anywhere on the map to place your memory
          </p>
        </div>
      </motion.div>
    </div>
  );
}