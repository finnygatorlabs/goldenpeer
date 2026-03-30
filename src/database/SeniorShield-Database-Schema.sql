/**
 * SeniorShield Database Schema
 * PostgreSQL schema for adaptive learning system
 */

-- ============================================================================
-- SENIORS TABLE
-- ============================================================================

CREATE TABLE seniors (
  senior_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  personalization_score INTEGER DEFAULT 0 CHECK (personalization_score >= 0 AND personalization_score <= 100),
  conversation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_conversation_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_seniors_created_at ON seniors(created_at);
CREATE INDEX idx_seniors_is_active ON seniors(is_active);

-- ============================================================================
-- DISCOVERED INTERESTS TABLE
-- ============================================================================

CREATE TABLE discovered_interests (
  interest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  topic VARCHAR(255) NOT NULL,
  mentions INTEGER DEFAULT 1,
  confidence DECIMAL(3, 2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  first_discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_mentioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_discovered_interests_senior_id ON discovered_interests(senior_id);
CREATE INDEX idx_discovered_interests_confidence ON discovered_interests(confidence DESC);
CREATE UNIQUE INDEX idx_discovered_interests_unique ON discovered_interests(senior_id, topic);

-- ============================================================================
-- EMOTIONAL PATTERNS TABLE
-- ============================================================================

CREATE TABLE emotional_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  happy_triggers TEXT[] DEFAULT '{}',
  quiet_triggers TEXT[] DEFAULT '{}',
  excited_triggers TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emotional_patterns_senior_id ON emotional_patterns(senior_id);
CREATE UNIQUE INDEX idx_emotional_patterns_unique ON emotional_patterns(senior_id);

-- ============================================================================
-- MEMORY ANCHORS TABLE
-- ============================================================================

CREATE TABLE memory_anchors (
  anchor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  anchor_type VARCHAR(50) NOT NULL CHECK (anchor_type IN ('person', 'date', 'place', 'event')),
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(255),
  birthday VARCHAR(5), -- MM-DD format
  significance TEXT,
  mentions INTEGER DEFAULT 1,
  first_discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_mentioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memory_anchors_senior_id ON memory_anchors(senior_id);
CREATE INDEX idx_memory_anchors_type ON memory_anchors(anchor_type);
CREATE UNIQUE INDEX idx_memory_anchors_unique ON memory_anchors(senior_id, anchor_type, name);

-- ============================================================================
-- BEHAVIORAL PATTERNS TABLE
-- ============================================================================

CREATE TABLE behavioral_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  preferred_call_time TIME,
  average_call_duration_seconds INTEGER,
  first_topic VARCHAR(255),
  engagement_level VARCHAR(50) DEFAULT 'moderate' CHECK (engagement_level IN ('low', 'moderate', 'high')),
  response_pattern VARCHAR(50) CHECK (response_pattern IN ('storyteller', 'direct_responder', 'question_asker', 'reflective')),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_behavioral_patterns_senior_id ON behavioral_patterns(senior_id);
CREATE UNIQUE INDEX idx_behavioral_patterns_unique ON behavioral_patterns(senior_id);

-- ============================================================================
-- CONVERSATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE conversation_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  preferred_topics TEXT[] DEFAULT '{}',
  topics_to_avoid TEXT[] DEFAULT '{}',
  conversation_style VARCHAR(50) DEFAULT 'casual_friendly' CHECK (conversation_style IN ('formal', 'casual_friendly', 'humorous')),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_preferences_senior_id ON conversation_preferences(senior_id);
CREATE UNIQUE INDEX idx_conversation_preferences_unique ON conversation_preferences(senior_id);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  conversation_number INTEGER NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  senior_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  topics_discussed TEXT[] DEFAULT '{}',
  emotional_tone VARCHAR(50) CHECK (emotional_tone IN ('positive', 'neutral', 'negative')),
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  new_interests_discovered TEXT[] DEFAULT '{}',
  new_patterns_discovered TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_senior_id ON conversations(senior_id);
CREATE INDEX idx_conversations_started_at ON conversations(started_at DESC);
CREATE INDEX idx_conversations_engagement_score ON conversations(engagement_score DESC);

-- ============================================================================
-- LEARNING HISTORY TABLE
-- ============================================================================

CREATE TABLE learning_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  call_number INTEGER NOT NULL,
  discovery TEXT NOT NULL,
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  discovery_type VARCHAR(100),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_history_senior_id ON learning_history(senior_id);
CREATE INDEX idx_learning_history_discovered_at ON learning_history(discovered_at DESC);

-- ============================================================================
-- ENGAGEMENT METRICS TABLE
-- ============================================================================

CREATE TABLE engagement_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES seniors(senior_id) ON DELETE CASCADE,
  metric_date DATE DEFAULT CURRENT_DATE,
  call_duration_seconds INTEGER,
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  topics_discussed TEXT[] DEFAULT '{}',
  emotional_tone VARCHAR(50),
  personalization_score INTEGER,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_engagement_metrics_senior_id ON engagement_metrics(senior_id);
CREATE INDEX idx_engagement_metrics_date ON engagement_metrics(metric_date DESC);
CREATE INDEX idx_engagement_metrics_engagement_score ON engagement_metrics(engagement_score DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Senior Profile Summary
CREATE VIEW senior_profile_summary AS
SELECT
  s.senior_id,
  s.name,
  s.location,
  s.timezone,
  s.personalization_score,
  s.conversation_count,
  s.created_at,
  s.last_conversation_at,
  COUNT(DISTINCT c.conversation_id) as total_conversations,
  COUNT(DISTINCT di.interest_id) as total_interests,
  COUNT(DISTINCT ma.anchor_id) as total_memory_anchors,
  COALESCE(AVG(c.engagement_score), 0)::INTEGER as average_engagement_score
FROM seniors s
LEFT JOIN conversations c ON s.senior_id = c.senior_id
LEFT JOIN discovered_interests di ON s.senior_id = di.senior_id
LEFT JOIN memory_anchors ma ON s.senior_id = ma.senior_id
GROUP BY s.senior_id, s.name, s.location, s.timezone, s.personalization_score, s.conversation_count, s.created_at, s.last_conversation_at;

-- View: Top Interests by Senior
CREATE VIEW top_interests_by_senior AS
SELECT
  senior_id,
  topic,
  mentions,
  confidence,
  ROW_NUMBER() OVER (PARTITION BY senior_id ORDER BY confidence DESC, mentions DESC) as rank
FROM discovered_interests
WHERE confidence >= 0.5;

-- View: Recent Conversations
CREATE VIEW recent_conversations AS
SELECT
  c.conversation_id,
  c.senior_id,
  c.conversation_number,
  c.started_at,
  c.duration_seconds,
  c.engagement_score,
  c.emotional_tone,
  s.name,
  s.personalization_score
FROM conversations c
JOIN seniors s ON c.senior_id = s.senior_id
ORDER BY c.started_at DESC
LIMIT 1000;

-- View: Engagement Trends
CREATE VIEW engagement_trends AS
SELECT
  senior_id,
  metric_date,
  AVG(engagement_score)::INTEGER as avg_engagement,
  MAX(engagement_score) as max_engagement,
  MIN(engagement_score) as min_engagement,
  COUNT(*) as call_count
FROM engagement_metrics
GROUP BY senior_id, metric_date
ORDER BY senior_id, metric_date DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update senior last_updated timestamp
CREATE OR REPLACE FUNCTION update_senior_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seniors SET last_updated = CURRENT_TIMESTAMP WHERE senior_id = NEW.senior_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update senior conversation count
CREATE OR REPLACE FUNCTION update_senior_conversation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seniors 
  SET conversation_count = (SELECT COUNT(*) FROM conversations WHERE senior_id = NEW.senior_id),
      last_conversation_at = CURRENT_TIMESTAMP
  WHERE senior_id = NEW.senior_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update memory anchor last_mentioned_at
CREATE OR REPLACE FUNCTION update_memory_anchor_last_mentioned()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE memory_anchors 
  SET last_mentioned_at = CURRENT_TIMESTAMP,
      mentions = mentions + 1
  WHERE anchor_id = NEW.anchor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_update_senior_last_updated
AFTER UPDATE ON seniors
FOR EACH ROW
EXECUTE FUNCTION update_senior_last_updated();

CREATE TRIGGER trigger_update_senior_conversation_count
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_senior_conversation_count();

CREATE TRIGGER trigger_update_memory_anchor_last_mentioned
AFTER UPDATE ON memory_anchors
FOR EACH ROW
EXECUTE FUNCTION update_memory_anchor_last_mentioned();

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
INSERT INTO seniors (name, location, timezone, personalization_score, conversation_count)
VALUES ('Margaret Johnson', 'Seattle, WA', 'America/Los_Angeles', 45, 12);

INSERT INTO discovered_interests (senior_id, topic, mentions, confidence)
SELECT senior_id, 'gardening', 5, 0.9 FROM seniors WHERE name = 'Margaret Johnson';

INSERT INTO memory_anchors (senior_id, anchor_type, name, relationship, birthday)
SELECT senior_id, 'person', 'Tommy', 'grandson', '05-15' FROM seniors WHERE name = 'Margaret Johnson';
*/

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_conversations_senior_date ON conversations(senior_id, started_at DESC);
CREATE INDEX idx_engagement_metrics_senior_date ON engagement_metrics(senior_id, metric_date DESC);
CREATE INDEX idx_learning_history_senior_date ON learning_history(senior_id, discovered_at DESC);

-- Partial indexes for active records
CREATE INDEX idx_seniors_active ON seniors(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_conversations_recent ON conversations(started_at DESC) WHERE started_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ============================================================================
-- GRANTS (adjust as needed for your user)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE ON seniors TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON discovered_interests TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON emotional_patterns TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON memory_anchors TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON behavioral_patterns TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON conversation_preferences TO app_user;
-- GRANT SELECT, INSERT ON conversations TO app_user;
-- GRANT SELECT, INSERT ON learning_history TO app_user;
-- GRANT SELECT, INSERT ON engagement_metrics TO app_user;
-- GRANT SELECT ON senior_profile_summary TO app_user;
-- GRANT SELECT ON top_interests_by_senior TO app_user;
-- GRANT SELECT ON recent_conversations TO app_user;
-- GRANT SELECT ON engagement_trends TO app_user;
