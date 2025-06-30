import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Mail, Lock, User, Chrome, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
    resetEmail: ''
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

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: '', password: '', username: '', confirmPassword: '', resetEmail: '' });
      setUsernameStatus({ checking: false, available: null, message: '' });
    }
  }, [isOpen, mode]);

  // Debounced username availability check
  useEffect(() => {
    if (mode === 'signup' && formData.username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        await checkUsernameAvailability(formData.username);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameStatus({ checking: false, available: null, message: '' });
    }
  }, [formData.username, mode]);

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

  async function handleEmailSignIn() {
  if (!formData.email || !formData.password) {
    toast.error('Please fill in all fields');
    return;
  }

  setLoading(true);
  try {
    // We remove 'data' from this initial sign-in attempt.
    let { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    // If email sign-in fails, try with username
    if (error && error.message.includes('Invalid login credentials')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', formData.email.toLowerCase())
        .single();

      if (profile) {
        // We only care about the 'error' from the second attempt.
        const result = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: formData.password,
        });
        // We re-assign 'error' but no longer need to handle 'data'.
        error = result.error;
      }
    }

    // This check now correctly handles errors from both sign-in attempts.
    if (error) throw error;

    // Upon success, no 'data' object is needed.
    toast.success('Successfully signed in!');
    onClose();
  } catch (error: any) {
    console.error('Sign in error:', error);
    toast.error(error.message || 'Failed to sign in');
  } finally {
    setLoading(false);
  }
};

  const handleEmailSignUp = async () => {
    if (!formData.email || !formData.password || !formData.username || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username.toLowerCase()
          }
        }
      });

      if (error) throw error;

      toast.success('Account created successfully! Please check your email to verify your account.');
      onClose();
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      setMode('signin');
      setFormData(prev => ({ ...prev, resetEmail: '' }));
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-cyan-500/20 text-white max-w-md z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl text-center">
            {mode === 'signin' ? 'Welcome Back' : 
             mode === 'signup' ? 'Create Account' : 
             'Reset Password'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {mode !== 'forgot-password' && (
            <>
              {/* Google Sign In */}
              <Button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium"
              >
                <Chrome className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>

              <div className="relative">
                <Separator className="bg-gray-700" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 px-2 text-gray-400 text-sm">
                  or
                </span>
              </div>
            </>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot-password' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-gray-300 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-cyan-400">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="resetEmail"
                    type="email"
                    value={formData.resetEmail}
                    onChange={(e) => handleInputChange('resetEmail', e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                onClick={handleForgotPassword}
                disabled={loading || !formData.resetEmail.trim()}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => setMode('signin')}
                  disabled={loading}
                  className="text-cyan-400 hover:text-cyan-300 text-sm underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* Sign In/Sign Up Forms */}
          {mode !== 'forgot-password' && (
            <>
              <div className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-cyan-400">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        placeholder="Choose a username"
                        className="pl-10 pr-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                        disabled={loading}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {getUsernameStatusIcon()}
                      </div>
                    </div>
                    {formData.username.length >= 3 && (
                      <p className={`text-xs ${
                        usernameStatus.available === true ? 'text-green-400' :
                        usernameStatus.available === false ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {usernameStatus.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-cyan-400">
                    {mode === 'signin' ? 'Email or Username' : 'Email'}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="text"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={mode === 'signin' ? 'Enter email or username' : 'Enter your email'}
                      className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-cyan-400">Password</Label>
                    {mode === 'signin' && (
                      <button
                        onClick={() => setMode('forgot-password')}
                        disabled={loading}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                      disabled={loading}
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-cyan-400">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm your password"
                        className="pl-10 bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp}
                  disabled={loading || (mode === 'signup' && !usernameStatus.available)}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : mode === 'signin' ? (
                    <LogIn className="w-4 h-4 mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </div>

              {/* Mode Toggle */}
              <div className="text-center">
                <button
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  disabled={loading}
                  className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                >
                  {mode === 'signin' 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
