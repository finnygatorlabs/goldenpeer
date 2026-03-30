/**
 * SeniorShield Frontend Components
 * React components for onboarding and conversation UI
 */

import React, { useState, useEffect, useRef } from 'react';
import './SeniorShield-Frontend-Components.css';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingData {
  name: string;
  location: string;
  timezone: string;
  interests: string[];
}

interface ConversationMessage {
  id: string;
  sender: 'senior' | 'ai';
  text: string;
  timestamp: Date;
}

interface SeniorProfile {
  senior_id: string;
  personalization_score: number;
  conversation_count: number;
  discovered_interests: Array<{ topic: string; confidence: number }>;
  memory_anchors: Array<{ name: string; relationship: string }>;
}

// ============================================================================
// ONBOARDING COMPONENT
// ============================================================================

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingFlow: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    interests: []
  });

  const interestOptions = [
    'Gardening',
    'Sports',
    'Reading',
    'Cooking',
    'Travel',
    'Movies',
    'Music',
    'Family',
    'Crafts',
    'Outdoor Activities'
  ];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, name: e.target.value });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, location: e.target.value });
  };

  const handleInterestToggle = (interest: string) => {
    const newInterests = data.interests.includes(interest)
      ? data.interests.filter(i => i !== interest)
      : [...data.interests, interest].slice(0, 3); // Max 3 interests

    setData({ ...data, interests: newInterests });
  };

  const handleNext = () => {
    if (step === 1 && data.name && data.location) {
      setStep(2);
    } else if (step === 2 && data.interests.length > 0) {
      onComplete(data);
    }
  };

  const handleSkip = () => {
    if (step === 1) {
      setStep(2);
    } else {
      onComplete(data);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {step === 1 ? (
          <OnboardingStep1
            data={data}
            onNameChange={handleNameChange}
            onLocationChange={handleLocationChange}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        ) : (
          <OnboardingStep2
            interests={interestOptions}
            selectedInterests={data.interests}
            onInterestToggle={handleInterestToggle}
            onComplete={handleNext}
            onSkip={handleSkip}
          />
        )}
      </div>
    </div>
  );
};

interface Step1Props {
  data: OnboardingData;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const OnboardingStep1: React.FC<Step1Props> = ({
  data,
  onNameChange,
  onLocationChange,
  onNext,
  onSkip
}) => {
  return (
    <div className="onboarding-step">
      <h1>Welcome to SeniorShield</h1>
      <p className="subtitle">Let's get to know you!</p>

      <div className="form-group">
        <label htmlFor="name">What's your name?</label>
        <input
          id="name"
          type="text"
          placeholder="Enter your name"
          value={data.name}
          onChange={onNameChange}
          className="input-field"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">What city do you live in?</label>
        <input
          id="location"
          type="text"
          placeholder="Enter your city"
          value={data.location}
          onChange={onLocationChange}
          className="input-field"
        />
      </div>

      <div className="button-group">
        <button
          onClick={onNext}
          disabled={!data.name || !data.location}
          className="button button-primary"
        >
          Next
        </button>
        <button onClick={onSkip} className="button button-secondary">
          Skip
        </button>
      </div>
    </div>
  );
};

interface Step2Props {
  interests: string[];
  selectedInterests: string[];
  onInterestToggle: (interest: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingStep2: React.FC<Step2Props> = ({
  interests,
  selectedInterests,
  onInterestToggle,
  onComplete,
  onSkip
}) => {
  return (
    <div className="onboarding-step">
      <h1>What are your interests?</h1>
      <p className="subtitle">Select up to 3 topics you'd like to talk about</p>

      <div className="interests-grid">
        {interests.map(interest => (
          <button
            key={interest}
            onClick={() => onInterestToggle(interest)}
            className={`interest-button ${selectedInterests.includes(interest) ? 'selected' : ''}`}
          >
            {interest}
          </button>
        ))}
      </div>

      <div className="button-group">
        <button
          onClick={onComplete}
          disabled={selectedInterests.length === 0}
          className="button button-primary"
        >
          Get Started
        </button>
        <button onClick={onSkip} className="button button-secondary">
          Skip
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// CONVERSATION COMPONENT
// ============================================================================

interface ConversationProps {
  seniorId: string;
  profile: SeniorProfile;
  onSendMessage: (message: string) => Promise<string>;
}

export const ConversationUI: React.FC<ConversationProps> = ({
  seniorId,
  profile,
  onSendMessage
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      sender: 'senior',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get AI response
      const aiResponse = await onSendMessage(inputValue);

      const aiMessage: ConversationMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ConversationMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: "I'm sorry, I had trouble understanding. Could you try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPersonalizationLevel = (score: number): string => {
    if (score < 20) return 'Getting to know you';
    if (score < 40) return 'Learning about you';
    if (score < 60) return 'Understanding you';
    if (score < 80) return 'Getting closer';
    return 'Your friend';
  };

  return (
    <div className="conversation-container">
      <div className="conversation-header">
        <div className="header-info">
          <h2>SeniorShield</h2>
          <p className="personalization-status">
            {getPersonalizationLevel(profile.personalization_score)}
          </p>
        </div>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="profile-button"
        >
          Profile
        </button>
      </div>

      {showProfile && (
        <ProfilePanel profile={profile} onClose={() => setShowProfile(false)} />
      )}

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation by saying hello!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.sender === 'senior' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message ai-message loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="message-input"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// PROFILE PANEL COMPONENT
// ============================================================================

interface ProfilePanelProps {
  profile: SeniorProfile;
  onClose: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ profile, onClose }) => {
  return (
    <div className="profile-panel">
      <div className="panel-header">
        <h3>Your Profile</h3>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>

      <div className="panel-content">
        <div className="profile-section">
          <h4>Personalization</h4>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${profile.personalization_score}%` }}
            ></div>
          </div>
          <p className="progress-text">
            {profile.personalization_score}% personalized
          </p>
        </div>

        <div className="profile-section">
          <h4>Conversations</h4>
          <p className="stat-value">{profile.conversation_count}</p>
          <p className="stat-label">total conversations</p>
        </div>

        {profile.discovered_interests.length > 0 && (
          <div className="profile-section">
            <h4>Your Interests</h4>
            <div className="interests-list">
              {profile.discovered_interests.slice(0, 5).map(interest => (
                <div key={interest.topic} className="interest-item">
                  <span>{interest.topic}</span>
                  <span className="confidence">
                    {(interest.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.memory_anchors.length > 0 && (
          <div className="profile-section">
            <h4>Important People</h4>
            <div className="anchors-list">
              {profile.memory_anchors.slice(0, 5).map(anchor => (
                <div key={anchor.name} className="anchor-item">
                  <span>{anchor.name}</span>
                  <span className="relationship">{anchor.relationship}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

interface SeniorShieldAppProps {
  apiBaseUrl: string;
}

export const SeniorShieldApp: React.FC<SeniorShieldAppProps> = ({ apiBaseUrl }) => {
  const [seniorId, setSeniorId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SeniorProfile | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(true);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    const id = `senior_${Date.now()}`;
    setSeniorId(id);

    try {
      // Create profile via API
      const response = await fetch(`${apiBaseUrl}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId: id,
          name: data.name,
          location: data.location,
          timezone: data.timezone
        })
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(result.profile);
        setIsOnboarding(false);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const handleSendMessage = async (message: string): Promise<string> => {
    if (!seniorId) return '';

    try {
      // Get LLM prompt
      const promptResponse = await fetch(`${apiBaseUrl}/api/llm-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          seniorInput: message
        })
      });

      if (!promptResponse.ok) throw new Error('Failed to get prompt');

      const promptData = await promptResponse.json();

      // Call your LLM API here (e.g., OpenAI)
      // For now, return a placeholder
      const aiResponse = `This is where the AI response would go. The system has learned about you and will provide personalized responses.`;

      // Log conversation
      await fetch(`${apiBaseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          seniorInput: message,
          aiResponse,
          topicsDiscussed: [],
          emotionalTone: 'positive',
          engagementScore: 75
        })
      });

      // Refresh profile
      const profileResponse = await fetch(`${apiBaseUrl}/api/profiles/${seniorId}`);
      if (profileResponse.ok) {
        setProfile(await profileResponse.json());
      }

      return aiResponse;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  if (isOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (!seniorId || !profile) {
    return <div>Loading...</div>;
  }

  return (
    <ConversationUI
      seniorId={seniorId}
      profile={profile}
      onSendMessage={handleSendMessage}
    />
  );
};

export default SeniorShieldApp;
