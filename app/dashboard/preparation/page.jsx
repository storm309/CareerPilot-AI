"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createChatSession } from '@/utils/Geminimodel';
import { LoaderCircle, Sparkles, CheckCircle, Mail, PenTool, History } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { insertGrammarHistory, insertEmailHistory } from '@/actions/dbActions';

function Preparation() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("grammar"); // "grammar" or "email"
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { user } = useUser();

  const handleAnalyze = async () => {
    if (!text || text.trim().length < 10) {
      toast.error("Please enter at least 10 characters to analyze.");
      return;
    }

    setLoading(true);
    setFeedback(null);

    const prompt = mode === "grammar"
      ? `Act as an expert English Professor. Analyze the following text for grammar, punctuation, and style. 
         Provide a JSON response with ONLY two fields:
         "correctedText": The fully corrected and polished version of the text.
         "feedback": A bulleted list of what was wrong and why you changed it.
         Text to analyze: "${text}"`
      : `Act as an expert Corporate Communications Manager. Analyze the following email draft. 
         Provide a JSON response with ONLY two fields:
         "correctedText": The fully corrected, professional version of the email.
         "feedback": Suggestions on tone, clarity, and professionalism.
         Email draft: "${text}"`;

    try {
      const session = createChatSession();
      const result = await session.sendMessage(prompt);
      let responseText = await result.response.text();

      // Clean up markdown formatting if Gemini includes it
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const jsonResponse = JSON.parse(responseText);
      setFeedback(jsonResponse);

      // Save to database
      if (user?.primaryEmailAddress?.emailAddress) {
        if (mode === "grammar") {
          await insertGrammarHistory({
            userEmail: user.primaryEmailAddress.emailAddress,
            originalText: text,
            correctedText: jsonResponse.correctedText,
            feedback: typeof jsonResponse.feedback === 'string' ? jsonResponse.feedback : JSON.stringify(jsonResponse.feedback)
          });
        } else {
          await insertEmailHistory({
            userEmail: user.primaryEmailAddress.emailAddress,
            emailType: "Draft Review",
            originalText: text,
            generatedEmail: jsonResponse.correctedText,
            feedback: typeof jsonResponse.feedback === 'string' ? jsonResponse.feedback : JSON.stringify(jsonResponse.feedback)
          });
        }
      }

      toast.success("Analysis complete and saved to history!");
    } catch (error) {
      console.error("Error analyzing text:", error);
      toast.error("Failed to analyze. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-6 md:p-10 max-w-5xl mx-auto'>
      <div className="mb-8">
        <h2 className='text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 tracking-tight flex items-center gap-2'>
          <Sparkles className="text-blue-700 dark:text-blue-400" /> AI Prep Tools
        </h2>
        <p className='text-slate-500 dark:text-slate-400 mt-2 font-medium'>
          Sharpen your communication skills before the interview. Choose a tool below.
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={mode === "grammar" ? "default" : "outline"}
          className={mode === "grammar" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 dark:border-slate-700"}
          onClick={() => setMode("grammar")}
        >
          <PenTool className="w-4 h-4 mr-2" /> Grammar Checker
        </Button>
        <Button
          variant={mode === "email" ? "default" : "outline"}
          className={mode === "email" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 dark:border-slate-700"}
          onClick={() => setMode("email")}
        >
          <Mail className="w-4 h-4 mr-2" /> Email Writer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="flex flex-col gap-4">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            {mode === "grammar" ? "Enter your text to check:" : "Paste your email draft:"}
          </label>
          <Textarea
            className="min-h-[300px] p-4 text-base focus-visible:ring-indigo-500 rounded-xl"
            placeholder={mode === "grammar" ? "I has been working here for 3 year..." : "Hi Sir, I want a job in ur company..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            className="bg-slate-800 hover:bg-slate-900 text-white py-6 rounded-xl text-lg"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? <><LoaderCircle className="animate-spin mr-2" /> Analyzing...</> : "Analyze Text"}
          </Button>
        </div>

        {/* Output Section */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-inner h-full min-h-[300px]">
          {feedback ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-green-700 dark:text-green-500 flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5" /> Polished Version
                </h3>
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-green-200 dark:border-green-900 shadow-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {feedback.correctedText}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" /> Expert Feedback
                </h3>
                <div className="bg-indigo-50 dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {feedback.feedback}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
              <PenTool className="w-16 h-16 mb-4 opacity-20" />
              <p>Your results will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Preparation;
