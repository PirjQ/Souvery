import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Souvenir } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Play, MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Custom marker icons
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
      // Animate to the souvenir location
      map.flyTo(
        [Number(souvenirToHighlight.latitude), Number(souvenirToHighlight.longitude)], 
        12, // zoom level
        {
          duration: 2, // animation duration in seconds
          easeLinearity: 0.1
        }
      );

      // Clear the highlight after animation
      const timeout = setTimeout(() => {
        onSouvenirHighlighted?.();
      }, 3000); // Clear after 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [souvenirToHighlight, map, onSouvenirHighlighted]);

  return null;
}

export function WorldMap({ souvenirs, onMapClick, selectedLocation, souvenirToHighlight, onSouvenirHighlighted }: WorldMapProps) {
  const mapRef = useRef<any>(null);
  const [selectedSouvenir, setSelectedSouvenir] = useState<Souvenir | null>(null);

  // Auto-select highlighted souvenir
  useEffect(() => {
    if (souvenirToHighlight) {
      setSelectedSouvenir(souvenirToHighlight);
    }
  }, [souvenirToHighlight]);

  useEffect(() => {
    // Fix for default markers not showing
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
    });
  };

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

        {/* User's selected location */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={userLocationIcon}
          >
            <Popup className="custom-popup">
              <div className="text-center p-2">
                <MapPin className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <p className="text-sm text-gray-700">Your story location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Existing souvenirs */}
        {souvenirs.map((souvenir) => (
          <Marker
            key={souvenir.id}
            position={[souvenir.latitude, souvenir.longitude]}
            icon={souvenirToHighlight?.id === souvenir.id ? userLocationIcon : souvenirIcon}
            eventHandlers={{
              click: () => setSelectedSouvenir(souvenir),
            }}
          >
            <Popup 
              className="custom-popup" 
              minWidth={300}
              autoPan={true}
              keepInView={true}
            >
              <div className="space-y-3 p-2">
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
                    <span>Lat: {Number(souvenir.latitude).toFixed(6)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    <span>Lng: {Number(souvenir.longitude).toFixed(6)}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-3">
                  {souvenir.transcript_text}
                </p>
                
                <button
                  onClick={() => playAudio(souvenir.audio_url)}
                  className="flex items-center gap-2 px-3 py-1 bg-cyan-500 text-white rounded-full text-sm hover:bg-cyan-600 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Play Story
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Instructions overlay */}
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