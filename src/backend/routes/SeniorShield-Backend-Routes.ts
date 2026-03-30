/**
 * SeniorShield Backend Routes
 * Express API endpoints for the adaptive learning system
 */

import express, { Router, Request, Response } from 'express';
import {
  SeniorProfileService,
  AdaptiveLearningEngine,
  ContextAssemblyEngine,
  Conversation,
  MemoryAnchor,
  DiscoveredInterest
} from '../services/SeniorShield-Backend-Implementation';

const router = Router();

// Initialize services
const profileService = new SeniorProfileService();
const learningEngine = new AdaptiveLearningEngine(profileService);
const contextEngine = new ContextAssemblyEngine(profileService, learningEngine);

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

/**
 * POST /api/profiles
 * Create a new senior profile
 */
router.post('/api/profiles', (req: Request, res: Response) => {
  try {
    const { seniorId, name, location, timezone } = req.body;

    if (!seniorId || !name || !location || !timezone) {
      return res.status(400).json({
        error: 'Missing required fields: seniorId, name, location, timezone'
      });
    }

    const profile = profileService.createProfile(seniorId, {
      name,
      location,
      timezone
    });

    res.status(201).json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

/**
 * GET /api/profiles/:seniorId
 * Get a senior profile
 */
router.get('/api/profiles/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * PUT /api/profiles/:seniorId
 * Update a senior profile
 */
router.put('/api/profiles/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update allowed fields
    if (req.body.conversation_preferences) {
      profile.conversation_preferences = {
        ...profile.conversation_preferences,
        ...req.body.conversation_preferences
      };
    }

    if (req.body.topics_to_avoid) {
      profile.topics_to_avoid = req.body.topics_to_avoid;
    }

    profileService.updateProfile(profile);

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================================================
// CONVERSATION ENDPOINTS
// ============================================================================

/**
 * POST /api/conversations
 * Process a conversation and update profile
 */
router.post('/api/conversations', (req: Request, res: Response) => {
  try {
    const {
      seniorId,
      conversationId,
      seniorInput,
      aiResponse,
      topicsDiscussed,
      emotionalTone,
      engagementScore,
      newMemoryAnchors,
      durationSeconds
    } = req.body;

    if (!seniorId || !seniorInput || !aiResponse) {
      return res.status(400).json({
        error: 'Missing required fields: seniorId, seniorInput, aiResponse'
      });
    }

    const profile = profileService.getProfile(seniorId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Create conversation record
    const conversation: Conversation = {
      conversation_id: conversationId || `conv_${Date.now()}`,
      senior_id: seniorId,
      timestamp: new Date(),
      duration_seconds: durationSeconds || 0,
      senior_input: seniorInput,
      ai_response: aiResponse,
      topics_discussed: topicsDiscussed || [],
      emotional_tone: emotionalTone || 'neutral',
      engagement_score: engagementScore || 50,
      new_memory_anchors: newMemoryAnchors
    };

    // Analyze conversation and update profile
    learningEngine.analyzeConversation(conversation);

    res.json({
      success: true,
      message: 'Conversation processed',
      personalizationScore: profile.personalization_score,
      conversationCount: profile.conversation_count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process conversation' });
  }
});

/**
 * GET /api/conversations/:seniorId
 * Get conversation history for a senior
 */
router.get('/api/conversations/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const history = learningEngine.getConversationHistory(seniorId, limit);

    res.json({
      seniorId,
      conversationCount: history.length,
      conversations: history
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

// ============================================================================
// CONTEXT ENDPOINTS
// ============================================================================

/**
 * GET /api/context/:seniorId
 * Get assembled context for LLM
 */
router.get('/api/context/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const context = contextEngine.assembleContext(seniorId);
    const personalizationLevel = learningEngine.getPersonalizationLevel(profile.personalization_score);

    res.json({
      seniorId,
      personalizationScore: profile.personalization_score,
      personalizationLevel,
      context,
      conversationCount: profile.conversation_count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assemble context' });
  }
});

/**
 * POST /api/llm-prompt
 * Generate LLM prompt with context
 */
router.post('/api/llm-prompt', (req: Request, res: Response) => {
  try {
    const { seniorId, seniorInput } = req.body;

    if (!seniorId || !seniorInput) {
      return res.status(400).json({
        error: 'Missing required fields: seniorId, seniorInput'
      });
    }

    const profile = profileService.getProfile(seniorId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const prompt = contextEngine.generateLLMPrompt(seniorId, seniorInput);

    res.json({
      seniorId,
      prompt,
      personalizationScore: profile.personalization_score
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate prompt' });
  }
});

/**
 * GET /api/next-question/:seniorId
 * Get the next question to ask
 */
router.get('/api/next-question/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const question = contextEngine.selectQuestion(seniorId);
    const personalizationLevel = learningEngine.getPersonalizationLevel(profile.personalization_score);

    res.json({
      seniorId,
      question,
      personalizationLevel,
      personalizationScore: profile.personalization_score
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to select question' });
  }
});

// ============================================================================
// INSIGHTS ENDPOINTS
// ============================================================================

/**
 * GET /api/insights/:seniorId
 * Get insights about a senior
 */
router.get('/api/insights/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      seniorId,
      personalizationScore: profile.personalization_score,
      personalizationLevel: learningEngine.getPersonalizationLevel(profile.personalization_score),
      conversationCount: profile.conversation_count,
      discoveredInterests: profile.discovered_interests,
      emotionalPatterns: profile.emotional_patterns,
      memoryAnchors: profile.memory_anchors,
      behavioralPatterns: profile.behavioral_patterns,
      learningHistory: profile.learning_history.slice(-10) // Last 10 discoveries
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve insights' });
  }
});

/**
 * GET /api/interests/:seniorId
 * Get discovered interests for a senior
 */
router.get('/api/interests/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const interests = profile.discovered_interests.sort((a, b) => b.confidence - a.confidence);

    res.json({
      seniorId,
      interests,
      totalInterests: interests.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve interests' });
  }
});

/**
 * GET /api/memory-anchors/:seniorId
 * Get memory anchors for a senior
 */
router.get('/api/memory-anchors/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const anchors = profile.memory_anchors;

    res.json({
      seniorId,
      anchors,
      totalAnchors: anchors.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve memory anchors' });
  }
});

// ============================================================================
// LEARNING HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/learning-history/:seniorId
 * Get learning history for a senior
 */
router.get('/api/learning-history/:seniorId', (req: Request, res: Response) => {
  try {
    const { seniorId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const profile = profileService.getProfile(seniorId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const history = profile.learning_history.slice(-limit);

    res.json({
      seniorId,
      learningHistory: history,
      totalDiscoveries: profile.learning_history.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve learning history' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'SeniorShield Adaptive Learning Engine'
  });
});

export default router;
