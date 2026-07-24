"use client";
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import useSpeechToText from 'react-hook-speech-to-text';
import { Mic } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useUser } from '@clerk/clerk-react';
import { chatSession, createChatSession } from '@/utils/Geminimodel';
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

  // Save to DB after recording ends and if the userAnswer length is valid
  useEffect(() => {
    if (!isRecording && userAnswer.length > 10 && !loading) {
      console.log('Saving answer to DB:', userAnswer);
      updateUserAnswerInDb();
    }
  }, [userAnswer, isRecording, loading]);

  useEffect(() => {
    if(isRecording){
      toast.info('Answer should be more than 10 characters');
    }
  }, [isRecording]);

  const saveUserAnswer = async () => {
    if (isRecording) {
      stopSpeechToText(); // Only stop recording on button click
      console.log('Recording stopped');
    } else {
      startSpeechToText(); // Start recording on button click
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
1. Rate the answer from 1-10 (be strict, 10 is only for flawless answers).
2. Give detailed feedback pointing out grammatical errors, lack of depth, and technical inaccuracies.
3. Suggest the ideal professional phrasing.
Return ONLY in JSON format with two fields: 'rating' (number or string) and 'feedback' (string).`;
  
    try {
      const session = createChatSession();
      const result = await session.sendMessage(feedbackPrompt);
      const responseText = await result.response.text();
    
      // Parse JSON directly since Gemini outputs strict JSON now
      const jsonResponse = JSON.parse(responseText);
    
      const resp = await insertUserAnswer({
        mockidRef: interviewdata.mockid, // Ensure this is defined
      question: mockinterviewquestions[activequestionindex]?.question,
      correctanswer: mockinterviewquestions[activequestionindex]?.answer,
      useranswer: userAnswer,
      feedback: jsonResponse?.feedback,
      rating: jsonResponse?.rating,
      userEmail: user?.primaryEmailAddress?.emailAddress,
      createdat: moment().format('YYYY-MM-DD HH:mm:ss')
    });
  
    if (resp) {
      toast.success('Answer recorded successfully');
      setUserAnswer('');
      setResults([]); // Clear the results
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

      <Button variant="outline" className="my-10" disabled={loading} onClick={saveUserAnswer}>
        {isRecording ? (
          <h2 className="text-red-700 flex gap-2">
            <Mic /> Recording ...
          </h2>
        ) : (
          <h2 className="text-blue-700 flex gap-2">
            <Mic /> Record Answer
          </h2>
        )}
      </Button>
    </div>
  );
}

export default RecordAnswerSection;
