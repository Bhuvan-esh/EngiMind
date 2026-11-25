import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Sparkles, Send } from 'lucide-react';
import { callOpenRouter } from '../openRouterApi';

const presetTopics = [
  "Bearing Mechanics & Vibration",
  "Thermodynamics & Heat Exchangers",
  "PLC, SCADA & Industrial Automation",
  "Centrifugal Pumps & Cavitation",
  "Electric Motors & VFDs"
];

export default function QuizView({ onShowToast }) {
  const [selectedTopic, setSelectedTopic] = useState(presetTopics[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIdx]: selectedOptionIdx }
  const [submitted, setSubmitted] = useState(false);

  const activeTopic = customTopic.trim() || selectedTopic;

  const handleGenerateQuiz = async () => {
    if (!activeTopic) return;
    setIsLoading(true);
    setQuizQuestions(null);
    setUserAnswers({});
    setSubmitted(false);

    try {
      const prompt = `You are an expert engineering professor. Generate a 3-question multiple-choice technical quiz about "${activeTopic}".
Return ONLY a valid JSON array of objects with keys:
- "question": string
- "options": array of 4 string choices
- "answer": integer index (0-3) of the correct choice
- "explanation": string explaining the underlying engineering principles.
Ensure pure JSON output.`;

      const result = await callOpenRouter({ prompt, jsonMode: true });
      if (Array.isArray(result) && result.length > 0) {
        setQuizQuestions(result);
        if (onShowToast) onShowToast(`Generated quiz on ${activeTopic}`);
      } else {
        throw new Error("Invalid quiz format returned.");
      }
    } catch (err) {
      if (onShowToast) onShowToast(`Error generating quiz: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectAnswer = (qIdx, optIdx) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    if (!quizQuestions) return 0;
    return quizQuestions.reduce((score, q, idx) => {
      return userAnswers[idx] === q.answer ? score + 1 : score;
    }, 0);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '16px', color: '#8B5CF6', marginBottom: '12px' }}>
          <HelpCircle size={36} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#F9FAFB' }}>Interactive Engineering Quiz</h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '6px' }}>
          Test and reinforce your technical knowledge with AI-generated engineering quizzes.
        </p>
      </div>

      {/* Topic Selection */}
      <div style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px' }}>
          Select or Enter an Engineering Topic:
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {presetTopics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedTopic(t);
                setCustomTopic('');
              }}
              style={{
                background: (!customTopic && selectedTopic === t) ? 'rgba(139, 92, 246, 0.25)' : '#111827',
                border: `1px solid ${(!customTopic && selectedTopic === t) ? '#8B5CF6' : '#374151'}`,
                color: (!customTopic && selectedTopic === t) ? '#C4B5FD' : '#9CA3AF',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Or type custom topic (e.g. Steam Turbines, Finite Element Analysis)..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            style={{
              flex: 1,
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#F9FAFB',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleGenerateQuiz}
            disabled={isLoading || !activeTopic}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !activeTopic) ? 0.6 : 1
            }}
          >
            {isLoading ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} />}
            {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
          </button>
        </div>
      </div>

      {/* Quiz Questions */}
      {quizQuestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {quizQuestions.map((q, qIdx) => {
            const hasAnswered = userAnswers[qIdx] !== undefined;
            const isCorrect = userAnswers[qIdx] === q.answer;

            return (
              <div 
                key={qIdx}
                style={{ 
                  background: '#1F2937', 
                  border: '1px solid #374151', 
                  borderRadius: '14px', 
                  padding: '20px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>
                    QUESTION {qIdx + 1} OF {quizQuestions.length}
                  </span>
                  {submitted && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: isCorrect ? '#10B981' : '#EF4444' }}>
                      {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '15px', fontWeight: 600, color: '#F3F4F6', marginBottom: '16px' }}>
                  {q.question}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswers[qIdx] === optIdx;
                    let bg = '#111827';
                    let borderColor = '#374151';
                    let textColor = '#D1D5DB';

                    if (submitted) {
                      if (optIdx === q.answer) {
                        bg = 'rgba(16, 185, 129, 0.2)';
                        borderColor = '#10B981';
                        textColor = '#6EE7B7';
                      } else if (isSelected && optIdx !== q.answer) {
                        bg = 'rgba(239, 68, 68, 0.2)';
                        borderColor = '#EF4444';
                        textColor = '#FCA5A5';
                      }
                    } else if (isSelected) {
                      bg = 'rgba(139, 92, 246, 0.2)';
                      borderColor = '#8B5CF6';
                      textColor = '#C4B5FD';
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => selectAnswer(qIdx, optIdx)}
                        style={{
                          background: bg,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: textColor,
                          cursor: submitted ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          background: isSelected ? '#8B5CF6' : '#374151',
                          color: isSelected ? '#fff' : '#9CA3AF',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {submitted && q.explanation && (
                  <div style={{ 
                    marginTop: '14px', 
                    padding: '12px', 
                    background: 'rgba(0,0,0,0.25)', 
                    borderRadius: '8px', 
                    borderLeft: `3px solid ${isCorrect ? '#10B981' : '#F59E0B'}`,
                    fontSize: '12px',
                    color: '#9CA3AF'
                  }}>
                    <strong style={{ color: '#E5E7EB' }}>Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit / Results Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            {!submitted ? (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(userAnswers).length < quizQuestions.length}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: Object.keys(userAnswers).length < quizQuestions.length ? 'not-allowed' : 'pointer',
                  opacity: Object.keys(userAnswers).length < quizQuestions.length ? 0.5 : 1
                }}
              >
                Submit Answers ({Object.keys(userAnswers).length}/{quizQuestions.length})
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '15px', color: '#F3F4F6' }}>
                  Score: <strong style={{ color: '#10B981', fontSize: '18px' }}>{calculateScore()}</strong> / {quizQuestions.length} ({Math.round((calculateScore() / quizQuestions.length) * 100)}%)
                </div>
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#374151',
                    border: '1px solid #4B5563',
                    borderRadius: '10px',
                    color: '#F9FAFB',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={15} /> Try Another Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
