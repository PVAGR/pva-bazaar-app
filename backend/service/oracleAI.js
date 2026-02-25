const { getAIConfig, chatCompletions } = require('./aiProvider');

/**
 * Oracle AI Engine - Generates spiritual assessments using OpenAI or DeepSeek
 */
class OracleAIEngine {
  constructor() {
    this.config = getAIConfig();
    if (!this.config) {
      console.warn('⚠️ DEEPSEEK_API_KEY / OPENAI_API_KEY not set - Oracle AI features will be limited');
    }
  }

  /**
   * Generate comprehensive Oracle Assessment
   * @param {Object} personalData - User's personal information
   * @param {Object} spiritualProfile - User's spiritual preferences
   * @returns {Promise<Object>} Oracle assessment results
   */
  async generateAssessment(personalData, spiritualProfile) {
    if (!this.config) {
      return this.generateMockAssessment(personalData, spiritualProfile);
    }

    try {
      const prompt = this.buildOraclePrompt(personalData, spiritualProfile);
      const systemPrompt = 'You are a wise spiritual oracle with deep knowledge of astrology, numerology, ancient wisdom traditions, and holistic wellness. Provide profound, uplifting, and actionable guidance. Your responses should be deeply personal, spiritually meaningful, and practically applicable. Format your response as valid JSON.';

      const content = await chatCompletions({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        maxTokens: 3000,
        extra: {
          temperature: 0.7,
          response_format: { type: 'json_object' },
        },
      });

      const parsedResults = JSON.parse(content);
      return this.formatResults(parsedResults);
    } catch (error) {
      console.error('Oracle AI generation error:', error.message);
      console.warn('Falling back to mock assessment data');
      return this.generateMockAssessment(personalData, spiritualProfile);
    }
  }

  /**
   * Build the Oracle prompt from user data
   */
  buildOraclePrompt(personalData, spiritualProfile) {
    return `
Create a comprehensive Oracle Assessment for ${personalData.fullName}.

BIRTH DATA:
- Date: ${personalData.birthDate}
- Time: ${personalData.birthTime}
- Place: ${personalData.birthPlace}
${personalData.physicalStats ? `
- Physical: ${personalData.physicalStats.height || 'N/A'}cm, ${personalData.physicalStats.weight || 'N/A'}kg
- Eyes: ${personalData.physicalStats.eyeColor || 'N/A'}
- Hair: ${personalData.physicalStats.hairColor || 'N/A'}
` : ''}

SPIRITUAL PROFILE:
- Meditation Practice: ${spiritualProfile.meditation ? 'Yes' : 'No'}
- Practices: ${spiritualProfile.spiritualPractices?.join(', ') || 'None specified'}
- Significant Numbers: ${spiritualProfile.significantNumbers?.join(', ') || 'None'}
- Animal Connections: ${spiritualProfile.animalConnections?.join(', ') || 'None'}
- Personal Symbols: ${spiritualProfile.personalSymbols?.join(', ') || 'None'}
- Life Goals: ${spiritualProfile.lifeGoals?.join(', ') || 'None specified'}

Please provide a comprehensive assessment in JSON format with these exact sections:

{
  "cosmicSignature": {
    "astrological": {
      "sunSign": "...",
      "moonSign": "...",
      "risingSign": "...",
      "keyAspects": ["..."],
      "strengths": ["..."],
      "challenges": ["..."]
    },
    "numerological": {
      "lifePathNumber": "...",
      "expressionNumber": "...",
      "soulUrgeNumber": "...",
      "interpretation": "..."
    },
    "synthesis": "A beautiful synthesis paragraph connecting astrological and numerological insights..."
  },
  "bodyBlueprint": {
    "dietRecommendations": ["..."],
    "exerciseGuidance": ["..."],
    "wellnessRituals": ["..."]
  },
  "uniqueRevelation": {
    "hiddenTalents": ["..."],
    "lifePURPOSE": "A profound statement about their life purpose...",
    "spiritualGifts": ["..."],
    "challenges": ["..."]
  },
  "goldenPath": {
    "immediateSteps": ["..."],
    "monthlyGoals": ["..."],
    "yearlyVision": "A vision statement for the coming year...",
    "sacredPractices": ["..."]
  }
}

Make it deeply personal, spiritually uplifting, and practically actionable. Draw connections between their birth data, spiritual practices, and life goals.
    `.trim();
  }

  /**
   * Format and validate AI response
   */
  formatResults(parsedResults) {
    return {
      cosmicSignature: {
        astrological: parsedResults.cosmicSignature?.astrological || {},
        numerological: parsedResults.cosmicSignature?.numerological || {},
        synthesis: parsedResults.cosmicSignature?.synthesis || 'Your cosmic signature reveals a unique spiritual path.',
      },
      bodyBlueprint: {
        dietRecommendations: parsedResults.bodyBlueprint?.dietRecommendations || [],
        exerciseGuidance: parsedResults.bodyBlueprint?.exerciseGuidance || [],
        wellnessRituals: parsedResults.bodyBlueprint?.wellnessRituals || [],
      },
      uniqueRevelation: {
        hiddenTalents: parsedResults.uniqueRevelation?.hiddenTalents || [],
        lifePURPOSE: parsedResults.uniqueRevelation?.lifePURPOSE || 'To discover and express your authentic self.',
        spiritualGifts: parsedResults.uniqueRevelation?.spiritualGifts || [],
        challenges: parsedResults.uniqueRevelation?.challenges || [],
      },
      goldenPath: {
        immediateSteps: parsedResults.goldenPath?.immediateSteps || [],
        monthlyGoals: parsedResults.goldenPath?.monthlyGoals || [],
        yearlyVision: parsedResults.goldenPath?.yearlyVision || 'A year of growth and spiritual awakening.',
        sacredPractices: parsedResults.goldenPath?.sacredPractices || [],
      },
    };
  }

  /**
   * Generate mock assessment when AI is unavailable
   */
  generateMockAssessment(personalData, spiritualProfile) {
    const birthYear = new Date(personalData.birthDate).getFullYear();
    const lifePathNumber = this.calculateLifePath(birthYear);
    
    return {
      cosmicSignature: {
        astrological: {
          sunSign: 'Calculating...',
          moonSign: 'Requires exact birth time',
          risingSign: 'Requires birth location',
          keyAspects: ['Your chart reveals unique spiritual gifts'],
          strengths: ['Intuitive', 'Compassionate', 'Creative'],
          challenges: ['Finding balance', 'Trusting intuition'],
        },
        numerological: {
          lifePathNumber: lifePathNumber.toString(),
          expressionNumber: 'Calculating...',
          soulUrgeNumber: 'Calculating...',
          interpretation: `Your Life Path Number ${lifePathNumber} suggests a path of ${this.getLifePathMeaning(lifePathNumber)}`,
        },
        synthesis: `Your cosmic signature reveals a unique spiritual path. Your birth data and spiritual practices suggest a journey of ${spiritualProfile.meditation ? 'deep inner work' : 'discovery and awakening'}.`,
      },
      bodyBlueprint: {
        dietRecommendations: [
          'Focus on whole, unprocessed foods',
          'Consider your body\'s natural rhythms',
          'Stay hydrated throughout the day',
        ],
        exerciseGuidance: [
          'Find movement that brings you joy',
          'Balance strength and flexibility',
          'Connect with nature when possible',
        ],
        wellnessRituals: [
          'Morning meditation or reflection',
          'Evening gratitude practice',
          'Regular time in nature',
        ],
      },
      uniqueRevelation: {
        hiddenTalents: [
          'Deep intuitive understanding',
          'Ability to inspire others',
          'Creative expression',
        ],
        lifePURPOSE: 'To discover and express your authentic self while helping others on their spiritual journey.',
        spiritualGifts: [
          'Empathic connection',
          'Wisdom sharing',
          'Healing presence',
        ],
        challenges: [
          'Balancing inner and outer worlds',
          'Trusting your intuition',
          'Maintaining boundaries',
        ],
      },
      goldenPath: {
        immediateSteps: [
          'Begin or deepen your meditation practice',
          'Connect with your spiritual community',
          'Explore your personal symbols and their meanings',
        ],
        monthlyGoals: [
          'Establish a daily spiritual practice',
          'Explore one new spiritual tradition',
          'Document your insights and growth',
        ],
        yearlyVision: 'A year of profound spiritual growth, self-discovery, and alignment with your true purpose.',
        sacredPractices: [
          'Daily meditation or prayer',
          'Journaling your spiritual journey',
          'Connecting with nature regularly',
        ],
      },
    };
  }

  /**
   * Calculate Life Path Number from birth year
   */
  calculateLifePath(year) {
    let num = year;
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = num.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return num;
  }

  /**
   * Get meaning for Life Path Number
   */
  getLifePathMeaning(number) {
    const meanings = {
      1: 'leadership and independence',
      2: 'cooperation and harmony',
      3: 'creativity and expression',
      4: 'stability and foundation',
      5: 'freedom and adventure',
      6: 'nurturing and responsibility',
      7: 'spiritual seeking and analysis',
      8: 'material mastery and achievement',
      9: 'humanitarian service',
      11: 'spiritual illumination',
      22: 'master builder',
      33: 'master teacher',
    };
    return meanings[number] || 'unique spiritual journey';
  }
}

module.exports = new OracleAIEngine();
