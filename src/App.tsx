// src/App.tsx

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
import logo from '/logo-removebg-preview.png';
import boltBadge from '/bolt-badge-white.png';
import { toast } from 'sonner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [souvenirToHighlight, setSouvenirToHighlight] = useState<Souvenir | null>(null);
  const handleLocationVerified = (newCoords: { lat: number; lng: number }) => {
    setSelectedLocation(newCoords);
  };

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

  const handleSearch = async (latitude: number, longitude: number) => {
    const tolerance = 0.0001;
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
      {/* Bolt Badge */}
      <a
        href="https://bolt.new/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-20 right-4 z-[9998] transition-transform duration-300 hover:scale-105"
      >
        <img
          src={boltBadge}
          alt="Powered by Bolt.new"
          className="w-20 h-20 md:w-24 md:h-24"
        />
      </a>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-gray-900/90 backdrop-blur-sm border-b border-cyan-500/20"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 cursor-pointer">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <img src={logo} alt="Story Souvenir Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-cyan-400">Story Souvenir</h1>
                <p className="text-xs text-gray-400">Decentralized Audio-Visual Storytelling</p>
              </div>
            </motion.div>
          </a>
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
          onSouvenirCreated={() => {
            loadSouvenirs();
            setIsModalOpen(false);
            setSelectedLocation(null);
          }}
          onLocationVerified={handleLocationVerified}
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
    </div>
  );
}

export default App;
