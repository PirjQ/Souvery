import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase, type Profile } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthModal } from './AuthModal';

interface AuthButtonProps {
  user: User | null;
  onAuthChange: (user: User | null) => void;
}

export function AuthButton({ user, onAuthChange }: AuthButtonProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        onAuthChange(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [onAuthChange]);

  useEffect(() => {
    if (user) {
      loadProfile(user.id);
    }
  }, [user]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <UserIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {profile?.username || user.email}
          </span>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={() => setIsAuthModalOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </motion.div>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}