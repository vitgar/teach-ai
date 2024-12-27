import React from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './markdown.css';

interface Question {
  question: string;
  answers: string[];
  correctAnswer: string;
  bloomsLevel?: string;
  standardReference?: string;
}

interface StreamingPassageProps {
  passage: string;
  questions: Question[];
  isLoading: boolean;
}

const StreamingPassage: React.FC<StreamingPassageProps> = ({
  passage,
  questions,
  isLoading,
}) => {
  const formatContent = (content: string) => {
    // Split into passage and questions sections
    const [passageSection, questionsSection] = content.split('## Questions');
    
    // Process passage
    const lines = passageSection.split('\n');
    const title = lines[0]
      .replace(/^# /, '')
      .replace(/\*\*/g, '')
      .replace('[[ANSWER_KEY_START]]', '');
    const passageContent = lines.slice(1).join('\n');

    // Process questions if they exist
    let formattedQuestions = '';
    if (questionsSection) {
      const questions = questionsSection.trim().split('\n\n');
      formattedQuestions = questions.map(questionBlock => {
        const lines = questionBlock.split('\n');
        const questionText = lines[0]; // "1. Question text"
        const answers = lines.slice(1); // ["A. choice", "B. choice", etc.]
        
        return `
          <div class="question">
            <div class="question-text">${questionText}</div>
            <div class="answer-choices">
              ${answers.map(answer => `<div class="answer-choice">${answer}</div>`).join('')}
            </div>
          </div>
        `;
      }).join('\n');
    }

    return (
      <>
        <h2 className="passage-title">{title}</h2>
        <div className="passage-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {passageContent}
          </ReactMarkdown>
        </div>
        {formattedQuestions && (
          <>
            <h2 className="questions-title">Questions</h2>
            <div className="questions" dangerouslySetInnerHTML={{ __html: formattedQuestions }} />
          </>
        )}
      </>
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <div className="markdown-body">
        {formatContent(passage)}
      </div>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}
    </Paper>
  );
};

export default StreamingPassage; 