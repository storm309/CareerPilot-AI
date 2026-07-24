"use client";
import { getInterviewDetails } from '@/actions/dbActions';
import React, { useEffect } from 'react';
import Webcam from 'react-webcam';
import { Lightbulb, WebcamIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { ShieldAlert } from 'lucide-react';

function Interview({ params }) {
  const [interviewdata, setInterviewdata] = React.useState();
  const [webcamenabled, setWebcamenabled] = React.useState(false);
  const [openModal, setOpenModal] = React.useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log(params);
    interviewDetails();
  }, [params]);

  const interviewDetails = async () => {
    try {
      const result = await getInterviewDetails(params.interviewid);
      console.log(result);
      setInterviewdata(result[0]);
    } catch (error) {
      console.error("Error fetching interview details:", error);
    }
  };

  return (
    <div className="my-10">
      <h2 className="font-bold text-2xl">Let's Get Started</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 my-10">
        {interviewdata && (
          <div className="flex flex-col gap-5">
            <div className="p-5 rounded-lg border">
              <h2 className="text-lg">
                <strong>Job Post:</strong> {interviewdata.jobposition}
              </h2>
              <h2 className="text-lg">
                <strong>Job Description/TechStack:</strong>{" "}
                {interviewdata.jobdescription}
              </h2>
              <h2 className="text-lg">
                <strong>Years of Experience:</strong> {interviewdata.jobexp}
              </h2>
            </div>
            <div className='p-5 border rounded-lg border-yellow-300 bg-yellow-100'>
              <h2 className="flex items-center text-yellow-600">
                <Lightbulb className="mr-2" />
                <strong>Information</strong>
              </h2>
              <h2 className='mt-5'>{process.env.NEXT_PUBLIC_INFORMATION}</h2>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center items-center">
          {webcamenabled ? (
            <Webcam
              onUserMedia={() => setWebcamenabled(true)}
              onUserMediaError={() => setWebcamenabled(false)}
              style={{ height: 300, width: 300 }}
              mirrored={true}
            />
          ) : (
            <>
              <WebcamIcon className="h-72 w-full my-7 p-20 bg-secondary rounded-lg border ml-5" />
              <Button
                className="mt-5" // Adjusts margin to move the button down
                onClick={() => setWebcamenabled(true)}
              >
                Enable Webcam and Microphone
              </Button>
            </>
          )}
        </div>

      </div>
      <div className='flex justify-end items-end'>
        <Button onClick={() => setOpenModal(true)}> Start Interview </Button>
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-red-600">
              <ShieldAlert className="w-8 h-8" />
              Anti-Cheat & Terms of Service
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-4 text-base space-y-3">
              <p>To ensure a fair and realistic interview environment, please note the following strict rules:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium text-slate-800">
                <li><strong>Screen Sharing is Required:</strong> You will be asked to share your screen on the next page. Refusal will terminate the interview.</li>
                <li><strong>No Tab Switching:</strong> Navigating away from the interview tab is strictly monitored. Multiple warnings will lead to disqualification.</li>
                <li><strong>Camera & Mic:</strong> Must remain on for the duration of the interview.</li>
                <li><strong>No External Help:</strong> AI-based cheating or reading from scripts is strictly prohibited.</li>
              </ul>
              <p className="pt-2 text-sm text-slate-500">By clicking "I Agree", you consent to these terms and authorize screen monitoring.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => router.push(`/dashboard/interview/${params.interviewid}/start`)}>
              I Agree, Start Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export default Interview;
