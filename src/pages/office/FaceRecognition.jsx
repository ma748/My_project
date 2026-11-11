import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, Search, UserCheck, ShieldAlert, CheckCircle, RefreshCw, User } from 'lucide-react';
import { buildBiometricIdentifyPayload } from '../../utils/biometricIdentify';

export default function FaceRecognition() {
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Webcam & Capture states
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [virtualSeed, setVirtualSeed] = useState('');
  const [mode, setMode] = useState('register'); // 'register' | 'identify'
  
  // Identification results
  const [identifiedStudent, setIdentifiedStudent] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [expression, setExpression] = useState(null);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Face registration is available as soon as a student record exists.
      setStudents(res.data);

      if (location.state?.studentId || location.state?.cetNumber) {
        const found = res.data.find(s => s._id === location.state?.studentId || s.personalDetails.cetNumber === location.state?.cetNumber);
        if (found) {
          setSelectedStudent(found);
          toast.success(`Pre-selected: ${found.personalDetails.studentName}`);
        }
      }
    } catch {
      toast.error('Failed to fetch students list');
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'Camera access is unavailable. Open this page over HTTPS or localhost in a supported browser.';
      setCameraError(message);
      toast.error(message);
      return;
    }

    try {
      stopCamera();
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Camera preview is not ready. Please try again.');
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setStreamActive(true);
    } catch (err) {
      stopCamera();
      const messages = {
        NotAllowedError: 'Camera permission was denied. Allow camera access in Chrome site settings, then try again.',
        SecurityError: 'Camera access requires a secure page (HTTPS or localhost).',
        NotFoundError: 'No camera was found. Connect a webcam and try again.',
        NotReadableError: 'The camera is being used by another application. Close it and try again.'
      };
      const message = messages[err.name] || err.message || 'Unable to start the camera. Please try again.';
      setCameraError(message);
      toast.error(message);
    }
  };

  const stopCamera = () => {
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    } else {
      toast.error('The live camera frame is not ready yet. Start the camera and try again.');
    }
  };

  const handleRegisterFace = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student from the directory first.');
      return;
    }
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const studentIdParam = selectedStudent._id || selectedStudent.id || selectedStudent.studentId;
      const seed = selectedStudent.studentId || selectedStudent.personalDetails?.cetNumber || studentIdParam;
      const payload = {
        ...(capturedImage ? { image: capturedImage } : {}),
        ...(seed ? { virtualSeed: seed } : {})
      };

      const response = await axios.post(`/api/office/face/register/${studentIdParam}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudents((currentStudents) => currentStudents.map((student) => (
        student._id === studentIdParam
          ? { ...student, faceRegistered: Boolean(response.data.student?.faceRegistered) }
          : student
      )));
      toast.success(response.data.message || 'Face signature registered in dataset successfully!');
      setCapturedImage(null);
      setVirtualSeed(seed);
      setSelectedStudent((currentStudent) => currentStudent ? { ...currentStudent, faceRegistered: true } : currentStudent);
      fetchStudents(); // Refresh student biometric badges
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to extract face signature');
    } finally {
      setProcessing(false);
    }
  };

  const handleIdentifyFace = async () => {
    const payload = buildBiometricIdentifyPayload({
      capturedImage,
      virtualSeed
    });

    if (!payload.virtualSeed && !payload.image) {
      toast.error('Capture a face snapshot or select a registered student seed before identifying.');
      return;
    }

    setProcessing(true);
    setIdentifiedStudent(null);
    setConfidence(null);
    setExpression(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/office/face/recognize', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.match) {
        setIdentifiedStudent(res.data.match);
        setConfidence(res.data.confidence);
        setExpression(res.data.expression);
        toast.success(`Match identified: ${res.data.match.personalDetails.studentName}`);
      } else {
        const confidenceText = typeof res.data.confidence === 'number'
          ? ` Best similarity: ${(res.data.confidence * 100).toFixed(1)}%.`
          : '';
        toast.error(`Face unrecognized. No dataset match found.${confidenceText}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Face recognition query failed');
    } finally {
      setProcessing(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.personalDetails.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.personalDetails.cetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Sidebar: Mode Selector & Selection directory */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Toggle Mode */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Biometric Module Action</h3>
          <div className="flex gap-2">
            <button
              onClick={() => { setMode('register'); setCapturedImage(null); setIdentifiedStudent(null); setVirtualSeed(selectedStudent?.studentId || ''); stopCamera(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-950/30 text-slate-400 hover:bg-slate-850'
              }`}
            >
              Register Face dataset
            </button>
            <button
              onClick={() => { setMode('identify'); setSelectedStudent(null); setCapturedImage(null); setVirtualSeed(''); stopCamera(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'identify' ? 'bg-blue-600 text-white' : 'bg-slate-950/30 text-slate-400 hover:bg-slate-850'
              }`}
            >
              Identify Student
            </button>
          </div>
        </div>

        {/* Student Selector (Only for Register Mode) */}
        {mode === 'register' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-5 shadow-lg flex flex-col h-[50vh]">
            <div className="pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-200">Select Student</span>
              
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search name, USN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredStudents.length === 0 ? (
                <p className="text-[10px] text-slate-500 text-center py-8">No students found</p>
              ) : (
                filteredStudents.map(stud => {
                  const isSel = selectedStudent?._id === stud._id;
                  const isRegistered = Boolean(stud.faceRegistered);
                  return (
                    <button
                      key={stud._id}
                      onClick={() => {
                        const nextSeed = stud.studentId || stud.personalDetails?.cetNumber || stud._id;
                        setSelectedStudent(stud);
                        setCapturedImage(null);
                        setVirtualSeed(nextSeed);
                      }}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        isSel ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-950/20 border-slate-850 hover:bg-slate-900/30'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block truncate max-w-[160px]">{stud.personalDetails.studentName}</span>
                        <span className="text-[9px] text-slate-450">{stud.admissionNumber || 'Approved'}</span>
                      </div>
                      {isRegistered ? (
                        <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold">REG</span>
                      ) : (
                        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold">NO KEY</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Panel: Webcam Capture & Live Analytics */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg">
          
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-100">Webcam Capture Console</h2>
              <p className="text-[10px] text-slate-400">Register at admission completion. Use Identify Student before a next-year admission update to verify the student.</p>
            </div>
            {!streamActive ? (
              <button 
                onClick={startCamera}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-550 text-white rounded-xl text-xs font-semibold"
              >
                <Camera size={14} /> Start Camera
              </button>
            ) : (
              <div className="flex gap-2"><button onClick={captureSnapshot} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-semibold">Capture Snapshot</button><button onClick={stopCamera} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold">Stop Camera</button></div>
            )}
          </div>

          {mode === 'identify' && (
            <div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <label htmlFor="virtual-face-seed" className="mb-2 block text-xs font-semibold text-slate-200">
                Demo virtual face seed
              </label>
              <select
                value={virtualSeed}
                onChange={(event) => setVirtualSeed(event.target.value)}
                className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="">Use a camera snapshot for real identification</option>
                {students.filter((student) => student.faceRegistered).map((student) => (
                  <option key={student._id} value={student.studentId || student.personalDetails?.cetNumber || student._id}>
                    {student.personalDetails?.studentName} ({student.studentId || student.personalDetails?.cetNumber || student._id})
                  </option>
                ))}
              </select>
              <input
                id="virtual-face-seed"
                type="text"
                value={virtualSeed}
                onChange={(event) => setVirtualSeed(event.target.value)}
                placeholder="Optional demo seed"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Video preview / canvas box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Live stream */}
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden aspect-[4/3] flex items-center justify-center">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transform -scale-x-100 ${streamActive ? '' : 'hidden'}`} />
              {streamActive ? (
                <>
                  {/* scanning overlay animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-500/70 shadow-lg shadow-emerald-500 animate-scanner-line top-0"></div>
                  <div className="absolute inset-8 border border-slate-500/20 border-dashed rounded-full pointer-events-none"></div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <Camera size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Camera is currently offline</p>
                  {cameraError && <p className="mt-2 text-[11px] leading-relaxed text-rose-400 max-w-xs">{cameraError}</p>}
                  <button onClick={startCamera} className="mt-3 text-xs text-blue-400 font-semibold hover:underline">Activate Web Stream</button>
                </div>
              )}
            </div>

            {/* Captured preview */}
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden aspect-[4/3] flex items-center justify-center">
              {capturedImage ? (
                <img src={capturedImage} alt="Snapshot" className="w-full h-full object-cover transform -scale-x-100" />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <User size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Awaiting captured frame snapshot</p>
                </div>
              )}
            </div>

          </div>

          <canvas ref={canvasRef} width="640" height="480" className="hidden" />

          {/* Console Actions */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between">
            {mode === 'register' ? (
              <div className="flex justify-between items-center w-full gap-4">
                <div className="text-xs">
                  <span className="text-slate-400 block">Registering dataset for:</span>
                  <span className="font-bold text-slate-100">
                    {selectedStudent ? selectedStudent.personalDetails.studentName : 'No student selected'}
                  </span>
                </div>
                <button
                  onClick={handleRegisterFace}
                  disabled={processing || !selectedStudent}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Processing embedding...' : 'Save & Register Face embedding'}
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center w-full gap-4">
                <div className="text-xs text-slate-400">
                  Submit snapshot to recognize face signature against database records.
                </div>
                <button
                  onClick={handleIdentifyFace}
                  disabled={processing || (!capturedImage && !virtualSeed.trim())}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Recognizing Face...' : 'Query Biometric Identify'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Identification Results Card */}
        {mode === 'identify' && (identifiedStudent || confidence !== null) && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg space-y-4 animate-slide-up">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-500" /> Biometric Query Result
            </h3>
            
            {identifiedStudent ? (
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950/25 p-4 rounded-xl border border-emerald-500/20">
                <div className="h-14 w-14 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-200">
                  {identifiedStudent.documents?.photo ? (
                    <img src={identifiedStudent.documents.photo} alt="Photo" className="h-full w-full object-cover" />
                  ) : (
                    identifiedStudent.personalDetails.studentName.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{identifiedStudent.personalDetails.studentName}</h4>
                  <p className="text-[11px] text-slate-400">
                    USN/Admission: <span className="text-blue-400 font-semibold">{identifiedStudent.admissionNumber}</span> | Branch: {identifiedStudent.academicDetails.branch}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">CET: {identifiedStudent.personalDetails.cetNumber}</p>
                </div>
                
                <div className="sm:ml-auto text-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 min-w-[120px]">
                  <span className="text-[9px] text-emerald-450 block uppercase font-bold tracking-wider">Similarity Score</span>
                  <span className="text-lg font-bold text-emerald-400">{(confidence * 100).toFixed(1)} %</span>
                </div>
                {expression && (
                  <div className="text-center p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 min-w-[120px]">
                    <span className="text-[9px] text-amber-400 block uppercase font-bold tracking-wider">Expression</span>
                    <span className="text-sm font-bold text-amber-300">{expression.label}</span>
                    {expression.available && <span className="text-[10px] text-slate-500 block">{(expression.confidence * 100).toFixed(1)} %</span>}
                  </div>
                )}
                <button onClick={() => navigate('/dashboard/office/students', { state: { faceVerifiedStudentId: identifiedStudent.studentId } })} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold">Continue to Update Admission</button>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/25 border border-rose-500/20 rounded-xl text-center flex flex-col items-center gap-2">
                <ShieldAlert size={24} className="text-rose-500" />
                <h4 className="text-xs font-bold text-slate-300">Biometric Match Failure</h4>
                <p className="text-[10px] text-slate-500">The captured face sample did not match any registered students above the confidence threshold.</p>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
