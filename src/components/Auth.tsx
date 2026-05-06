import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  ConfirmationResult,
  User
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Phone, ArrowRight, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Auth: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const [user, setUser] = useState<User | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'method' | 'phone' | 'code'>('method');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const syncUserProfile = async (u: User) => {
    const userRef = doc(db, 'users', u.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        // Create new profile
        await setDoc(userRef, {
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          phoneNumber: u.phoneNumber,
          createdAt: serverTimestamp(),
        });
      } else {
        // Sync existing profile
        await setDoc(userRef, {
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          phoneNumber: u.phoneNumber,
        }, { merge: true });
      }
    } catch (error) {
      console.error("Profile sync error:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
      toast.success('Successfully signed in with Google');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return (window as any).recaptchaVerifier;
    
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible'
    });
    (window as any).recaptchaVerifier = verifier;
    return verifier;
  };

  const handlePhoneSignIn = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setStep('code');
      toast.success('Verification code sent');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send verification code');
      // Reset reCAPTCHA if it failed
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        delete (window as any).recaptchaVerifier;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationResult?.confirm(verificationCode);
      if (result?.user) {
        await syncUserProfile(result.user);
      }
      toast.success('Successfully signed in with Phone');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
    toast.success('Signed out');
  };

  if (user) {
    return (
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 shadow-xl border-zinc-800' : 'bg-white shadow-lg border-zinc-100'} space-y-6`}>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500/20 shadow-inner">
            <UserIcon className="text-indigo-500" size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg">{user.displayName || user.phoneNumber || 'NOXA User'}</h3>
            <p className="text-zinc-500 text-sm">{user.email || 'Verified via Phone'}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className={`p-3 rounded-lg text-xs leading-relaxed ${theme === 'dark' ? 'bg-zinc-950 text-zinc-400 border border-zinc-800' : 'bg-zinc-50 text-zinc-600 border border-zinc-100'}`}>
            <p className="mb-2 uppercase font-bold tracking-widest text-[9px]">Account Security</p>
            You are currently signed in. Your history and settings are synced to this account.
          </div>
          <Button variant="outline" className="w-full gap-2 border-red-500/20 hover:bg-red-500/10 hover:text-red-500" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div id="recaptcha-container"></div>
      
      <div className={`${theme === 'dark' ? 'bg-zinc-900/40' : 'bg-white'} rounded-xl transition-all`}>
        <div className="p-1 space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <LogIn size={18} className="text-indigo-500" />
              Sign In
            </h3>
            <p className="text-xs text-zinc-500">Sync your projects across devices.</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'method' && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} className="text-red-500" />}
                  Continue with Google
                </Button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className={`${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} px-2 text-zinc-500`}>or</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12" 
                  onClick={() => setStep('phone')}
                  disabled={loading}
                >
                  <Phone size={18} className="text-green-500" />
                  Continue with Phone
                </Button>
              </motion.div>
            )}

            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+1234567890" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-[10px] text-zinc-500">Include country code (e.g., +1 for USA)</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep('method')} className="flex-1">Back</Button>
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2" 
                    onClick={handlePhoneSignIn}
                    disabled={loading || !phoneNumber}
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>Next <ArrowRight size={16} /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'code' && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input 
                    id="code" 
                    type="text" 
                    placeholder="123456" 
                    value={verificationCode} 
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="h-12 text-center tracking-[0.5em] text-lg font-bold"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep('phone')} className="flex-1">Back</Button>
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2" 
                    onClick={handleVerifyCode}
                    disabled={loading || !verificationCode}
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Code'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
