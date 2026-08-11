import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core"

export const mockinterview = pgTable("mockinterview", {
	id: serial("id").primaryKey().notNull(),
	jsonmockresp: text("jsonmockresp").notNull(),
	jobposition: varchar("jobposition", { length: 1000 }).notNull(),
	jobdescription: varchar("jobdescription", { length: 1000 }).notNull(),
	jobexp: varchar("jobexp", { length: 255 }).notNull(),
	interviewType: varchar("interviewType", { length: 255 }).default('Technical'),
	resumeText: text("resumeText"),
	createdby: varchar("createdby", { length: 255 }).notNull(),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	mockid: varchar("mockid", { length: 255 }).notNull(),
});

export const userAnswers = pgTable("userAnswers", {
	id: serial("id").primaryKey().notNull(),
	mockidRef: varchar('mockid').notNull(),
	question: varchar('question').notNull(),
	correctanswer: text('correctanswer'),
	useranswer: text('useranswer'),
	feedback: text('feedback'),
	rating: varchar('rating'),
	strengths: text('strengths'),
	weaknesses: text('weaknesses'),
	improvements: text('improvements'),
	confidenceLevel: varchar('confidenceLevel'),
	userEmail: varchar('userEmail'),
	createdat: varchar('createdat'),
});

export const grammarHistory = pgTable("grammarHistory", {
	id: serial("id").primaryKey().notNull(),
	userEmail: varchar('userEmail').notNull(),
	originalText: text('originalText').notNull(),
	correctedText: text('correctedText').notNull(),
	feedback: text('feedback'),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
});

export const emailHistory = pgTable("emailHistory", {
	id: serial("id").primaryKey().notNull(),
	userEmail: varchar('userEmail').notNull(),
	emailType: varchar('emailType', { length: 255 }),
	originalText: text('originalText'),
	generatedEmail: text('generatedEmail').notNull(),
	feedback: text('feedback'),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
});