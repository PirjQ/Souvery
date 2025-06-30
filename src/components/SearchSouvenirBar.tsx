import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchSouvenirBarProps {
  onSearch: (latitude: number, longitude: number) => void;
  disabled?: boolean;
}

export function SearchSouvenirBar({ onSearch, disabled }: SearchSouvenirBarProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Validate inputs
    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    if (lat < -90 || lat > 90) {
      return;
    }

    if (lng < -180 || lng > 180) {
      return;
    }

    setIsSearching(true);
    try {
      await onSearch(lat, lng);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const isValidInput = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4 shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">Search Souvenir</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div>
            <Input
              type="number"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Latitude"
              className="w-48 h-8 text-xs bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
              disabled={disabled || isSearching}
              step="any"
              min="-90"
              max="90"
            />
          </div>
          
          <div>
            <Input
              type="number"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Longitude"
              className="w-48 h-8 text-xs bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
              disabled={disabled || isSearching}
              step="any"
              min="-180"
              max="180"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={disabled || isSearching || !isValidInput()}
          size="sm"
          className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 h-8"
        >
          {isSearching ? (
            <div className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-3 h-3" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}