import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, type Souvenir } from '@/lib/supabase';
import { AuthButton } from '@/components/AuthButton';
import { WorldMap } from '@/components/WorldMap';
import { CreationModal } from '@/components/CreationModal';
import { SearchSouvenirBar } from '@/components/SearchSouvenirBar';
import { LoadingOrb } from '@/components/LoadingOrb';
import { Toaster } from '@/components/ui/sonner';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { toast } from 'sonner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [souvenirToHighlight, setSouvenirToHighlight] = useState<Souvenir | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Load souvenirs
    loadSouvenirs();
  }, []);

  const loadSouvenirs = async () => {
    try {
      const { data, error } = await supabase
        .from('souvenirs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSouvenirs(data || []);
    } catch (error) {
      console.error('Error loading souvenirs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!user) {
      alert('Please sign in to create a story souvenir');
      return;
    }
    
    setSelectedLocation({ lat, lng });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedLocation(null);
  };

  const handleSouvenirCreated = () => {
    loadSouvenirs();
    setSelectedLocation(null);
  };

  const handleSearch = async (latitude: number, longitude: number) => {
    // Find souvenir with matching coordinates (with small tolerance for floating point comparison)
    const tolerance = 0.0001; // Approximately 11 meters
    const foundSouvenir = souvenirs.find(souvenir => {
      const latDiff = Math.abs(Number(souvenir.latitude) - latitude);
      const lngDiff = Math.abs(Number(souvenir.longitude) - longitude);
      return latDiff <= tolerance && lngDiff <= tolerance;
    });

    if (foundSouvenir) {
      setSouvenirToHighlight(foundSouvenir);
      toast.success(`Found souvenir: "${foundSouvenir.title}"`);
    } else {
      toast.error('No souvenir found at these coordinates');
      setSouvenirToHighlight(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingOrb size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-gray-900/90 backdrop-blur-sm border-b border-cyan-500/20"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg">
              <Music className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-cyan-400">Story Souvenir</h1>
              <p className="text-xs text-gray-400">Decentralized Audio-Visual Storytelling</p>
            </div>
          </motion.div>

          <AuthButton user={user} onAuthChange={setUser} />
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative w-full h-[calc(100vh-80px)]">
        <WorldMap
          souvenirs={souvenirs}
          onMapClick={handleMapClick}
          selectedLocation={selectedLocation}
          souvenirToHighlight={souvenirToHighlight}
          onSouvenirHighlighted={() => setSouvenirToHighlight(null)}
        />

        {/* Statistics overlay */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-4 left-4 z-[1000]"
        >
          <div className="bg-gray-900/90 backdrop-blur-sm border border-cyan-500/20 rounded-lg px-4 py-3">
            <div className="text-cyan-400 text-sm font-medium">
              {souvenirs.length} Stories Discovered
            </div>
            <div className="text-gray-400 text-xs">
              Explore memories from around the world
            </div>
          </div>
        </motion.div>

        {/* Search Souvenir Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 inset-x-0 mx-auto w-fit z-[1000]"
        >
          <SearchSouvenirBar
            onSearch={handleSearch}
            disabled={loading}
          />
        </motion.div>
      </main>

      {/* Creation Modal */}
      {selectedLocation && (
        <CreationModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          latitude={selectedLocation.lat}
          longitude={selectedLocation.lng}
          onSouvenirCreated={handleSouvenirCreated}
        />
      )}

      <Toaster 
        theme="dark" 
        position="top-center"
        toastOptions={{
          style: {
            background: '#111827',
            border: '1px solid rgba(34, 211, 238, 0.2)',
            color: '#22d3ee',
          },
        }}
      />

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        
        .leaflet-popup-tip {
          background: white;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;