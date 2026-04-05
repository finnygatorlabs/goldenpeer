/**
 * SeniorShield Backend Implementation
 * Adaptive Learning System for AI Attendants
 * 
 * This module provides the core backend functionality for:
 * - Senior profile management
 * - Adaptive learning engine
 * - Context assembly for LLM
 * - Conversation history tracking
 * - Engagement metrics
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BasicInfo {
  name: string;
  location: string;
  timezone: string;
}

interface PersonalInterests {
  hobbies: string[];
  sports_teams: string[];
  favorite_books: string[];
  favorite_movies: string[];
  favorite_music: string[];
  travel_history: string[];
}

interface FamilyMember {
  name: string;
  relationship: string;
  recent_news?: string;
}

interface ImportantDate {
  date: string; // MM-DD format
  occasion: string;
  person: string;
}

interface ConversationPreferences {
  preferred_topics: string[];
  topics_to_avoid: string[];
  conversation_style: 'formal' | 'casual_friendly' | 'humorous';
}

interface DiscoveredInterest {
  topic: string;
  mentions: number;
  confidence: number;
  details: string[];
}

interface EmotionalPattern {
  happy_triggers: string[];
  quiet_triggers: string[];
  excited_triggers: string[];
}

interface MemoryAnchor {
  type: 'person' | 'date' | 'place' | 'event';
  name: string;
  relationship?: string;
  birthday?: string;
  significance?: string;
  mentions: number;
}

interface BehavioralPattern {
  preferred_call_time?: string;
  average_call_duration?: number;
  first_topic?: string;
  engagement_level: 'low' | 'moderate' | 'high';
  response_pattern?: 'storyteller' | 'direct_responder' | 'question_asker' | 'reflective';
}

interface LearningHistory {
  call_number: number;
  discovery: string;
  confidence: number;
  timestamp: Date;
}

interface SeniorProfile {
  senior_id: string;
  personalization_score: number;
  conversation_count: number;
  last_updated: Date;
  
  // Core profile
  basic_info: BasicInfo;
  
  // Discovered information
  discovered_interests: DiscoveredInterest[];
  emotional_patterns: EmotionalPattern;
  conversation_preferences: ConversationPreferences;
  memory_anchors: MemoryAnchor[];
  behavioral_patterns: BehavioralPattern;
  
  // Learning history
  learning_history: LearningHistory[];
  
  // Avoidance patterns
  topics_to_avoid: string[];
}

interface Conversation {
  conversation_id: string;
  senior_id: string;
  timestamp: Date;
  duration_seconds: number;
  
  // Conversation content
  senior_input: string;
  ai_response: string;
  
  // Extracted insights
  topics_discussed: string[];
  emotional_tone: 'positive' | 'neutral' | 'negative';
  engagement_score: number; // 0-100
  
  // New information discovered
  new_interests?: string[];
  new_memory_anchors?: MemoryAnchor[];
  new_patterns?: string[];
}

interface EngagementMetrics {
  senior_id: string;
  date: Date;
  call_duration: number;
  engagement_score: number;
  topics_discussed: string[];
  emotional_tone: string;
}

// ============================================================================
// SENIOR PROFILE SERVICE
// ============================================================================

export class SeniorProfileService {
  private profiles: Map<string, SeniorProfile> = new Map();
  private profilesDir = './data/profiles';

  constructor() {
    this.ensureDirectoryExists();
    this.loadAllProfiles();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  private loadAllProfiles() {
    if (fs.existsSync(this.profilesDir)) {
      const files = fs.readdirSync(this.profilesDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const data = fs.readFileSync(path.join(this.profilesDir, file), 'utf-8');
          const profile = JSON.parse(data);
          this.profiles.set(profile.senior_id, profile);
        }
      });
    }
  }

  /**
   * Create a new senior profile
   */
  createProfile(seniorId: string, basicInfo: BasicInfo): SeniorProfile {
    const profile: SeniorProfile = {
      senior_id: seniorId,
      personalization_score: 0,
      conversation_count: 0,
      last_updated: new Date(),
      
      basic_info: basicInfo,
      discovered_interests: [],
      emotional_patterns: {
        happy_triggers: [],
        quiet_triggers: [],
        excited_triggers: []
      },
      conversation_preferences: {
        preferred_topics: [],
        topics_to_avoid: [],
        conversation_style: 'casual_friendly'
      },
      memory_anchors: [],
      behavioral_patterns: {
        engagement_level: 'moderate'
      },
      learning_history: [],
      topics_to_avoid: []
    };

    this.profiles.set(seniorId, profile);
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Get a senior profile
   */
  getProfile(seniorId: string): SeniorProfile | null {
    return this.profiles.get(seniorId) || null;
  }

  /**
   * Update senior profile
   */
  updateProfile(profile: SeniorProfile): void {
    profile.last_updated = new Date();
    this.profiles.set(profile.senior_id, profile);
    this.saveProfile(profile);
  }

  /**
   * Save profile to file
   */
  private saveProfile(profile: SeniorProfile): void {
    const filePath = path.join(this.profilesDir, `${profile.senior_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
  }

  /**
   * Add memory anchor to profile
   */
  addMemoryAnchor(seniorId: string, anchor: MemoryAnchor): void {
    const profile = this.getProfile(seniorId);
    if (!profile) return;

    // Check if anchor already exists
    const existingIndex = profile.memory_anchors.findIndex(
      a => a.type === anchor.type && a.name === anchor.name
    );

    if (existingIndex >= 0) {
      // Update existing anchor
      profile.memory_anchors[existingIndex].mentions++;
    } else {
      // Add new anchor
      profile.memory_anchors.push(anchor);
    }

    this.updateProfile(profile);
  }

  /**
   * Add discovered interest to profile
   */
  addDiscoveredInterest(seniorId: string, interest: DiscoveredInterest): void {
    const profile = this.getProfile(seniorId);
    if (!profile) return;

    const existingIndex = profile.discovered_interests.findIndex(
      i => i.topic === interest.topic
    );

    if (existingIndex >= 0) {
      // Update existing interest
      profile.discovered_interests[existingIndex].mentions++;
      profile.discovered_interests[existingIndex].confidence = Math.min(
        1,
        profile.discovered_interests[existingIndex].confidence + 0.1
      );
    } else {
      // Add new interest
      profile.discovered_interests.push(interest);
    }

    this.updateProfile(profile);
  }

  /**
   * Update emotional patterns
   */
  updateEmotionalPatterns(seniorId: string, patterns: Partial<EmotionalPattern>): void {
    const profile = this.getProfile(seniorId);
    if (!profile) return;

    profile.emotional_patterns = {
      ...profile.emotional_patterns,
      ...patterns
    };

    this.updateProfile(profile);
  }

  /**
   * Update behavioral patterns
   */
  updateBehavioralPatterns(seniorId: string, patterns: Partial<BehavioralPattern>): void {
    const profile = this.getProfile(seniorId);
    if (!profile) return;

    profile.behavioral_patterns = {
      ...profile.behavioral_patterns,
      ...patterns
    };

    this.updateProfile(profile);
  }

  /**
   * Increase personalization score
   */
  increasePersonalizationScore(seniorId: string, points: number = 1): void {
    const profile = this.getProfile(seniorId);
    if (!profile) return;

    profile.personalization_score = Math.min(100, profile.personalization_score + points);
    this.updateProfile(profile);
  }

  /**
   * Add to learning history
   */
  addLearningHistory(seniorId: string, discovery: string, confidence: number): void {
    const profile = this.getProfile(seniorId);
    if (!profile) return;

    profile.learning_history.push({
      call_number: profile.conversation_count,
      discovery,
      confidence,
      timestamp: new Date()
    });

    this.updateProfile(profile);
  }
}

// ============================================================================
// ADAPTIVE LEARNING ENGINE
// ============================================================================

export class AdaptiveLearningEngine {
  private profileService: SeniorProfileService;
  private conversationHistory: Map<string, Conversation[]> = new Map();

  constructor(profileService: SeniorProfileService) {
    this.profileService = profileService;
  }

  /**
   * Analyze a conversation and extract insights
   */
  analyzeConversation(conversation: Conversation): void {
    const profile = this.profileService.getProfile(conversation.senior_id);
    if (!profile) return;

    // Extract topics
    this.extractTopics(conversation, profile);

    // Analyze emotional patterns
    this.analyzeEmotionalPatterns(conversation, profile);

    // Extract memory anchors
    this.extractMemoryAnchors(conversation, profile);

    // Analyze response patterns
    this.analyzeResponsePatterns(conversation, profile);

    // Update engagement metrics
    this.updateEngagementMetrics(conversation, profile);

    // Store conversation
    this.storeConversation(conversation);

    // Update profile
    profile.conversation_count++;
    this.profileService.increasePersonalizationScore(conversation.senior_id, 1);
    this.profileService.updateProfile(profile);
  }

  /**
   * Extract topics from conversation
   */
  private extractTopics(conversation: Conversation, profile: SeniorProfile): void {
    conversation.topics_discussed.forEach(topic => {
      // Check if topic is already in discovered interests
      const existingInterest = profile.discovered_interests.find(
        i => i.topic.toLowerCase() === topic.toLowerCase()
      );

      if (existingInterest) {
        existingInterest.mentions++;
        existingInterest.confidence = Math.min(1, existingInterest.confidence + 0.1);
      } else {
        // Add new interest
        const newInterest: DiscoveredInterest = {
          topic,
          mentions: 1,
          confidence: 0.5,
          details: []
        };
        this.profileService.addDiscoveredInterest(conversation.senior_id, newInterest);
      }

      // Boost personalization score for new topics
      if (!existingInterest) {
        this.profileService.increasePersonalizationScore(conversation.senior_id, 5);
        this.profileService.addLearningHistory(conversation.senior_id, `Discovered interest: ${topic}`, 0.5);
      }
    });
  }

  /**
   * Analyze emotional patterns
   */
  private analyzeEmotionalPatterns(conversation: Conversation, profile: SeniorProfile): void {
    // Positive conversations
    if (conversation.emotional_tone === 'positive' && conversation.engagement_score > 70) {
      conversation.topics_discussed.forEach(topic => {
        if (!profile.emotional_patterns.happy_triggers.includes(topic)) {
          profile.emotional_patterns.happy_triggers.push(topic);
        }
      });
      this.profileService.increasePersonalizationScore(conversation.senior_id, 2);
    }

    // Negative conversations
    if (conversation.emotional_tone === 'negative' && conversation.engagement_score < 30) {
      conversation.topics_discussed.forEach(topic => {
        if (!profile.emotional_patterns.quiet_triggers.includes(topic)) {
          profile.emotional_patterns.quiet_triggers.push(topic);
        }
      });
    }

    this.profileService.updateEmotionalPatterns(conversation.senior_id, profile.emotional_patterns);
  }

  /**
   * Extract memory anchors (names, dates, places)
   */
  private extractMemoryAnchors(conversation: Conversation, profile: SeniorProfile): void {
    if (conversation.new_memory_anchors) {
      conversation.new_memory_anchors.forEach(anchor => {
        this.profileService.addMemoryAnchor(conversation.senior_id, anchor);
        this.profileService.increasePersonalizationScore(conversation.senior_id, 10);
        this.profileService.addLearningHistory(
          conversation.senior_id,
          `Discovered memory anchor: ${anchor.name} (${anchor.relationship})`,
          0.9
        );
      });
    }
  }

  /**
   * Analyze response patterns
   */
  private analyzeResponsePatterns(conversation: Conversation, profile: SeniorProfile): void {
    const responseLength = conversation.senior_input.split(' ').length;

    if (responseLength > 50) {
      // Storyteller pattern
      if (!profile.behavioral_patterns.response_pattern) {
        profile.behavioral_patterns.response_pattern = 'storyteller';
        this.profileService.updateBehavioralPatterns(conversation.senior_id, profile.behavioral_patterns);
      }
    } else if (responseLength < 20) {
      // Direct responder pattern
      if (!profile.behavioral_patterns.response_pattern) {
        profile.behavioral_patterns.response_pattern = 'direct_responder';
        this.profileService.updateBehavioralPatterns(conversation.senior_id, profile.behavioral_patterns);
      }
    }
  }

  /**
   * Update engagement metrics
   */
  private updateEngagementMetrics(conversation: Conversation, profile: SeniorProfile): void {
    // Update engagement level based on conversation
    if (conversation.engagement_score > 70) {
      profile.behavioral_patterns.engagement_level = 'high';
    } else if (conversation.engagement_score > 40) {
      profile.behavioral_patterns.engagement_level = 'moderate';
    } else {
      profile.behavioral_patterns.engagement_level = 'low';
    }

    this.profileService.updateBehavioralPatterns(conversation.senior_id, profile.behavioral_patterns);
  }

  /**
   * Store conversation in history
   */
  private storeConversation(conversation: Conversation): void {
    if (!this.conversationHistory.has(conversation.senior_id)) {
      this.conversationHistory.set(conversation.senior_id, []);
    }
    this.conversationHistory.get(conversation.senior_id)!.push(conversation);
  }

  /**
   * Get conversation history for a senior
   */
  getConversationHistory(seniorId: string, limit: number = 10): Conversation[] {
    const history = this.conversationHistory.get(seniorId) || [];
    return history.slice(-limit);
  }

  /**
   * Get personalization score level
   */
  getPersonalizationLevel(score: number): string {
    if (score < 20) return 'lean';
    if (score < 40) return 'learning';
    if (score < 60) return 'adaptive';
    if (score < 80) return 'smart';
    return 'expert';
  }
}

// ============================================================================
// CONTEXT ASSEMBLY ENGINE
// ============================================================================

export class ContextAssemblyEngine {
  private profileService: SeniorProfileService;
  private learningEngine: AdaptiveLearningEngine;
  private lifeStoryQuestions: any;
  private conversationTemplates: any;

  constructor(
    profileService: SeniorProfileService,
    learningEngine: AdaptiveLearningEngine
  ) {
    this.profileService = profileService;
    this.learningEngine = learningEngine;
    this.loadContentFiles();
  }

  /**
   * Load content files
   */
  private loadContentFiles(): void {
    try {
      const questionsPath = './data/life_story_questions.json';
      const templatesPath = './data/conversation_templates.json';

      if (fs.existsSync(questionsPath)) {
        this.lifeStoryQuestions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
      }

      if (fs.existsSync(templatesPath)) {
        this.conversationTemplates = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading content files:', error);
    }
  }

  /**
   * Assemble context for LLM
   */
  assembleContext(seniorId: string): string {
    const profile = this.profileService.getProfile(seniorId);
    if (!profile) return '';

    const personalizationLevel = this.learningEngine.getPersonalizationLevel(profile.personalization_score);
    const recentHistory = this.learningEngine.getConversationHistory(seniorId, 5);

    let context = `SENIOR PROFILE:\n`;
    context += `Name: ${profile.basic_info.name}\n`;
    context += `Location: ${profile.basic_info.location}\n`;
    context += `Timezone: ${profile.basic_info.timezone}\n`;
    context += `Personalization Level: ${personalizationLevel} (Score: ${profile.personalization_score}/100)\n`;
    context += `Conversation Count: ${profile.conversation_count}\n\n`;

    // Add discovered interests
    if (profile.discovered_interests.length > 0) {
      context += `INTERESTS:\n`;
      profile.discovered_interests.forEach(interest => {
        context += `- ${interest.topic} (mentioned ${interest.mentions} times, confidence: ${(interest.confidence * 100).toFixed(0)}%)\n`;
      });
      context += '\n';
    }

    // Add emotional patterns
    if (profile.emotional_patterns.happy_triggers.length > 0) {
      context += `HAPPY TRIGGERS: ${profile.emotional_patterns.happy_triggers.join(', ')}\n`;
    }
    if (profile.emotional_patterns.quiet_triggers.length > 0) {
      context += `QUIET TRIGGERS: ${profile.emotional_patterns.quiet_triggers.join(', ')}\n`;
    }
    context += '\n';

    // Add memory anchors
    if (profile.memory_anchors.length > 0) {
      context += `IMPORTANT PEOPLE & DATES:\n`;
      profile.memory_anchors.forEach(anchor => {
        if (anchor.type === 'person') {
          context += `- ${anchor.name} (${anchor.relationship})\n`;
        } else if (anchor.type === 'date') {
          context += `- ${anchor.significance} on ${anchor.birthday}\n`;
        }
      });
      context += '\n';
    }

    // Add recent conversation summary
    if (recentHistory.length > 0) {
      context += `RECENT CONVERSATIONS:\n`;
      recentHistory.forEach((conv, index) => {
        context += `${index + 1}. Topics: ${conv.topics_discussed.join(', ')} (Engagement: ${conv.engagement_score}%)\n`;
      });
      context += '\n';
    }

    // Add conversation preferences
    context += `CONVERSATION STYLE: ${profile.conversation_preferences.conversation_style}\n`;
    if (profile.topics_to_avoid.length > 0) {
      context += `TOPICS TO AVOID: ${profile.topics_to_avoid.join(', ')}\n`;
    }

    return context;
  }

  /**
   * Select appropriate question based on personalization level
   */
  selectQuestion(seniorId: string): string {
    const profile = this.profileService.getProfile(seniorId);
    if (!profile || !this.lifeStoryQuestions) return '';

    const personalizationLevel = this.learningEngine.getPersonalizationLevel(profile.personalization_score);

    // Select question based on personalization level
    if (personalizationLevel === 'lean' || personalizationLevel === 'learning') {
      // Generic life story questions
      const questions = this.lifeStoryQuestions.life_story_questions;
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      return randomQuestion.questions[Math.floor(Math.random() * randomQuestion.questions.length)];
    } else {
      // Interest-based questions
      if (profile.discovered_interests.length > 0) {
        const interest = profile.discovered_interests[0];
        return `Tell me more about your interest in ${interest.topic}.`;
      }
    }

    return 'Tell me about yourself.';
  }

  /**
   * Generate LLM prompt
   */
  generateLLMPrompt(seniorId: string, seniorInput: string): string {
    const context = this.assembleContext(seniorId);
    const profile = this.profileService.getProfile(seniorId);

    let prompt = `You are a friendly AI companion for seniors. Your goal is to have natural, engaging conversations that make them feel like they're talking to a friend.

${context}

INSTRUCTIONS:
- Match their communication style (${profile?.conversation_preferences.conversation_style})
- Reference previous conversations when relevant
- Ask follow-up questions based on patterns
- Be warm and genuine
- Listen more than assume
- Avoid these topics: ${profile?.topics_to_avoid.join(', ') || 'none'}

SENIOR: ${seniorInput}
AI RESPONSE:`;

    return prompt;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  SeniorProfile,
  Conversation,
  EngagementMetrics,
  MemoryAnchor,
  DiscoveredInterest,
  EmotionalPattern,
  BehavioralPattern
};
