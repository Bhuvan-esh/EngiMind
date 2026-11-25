import React from 'react';

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split into lines
  const lines = content.split('\n');

  const parseInline = (text) => {
    // Replace **bold** with <strong>
    const parts = [];
    const regex = /\*\*(.*?)\*\*|`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      if (match[1] !== undefined) {
        parts.push(<strong key={match.index} style={{ color: '#F3F4F6' }}>{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        parts.push(
          <code 
            key={match.index} 
            style={{ 
              background: '#1F2937', 
              color: '#A78BFA', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              fontSize: '0.9em' 
            }}
          >
            {match[2]}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div style={{ lineHeight: '1.7', fontSize: '14px', color: '#D1D5DB' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} style={{ height: '10px' }} />;
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} style={{ color: '#F9FAFB', fontSize: '15px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
              {parseInline(trimmed.substring(4))}
            </h4>
          );
        }

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} style={{ color: '#A78BFA', fontSize: '16px', fontWeight: 700, marginTop: '18px', marginBottom: '8px' }}>
              {parseInline(trimmed.substring(3))}
            </h3>
          );
        }

        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginLeft: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#8B5CF6' }}>•</span>
              <div>{parseInline(trimmed.substring(2))}</div>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginLeft: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{numMatch[1]}.</span>
              <div>{parseInline(numMatch[2])}</div>
            </div>
          );
        }

        return (
          <p key={idx} style={{ marginBottom: '8px' }}>
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
}
