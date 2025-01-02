import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useTeacher } from '../../context/TeacherContext';
import { aiAxiosInstance } from '../../utils/axiosInstance';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChat: React.FC = () => {
  const { teacher } = useTeacher();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamedMessage, setCurrentStreamedMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamedMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Cancel any ongoing stream
    if (abortController.current) {
      abortController.current.abort();
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      abortController.current = new AbortController();
      const response = await fetch(`${aiAxiosInstance.defaults.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userMessage,
          teacherId: teacher?._id
        }),
        signal: abortController.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      setCurrentStreamedMessage('');
      let fullMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        fullMessage += text;
        setCurrentStreamedMessage(fullMessage);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullMessage }]);
      setCurrentStreamedMessage('');
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request cancelled');
      } else {
        console.error('Error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an error. Please try again.' 
        }]);
      }
    } finally {
      setIsLoading(false);
      abortController.current = null;
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          mb: 2,
          overflow: 'hidden',
        }}
      >
        <Typography variant="h5" gutterBottom>
          AI Teaching Assistant
        </Typography>
        
        {/* Chat Messages Area */}
        <Box sx={{ 
          flex: 1,
          overflow: 'auto',
          mb: 2,
          p: 2,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
        }}>
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                mb: 2,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
                  mr: 2,
                }}
              >
                {message.role === 'assistant' ? 'AI' : 'U'}
              </Avatar>
              <Box
                sx={{
                  backgroundColor: message.role === 'assistant' ? 'white' : '#e3f2fd',
                  p: 2,
                  borderRadius: 2,
                  maxWidth: '80%',
                  '& p': { m: 0 },
                }}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Box>
            </Box>
          ))}
          {currentStreamedMessage && (
            <Box
              sx={{
                display: 'flex',
                mb: 2,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  mr: 2,
                }}
              >
                AI
              </Avatar>
              <Box
                sx={{
                  backgroundColor: 'white',
                  p: 2,
                  borderRadius: 2,
                  maxWidth: '80%',
                  '& p': { m: 0 },
                }}
              >
                <ReactMarkdown>{currentStreamedMessage}</ReactMarkdown>
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box sx={{ 
          display: 'flex',
          gap: 2,
        }}>
          <TextField
            fullWidth
            placeholder="Ask me anything about teaching..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            sx={{
              borderRadius: '20px',
              minWidth: '50px',
              height: '56px',
            }}
          >
            {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AIChat; 