export const parseAIResponse = (rawText) => {
  try {
    console.log('Parsing AI response, first 200 chars:', rawText.substring(0, 200));

    // Strip markdown fences if present
    let cleanText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    console.log('Cleaned text, first 200 chars:', cleanText.substring(0, 200));

    const parsed = JSON.parse(cleanText);
    console.log('JSON parsed successfully');

    // Validate required fields
    if (!parsed.summary || !parsed.verdict || !Array.isArray(parsed.suggestions)) {
      console.error('Missing required fields in response:', { 
        hasSummary: !!parsed.summary,
        hasVerdict: !!parsed.verdict,
        hasSuggestions: Array.isArray(parsed.suggestions)
      });
      return createFallbackResponse('Invalid response structure from AI');
    }

    // Add confidence labels and bands to suggestions
    parsed.suggestions = parsed.suggestions.map((suggestion) => ({
      ...suggestion,
      confidenceLabel: getConfidenceLabel(suggestion.confidence),
      confidenceBand: getConfidenceBand(suggestion.confidence),
    }));

    console.log('Successfully parsed and enhanced response with', parsed.suggestions.length, 'suggestions');
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error.message);
    console.error('Raw text:', rawText.substring(0, 500));
    return createFallbackResponse('Failed to parse AI response: ' + error.message);
  }
};


const getConfidenceLabel = (score) => {
  if (score >= 85) return 'High';
  if (score >= 60) return 'Moderate';
  if (score >= 35) return 'Low';
  return 'Speculative';
};

const getConfidenceBand = (score) => {
  if (score >= 85) return 'green';
  if (score >= 60) return 'amber';
  if (score >= 35) return 'orange';
  return 'red';
};

const createFallbackResponse = (message) => {
  return {
    summary: message,
    verdict: 'needs_revision',
    suggestions: [
      {
        id: 'parse_error',
        title: 'Review Processing Error',
        description: message,
        lineRef: null,
        severity: 'high',
        confidence: 100,
        confidenceReason: 'System error',
        confidenceLabel: 'High',
        confidenceBand: 'red',
        category: 'system',
      },
    ],
  };
};
