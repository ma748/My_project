import React, { useState } from 'react';
import PersonalDetails from './steps/PersonalDetails';
import FamilyDetails from './steps/FamilyDetails';
import AcademicDetails from './steps/AcademicDetails';
import ContactDetails from './steps/ContactDetails';
import SecurityAuth from './steps/SecurityAuth';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

export default function AdmissionPortal() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    studentId: '',
    personalDetails: {
      cetNumber: '', cetRank: '', studentName: '', dob: '', gender: '', 
      bloodGroup: '', religion: '', category: '', subCaste: '', aadhaarNumber: '', physicallyChallenged: 'No'
    },
    familyDetails: {
      fatherName: '', motherName: '', parentContact: '', fatherOccupation: '', motherOccupation: '', annualIncome: ''
    },
    academicDetails: {
      qualifyingExam: '', board: '', state: '', region: '', allottedCategory: '', branch: '', 
      feeCollected: '', diplomaMarks: '', lateralEntry: 'No', distance: ''
    },
    contactDetails: {
      studentContact: '', email: '', permanentAddress: '', correspondenceAddress: '', 
      sameAsPermanent: false, defenceQuota: 'No', sportsQuota: 'No', snqQuota: 'No'
    },
    securityDetails: {
      password: '', confirmPassword: '', securityQuestion: '', securityAnswer: '', emailForOtp: '', emailOtp: '', faceImageBase64: null, acceptedTerms: false
    }
  });

  const updateFormData = (section, field, value) => {
    if (section === 'student') {
      setFormData(prev => ({ ...prev, [field]: value }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    if (currentStep === 4) {
      // Auto-fill the OTP email for convenience on step 5 using step 4's email
      if (formData.contactDetails.email && !formData.securityDetails.emailForOtp) {
        updateFormData('securityDetails', 'emailForOtp', formData.contactDetails.email);
      }
    }
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final Validations
    if (formData.securityDetails.password !== formData.securityDetails.confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    if (!formData.securityDetails.acceptedTerms) {
      return toast.error("You must accept the Terms and Conditions.");
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/students/register', formData);
      toast.success(res.data.message || "Admission Record Created Successfully!");
      
      // Auto-login or redirect
      setTimeout(() => {
        navigate('/login/student');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed. Check server connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <PersonalDetails data={formData.personalDetails} studentId={formData.studentId} updateData={updateFormData} />;
      case 2: return <FamilyDetails data={formData.familyDetails} updateData={updateFormData} />;
      case 3: return <AcademicDetails data={formData.academicDetails} updateData={updateFormData} />;
      case 4: return <ContactDetails data={formData.contactDetails} updateData={updateFormData} />;
      case 5: return <SecurityAuth data={formData.securityDetails} updateData={updateFormData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <Toaster position="top-right" />
      <div className="w-full max-w-4xl">
        <Button 
          variant="secondary" 
          onClick={() => navigate('/')} 
          style={{ marginBottom: '2rem', width: 'auto' }}
        >
          ← Back to Home
        </Button>

        <Card style={{ padding: '2rem' }}>
          <h1 className="text-3xl font-bold text-center mb-2">College Student Admission System</h1>
          <p className="text-center text-gray-400 mb-8">Please fill out all the mandatory details correctly to submit your admission standard form.</p>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Completed</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3 text-xs text-gray-500 font-semibold uppercase tracking-wider hidden sm:flex">
              <span className={currentStep >= 1 ? "text-blue-400" : ""}>Personal</span>
              <span className={currentStep >= 2 ? "text-blue-400" : ""}>Family</span>
              <span className={currentStep >= 3 ? "text-blue-400" : ""}>Academic</span>
              <span className={currentStep >= 4 ? "text-blue-400" : ""}>Contact</span>
              <span className={currentStep >= 5 ? "text-emerald-400" : ""}>Security</span>
            </div>
          </div>

          <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-slate-700">
              <Button 
                type="button"
                variant="secondary"
                onClick={handlePrev}
                disabled={currentStep === 1 || isSubmitting}
                style={{ width: 'auto', opacity: currentStep === 1 || isSubmitting ? 0.5 : 1 }}
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button type="submit" style={{ width: 'auto', backgroundColor: '#3b82f6' }}>
                  Save & Next Step
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} style={{ width: 'auto', backgroundColor: '#10b981', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Verifying...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
