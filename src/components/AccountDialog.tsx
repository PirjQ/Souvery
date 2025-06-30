import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, type Profile } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, CheckCircle, XCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile: Profile | null;
  onProfileUpdate: () => void;
}

export function AccountDialog({ isOpen, onClose, user, profile, onProfileUpdate }: AccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && profile) {
      setFormData(prev => ({
        ...prev,
        username: profile.username
      }));
    } else if (!isOpen) {
      setFormData({
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setUsernameStatus({ checking: false, available: null, message: '' });
    }
  }, [isOpen, profile]);

  // Debounced username availability check
  useEffect(() => {
    if (formData.username && formData.username !== profile?.username && formData.username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        await checkUsernameAvailability(formData.username);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (formData.username === profile?.username) {
      setUsernameStatus({ checking: false, available: true, message: 'Current username' });
    } else {
      setUsernameStatus({ checking: false, available: null, message: '' });
    }
  }, [formData.username, profile?.username]);

  const checkUsernameAvailability = async (username: string) => {
    setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-username`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.toLowerCase() }),
      });

      if (!response.ok) throw new Error('Failed to check username');

      const { available } = await response.json();
      
      setUsernameStatus({
        checking: false,
        available,
        message: available ? 'Username is available!' : 'Username is already taken'
      });
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus({
        checking: false,
        available: null,
        message: 'Error checking availability'
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUsernameUpdate = async () => {
    if (!formData.username || formData.username === profile?.username) {
      toast.error('Please enter a new username');
      return;
    }

    if (formData.username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    if (!usernameStatus.available) {
      toast.error('Please choose an available username');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: formData.username.toLowerCase() })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Username updated successfully!');
      onProfileUpdate();
      setFormData(prev => ({ ...prev, username: formData.username.toLowerCase() }));
    } catch (error: any) {
      console.error('Username update error:', error);
      toast.error(error.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: formData.currentPassword,
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (updateError) throw updateError;

      toast.success('Password updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const getUsernameStatusIcon = () => {
    if (usernameStatus.checking) {
      return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />;
    }
    if (usernameStatus.available === true) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (usernameStatus.available === false) {
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
    return null;
  };

  const isUsernameUpdateDisabled = () => {
    return loading || 
           !formData.username || 
           formData.username === profile?.username || 
           formData.username.length < 3 || 
           !usernameStatus.available;
  };

  const isPasswordUpdateDisabled = () => {
    return loading || 
           !formData.currentPassword || 
           !formData.newPassword || 
           !formData.confirmPassword ||
           formData.newPassword !== formData.confirmPassword ||
           formData.newPassword.length < 6;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-cyan-500/20 text-white max-w-md z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl text-center">
            Account Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="username" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="username" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-gray-900">
              <UserIcon className="w-4 h-4 mr-2" />
              Username
            </TabsTrigger>
            <TabsTrigger value="password" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-gray-900">
              <Lock className="w-4 h-4 mr-2" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="username" className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-300 text-sm">
                Change your username. This will be visible to other users.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-cyan-400">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter new username"
                  className="pl-10 pr-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {getUsernameStatusIcon()}
                </div>
              </div>
              {formData.username.length >= 3 && formData.username !== profile?.username && (
                <p className={`text-xs ${
                  usernameStatus.available === true ? 'text-green-400' :
                  usernameStatus.available === false ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {usernameStatus.message}
                </p>
              )}
              {formData.username === profile?.username && (
                <p className="text-xs text-gray-400">
                  This is your current username
                </p>
              )}
            </div>

            <Button
              onClick={handleUsernameUpdate}
              disabled={isUsernameUpdateDisabled()}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Updating...' : 'Update Username'}
            </Button>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-300 text-sm">
                Change your account password. You'll need to enter your current password.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-cyan-400">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                    className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-cyan-400">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                    className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                    disabled={loading}
                  />
                </div>
                {formData.newPassword && formData.newPassword.length < 6 && (
                  <p className="text-xs text-red-400">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-cyan-400">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                    disabled={loading}
                  />
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-400">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handlePasswordUpdate}
              disabled={isPasswordUpdateDisabled()}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}