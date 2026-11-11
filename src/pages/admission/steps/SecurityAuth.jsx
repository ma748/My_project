import React, { useState, useRef, useCallback } from 'react';
import { Input } from '../../../components/Input';
import { Eye, EyeOff, ShieldCheck, Camera, RefreshCcw, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Webcam from 'react-webcam';
import EmailOtpVerification from '../../../components/EmailOtpVerification';

export default function SecurityAuth({ data, updateData }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const webcamRef = useRef(null);

  const captureFace = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    updateData('securityDetails', 'faceImageBase64', imageSrc);
    setIsCameraOpen(false);
    toast.success("Biometric Scan Captured!");
  }, [webcamRef, updateData]);

  const handleChange = (e) => {
    updateData('securityDetails', e.target.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  };

  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 8) score += 25;
    if (pass.match(/[A-Z]/)) score += 25;
    if (pass.match(/[0-9]/)) score += 25;
    if (pass.match(/[^A-Za-z0-9]/)) score += 25;
    return score;
  };

  const strength = calculateStrength(data.password);
  
  const getStrengthColor = () => {
    if (strength <= 25) return 'bg-red-500';
    if (strength <= 50) return 'bg-orange-500';
    if (strength <= 75) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="animate-fade-in pb-8">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">5</span> 
        Security & Authentication
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
        
        {/* Password Section */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Input 
              label="Create Secure Password *" 
              required 
              name="password" 
              type={showPassword ? "text" : "password"} 
              value={data.password || ''} 
              onChange={handleChange} 
              placeholder="Min 8 chars, 1 uppercase, 1 symbol" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-10 text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-1.5 -mt-2">
             <div className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${strength}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 text-right -mt-3">
            {strength === 100 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak'}
          </p>

          <Input 
            label="Confirm Password *" 
            required 
            name="confirmPassword" 
            type={showPassword ? "text" : "password"} 
            value={data.confirmPassword || ''} 
            onChange={handleChange} 
            placeholder="Re-enter password" 
          />
          {data.password && data.confirmPassword && data.password !== data.confirmPassword && (
            <p className="text-xs text-red-400 -mt-3">Passwords do not match!</p>
          )}
        </div>

        {/* Security Question Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Security Question *</label>
            <select 
              required 
              name="securityQuestion" 
              value={data.securityQuestion || ''} 
              onChange={handleChange} 
              className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select a question for account recovery</option>
              <option value="pet">What is the name of your first pet?</option>
              <option value="school">What was the name of your primary school?</option>
              <option value="city">In what city were you born?</option>
              <option value="mother_maiden">What is your mother's maiden name?</option>
            </select>
          </div>
          
          <Input 
            label="Security Answer *" 
            required 
            name="securityAnswer" 
            value={data.securityAnswer || ''} 
            onChange={handleChange} 
            placeholder="Your secret answer" 
          />
        </div>

        {/* Biometric Scan Section (Face Recognition) */}
        <div className="md:col-span-2 pt-4 border-t border-slate-700/50 mt-2">
          <h3 className="text-md font-medium text-slate-200 mb-4 flex items-center gap-2">
            <Camera className="text-blue-400" size={18} />
            Virtual Biometric Face Model
          </h3>
          
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 flex flex-col md:flex-row gap-6 items-center">
            
            <div className="w-full md:w-1/2 relative bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[200px] border-2 border-slate-700 border-dashed">
              {!isCameraOpen && !data.faceImageBase64 && (
                <div className="text-center p-6">
                  <Camera className="mx-auto text-slate-500 mb-2" size={32} />
                  <p className="text-sm text-slate-400">A virtual face image will be generated during registration</p>
                </div>
              )}

              {isCameraOpen && !data.faceImageBase64 && (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-auto object-cover"
                    videoConstraints={{ facingMode: "user" }}
                  />
                  {/* Cyberpunk Scan Overlay */}
                  <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none">
                     <div className="w-full h-1 bg-blue-500 shadow-[0_0_10px_2px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                  </div>
                </>
              )}

              {data.faceImageBase64 && (
                <img src={data.faceImageBase64} alt="Captured Biometric" className="w-full h-auto object-cover rounded" />
              )}
            </div>

            <div className="w-full md:w-1/2 flex flex-col gap-4">
              <p className="text-sm text-slate-300">
                A virtual face image and recognition embedding are generated automatically from your student identity when registration is submitted. No camera capture is required.
              </p>
              
              {!isCameraOpen && !data.faceImageBase64 && (
                <button 
                  type="button" 
                  onClick={() => setIsCameraOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors w-max"
                >
                  <Camera size={18} /> Preview Camera (Optional)
                </button>
              )}

              {isCameraOpen && !data.faceImageBase64 && (
                <button 
                  type="button" 
                  onClick={captureFace}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Capture Identity
                </button>
              )}

              {data.faceImageBase64 && (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded text-sm font-medium">
                    <Check size={16} /> Verified
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { updateData('securityDetails', 'faceImageBase64', null); setIsCameraOpen(true); }}
                    className="p-2 border border-slate-600 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                    title="Retake Photo"
                  >
                    <RefreshCcw size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OTP Verification Grid spanning full width */}
        <div className="md:col-span-2 pt-4 border-t border-slate-700/50 mt-2">
          <h3 className="text-md font-medium text-slate-200 mb-4 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={18} />
            Identity Verification
          </h3>
          
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <EmailOtpVerification
              email={data.emailForOtp || ''}
              onEmailChange={(val) => updateData('securityDetails', 'emailForOtp', val)}
              onVerified={() => {
                updateData('securityDetails', 'emailOtp', 'VERIFIED');
                toast.success("Email verified successfully!");
              }}
              title="Student Email Verification"
              description="Verify student email to confirm application."
            />
          </div>
        </div>

        <div className="md:col-span-2 mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
           <label className="flex items-start gap-3 cursor-pointer group">
             <div className="mt-1">
               <input 
                 type="checkbox" 
                 required
                 name="acceptedTerms" 
                 checked={data.acceptedTerms || false} 
                 onChange={handleChange} 
                 className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
               />
             </div>
             <div>
               <p className="text-sm font-medium text-emerald-100 group-hover:text-emerald-400 transition-colors">I accept the Terms & Conditions</p>
               <p className="text-xs text-slate-400 mt-1">I hereby declare that all information submitted by me in the application is strictly true, complete, and verifiable. I agree to the College Admission System guidelines and understand my application will be rejected if any data is falsified. Biological scan data (if provided) is encrypted and secured under standard data privacy laws.</p>
             </div>
           </label>
        </div>

      </div>
    </div>
  );
}
