"use server";

import { db } from '@/utils/db';
import { mockinterview, userAnswers } from '@/utils/schema';
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
