"use server";

import { db } from '@/utils/db';
import { mockinterview, userAnswers, grammarHistory, emailHistory } from '@/utils/schema';
import { eq, desc } from 'drizzle-orm';

export async function insertMockInterview(data) {
  try {
    const output = await db.insert(mockinterview).values(data).returning({ mockId: mockinterview.mockid });
    return output;
  } catch (error) {
    console.error("Error inserting mock interview:", error);
    throw error;
  }
}

export async function getInterviewList(email) {
  try {
    const response = await db.select()
      .from(mockinterview)
      .where(eq(mockinterview.createdby, email))
      .orderBy(desc(mockinterview.id));
    return response;
  } catch (error) {
    console.error("Error fetching interview list:", error);
    throw error;
  }
}

export async function getInterviewDetails(mockid) {
  try {
    const result = await db.select()
      .from(mockinterview)
      .where(eq(mockinterview.mockid, mockid));
    return result;
  } catch (error) {
    console.error("Error fetching interview details:", error);
    throw error;
  }
}

export async function insertUserAnswer(data) {
  try {
    const resp = await db.insert(userAnswers).values(data);
    return resp;
  } catch (error) {
    console.error("Error inserting user answer:", error);
    throw error;
  }
}

export async function getFeedbackByMockId(mockid) {
  try {
    const result = await db.select()
      .from(userAnswers)
      .where(eq(userAnswers.mockidRef, mockid))
      .orderBy(userAnswers.id);
    return result;
  } catch (error) {
    console.error("Error fetching feedback:", error);
    throw error;
  }
}

export async function insertGrammarHistory(data) {
  try {
    const resp = await db.insert(grammarHistory).values(data);
    return resp;
  } catch (error) {
    console.error("Error inserting grammar history:", error);
    throw error;
  }
}

export async function insertEmailHistory(data) {
  try {
    const resp = await db.insert(emailHistory).values(data);
    return resp;
  } catch (error) {
    console.error("Error inserting email history:", error);
    throw error;
  }
}

export async function getDashboardStats(email) {
  try {
    const interviews = await db.select().from(mockinterview).where(eq(mockinterview.createdby, email));
    const answers = await db.select().from(userAnswers).where(eq(userAnswers.userEmail, email));
    const grammar = await db.select().from(grammarHistory).where(eq(grammarHistory.userEmail, email));
    const emailHist = await db.select().from(emailHistory).where(eq(emailHistory.userEmail, email));
    
    let totalScore = 0;
    let scoredAnswersCount = 0;
    
    answers.forEach(a => {
      if (a.rating && !isNaN(parseFloat(a.rating))) {
        totalScore += parseFloat(a.rating);
        scoredAnswersCount++;
      }
    });

    const averageScore = scoredAnswersCount > 0 ? (totalScore / scoredAnswersCount).toFixed(1) : 0;

    return {
      totalInterviews: interviews.length,
      totalAnswers: answers.length,
      averageScore,
      grammarUsage: grammar.length,
      emailUsage: emailHist.length,
      latestInterview: interviews.length > 0 ? interviews[0] : null // assuming it's ordered by default, but we should sort it
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return null;
  }
}
