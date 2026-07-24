"use client";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import useSpeechToText from 'react-hook-speech-to-text';
import { Mic, StopCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/clerk-react';
import { createChatSession } from '@/utils/Geminimodel';
import { insertUserAnswer } from '@/actions/dbActions';
import moment from 'moment';


// Dynamically import Webcam so it doesn't load on the server
const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

function RecordAnswerSection({ mockinterviewquestions, activequestionindex, interviewdata }) {
  const [userAnswer, setUserAnswer] = useState('');
  const { user } = useUser(); // Assuming you have a user context hook
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  
  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
    setResults,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    interimResults: true, // ensure interim results are processed
  });

  // Update user answer from speech-to-text results safely
  useEffect(() => {
    if (results && results.length > 0) {
      setUserAnswer(results.map((r) => r.transcript).join(' '));
    }
  }, [results]);

  useEffect(() => {
    if(isRecording){
      toast.info('Answer should be more than 10 characters');
    }
  }, [isRecording]);

  const toggleRecording = async () => {
    if (isRecording) {
      stopSpeechToText();
      console.log('Recording stopped');
    } else {
      startSpeechToText();
      console.log('Recording started');
    }
  };

  const updateUserAnswerInDb = async () => {
    setLoading(true);
    console.log('User answer ready to save:', userAnswer);
  
    // Check if interviewdata and mockid are valid
    if (!interviewdata || !interviewdata.mockid) {
      console.error("interviewdata or mockid is undefined");
      toast.error("Interview data is not available. Please try again.");
      setLoading(false);
      return; // Exit the function
    }
  
    const feedbackPrompt = `Act as a strict, professional Senior Technical HR Manager. 
Question: ${mockinterviewquestions[activequestionindex]?.question} 
User's Answer: ${userAnswer}

Provide a harsh but constructive evaluation of the user's answer.
1. Rate the answer from 1-10 (be strict, 10 is only for flawless answers) -> map to "score".
2. Identify core "strengths".
3. Identify core "weaknesses".
4. Suggest concrete "improvements".
5. Provide the "expectedAnswer" (how a senior engineer would answer it).
6. Assess their "confidenceLevel" (Low/Medium/High) based on answer structure/wording.

Return ONLY in JSON format with fields: 'score' (string), 'feedback' (string - general summary), 'strengths' (string), 'weaknesses' (string), 'improvements' (string), 'expectedAnswer' (string), 'confidenceLevel' (string).`;
  
    try {
      const session = createChatSession();
      const result = await session.sendMessage(feedbackPrompt);
      let responseText = await result.response.text();
    
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      const jsonResponse = JSON.parse(responseText);
    
      const resp = await insertUserAnswer({
        mockidRef: interviewdata.mockid,
        question: mockinterviewquestions[activequestionindex]?.question,
        correctanswer: jsonResponse?.expectedAnswer || mockinterviewquestions[activequestionindex]?.answer,
        useranswer: userAnswer,
        feedback: jsonResponse?.feedback,
        rating: jsonResponse?.score || jsonResponse?.rating,
        strengths: jsonResponse?.strengths,
        weaknesses: jsonResponse?.weaknesses,
        improvements: jsonResponse?.improvements,
        confidenceLevel: jsonResponse?.confidenceLevel,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdat: moment().format('YYYY-MM-DD HH:mm:ss')
      });
  
      if (resp) {
        toast.success('Answer recorded successfully');
        setUserAnswer('');
        setResults([]);
      }
      setLoading(false);
    
    // Simulate API call to save
    setResults([]); // Clear the results
    setTimeout(() => {
      setLoading(false);
      toast.success('Click on Next Question to continue');
    }, 1000);
    
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      toast.error("There was an error parsing the feedback. Please try again.");
      setLoading(false);
    }
  };

  // Error handler for webcam
  const handleWebcamError = (error) => {
    console.error('Webcam error:', error);
    setWebcamError('Could not access webcam. Please check permissions and try again.');
    toast.error('Could not access webcam. Please check permissions.');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex flex-col mt-20 justify-center items-center rounded-lg p-5 my-15 bg-black">
        {webcamError ? (
          <p className="text-red-500">{webcamError}</p>
        ) : (
          <>
            <Image src="/webcam.png" width={200} height={200} className="absolute" alt="Webcam Placeholder" />
            <Webcam
              mirrored={true}
              onUserMediaError={handleWebcamError} // Error handler
              style={{
                width: '100%',
                height: 300,
                zIndex: 10,
              }}
            />
          </>
        )}
      </div>

      <div className="w-full mt-8">
        <label className="text-sm font-semibold text-slate-700 mb-2 block">Your Answer (Edit before submitting)</label>
        <Textarea 
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className="min-h-[150px] p-4 text-base focus-visible:ring-indigo-500 rounded-xl w-full"
          placeholder="Start recording, or type your answer manually here..."
        />
      </div>

      <div className="flex gap-4 mt-6">
        <Button variant={isRecording ? "destructive" : "outline"} className="flex gap-2 rounded-xl" onClick={toggleRecording}>
          {isRecording ? (
            <><StopCircle className="w-5 h-5" /> Stop Recording</>
          ) : (
            <><Mic className="w-5 h-5" /> Record Audio</>
          )}
        </Button>

        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2 rounded-xl"
          onClick={updateUserAnswerInDb}
          disabled={loading || userAnswer.length < 10}
        >
          {loading ? "Evaluating..." : <><Send className="w-5 h-5" /> Submit Answer</>}
        </Button>
      </div>
    </div>
  );
}

export default RecordAnswerSection;
