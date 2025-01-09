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
import ReactMarkdown, { Components as ReactMarkdownComponents } from 'react-markdown';
import { useTeacher } from '../../context/TeacherContext';
import { aiAxiosInstance } from '../../utils/axiosInstance';

// We won't import from react-markdown/lib/components. 
// Instead, we define our own types to ensure type safety for children, inline, etc.

// Each chat message structure
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// A typed interface for the code-block props in ReactMarkdown
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Our AIChat component
const AIChat: React.FC = () => {
  const { teacher } = useTeacher();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamedMessage, setCurrentStreamedMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController | null>(null);

  // Helper to scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamedMessage]);

  // Sends the user's input to the server
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Cancel any existing fetch
    if (abortController.current) {
      abortController.current.abort();
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add the user's message to local state
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);

    try {
      abortController.current = new AbortController();

      // Make the request to your streaming /chat endpoint
      const response = await fetch(`${aiAxiosInstance.defaults.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: userMessage,
          messages: updatedMessages, // entire conversation so far
          teacherId: teacher?._id,
        }),
        signal: abortController.current.signal,
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

        const textChunk = new TextDecoder().decode(value);
        fullMessage += textChunk;
        setCurrentStreamedMessage(fullMessage);
      }

      // Once streaming is done, store the full assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: fullMessage }]);
      setCurrentStreamedMessage('');
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'I apologize, but I encountered an error. Please try again.',
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortController.current = null;
    }
  };

  // Sends on Enter key (without shift)
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  /**
   * Define our custom components to override markdown rendering.
   * Notice how each function explicitly types its children prop.
   */
  const customComponents: ReactMarkdownComponents = {
    // H1 override
    h1: ({ children }) => (
      <Typography component="h1" variant="h5" gutterBottom>
        {children}
      </Typography>
    ),
    // H2 override
    h2: ({ children }) => (
      <Typography component="h2" variant="h6" gutterBottom>
        {children}
      </Typography>
    ),
    // H3 override
    h3: ({ children }) => (
      <Typography component="h3" variant="subtitle1" gutterBottom>
        {children}
      </Typography>
    ),
    // Paragraph
    p: ({ children }) => (
      <Typography component="p" variant="body1" paragraph>
        {children}
      </Typography>
    ),
    // List item
    li: ({ children }) => (
      <Typography component="li" variant="body1">
        {children}
      </Typography>
    ),
    // Unordered list
    ul: ({ children }) => (
      <Box component="ul" sx={{ my: 1, pl: 2 }}>
        {children}
      </Box>
    ),
    // Ordered list
    ol: ({ children }) => (
      <Box component="ol" sx={{ my: 1, pl: 2 }}>
        {children}
      </Box>
    ),
    // Blockquote
    blockquote: ({ children }) => (
      <Box
        component="blockquote"
        sx={{
          borderLeft: 4,
          borderColor: 'primary.main',
          pl: 2,
          ml: 0,
          my: 1,
        }}
      >
        {children}
      </Box>
    ),
    // Code blocks and inline code
    code: ({ inline, children, className, ...props }: CodeProps) => {
      if (inline) {
        return (
          <Typography
            component="code"
            sx={{
              backgroundColor: 'grey.100',
              p: 0.5,
              borderRadius: 0.5,
              fontFamily: 'monospace',
            }}
            {...props}
          >
            {children}
          </Typography>
        );
      }
      // Render multi-line code block
      return (
        <Box
          component="pre"
          sx={{
            backgroundColor: 'grey.100',
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
          <Typography
            component="code"
            sx={{
              fontFamily: 'monospace',
            }}
            {...props}
          >
            {children}
          </Typography>
        </Box>
      );
    },
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
      }}
    >
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
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            mb: 2,
            p: 2,
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
          }}
        >
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
                  // some global styling for the rendered markdown
                  '& p': { m: 0, mb: 1 },
                  '& h1, & h2, & h3': {
                    mt: 1,
                    mb: 2,
                    fontWeight: 'bold',
                    color: 'primary.main',
                  },
                  '& ul, & ol': {
                    mt: 1,
                    mb: 1,
                    pl: 3,
                  },
                  '& li': {
                    mb: 0.5,
                  },
                  '& hr': {
                    my: 2,
                    borderColor: 'divider',
                  },
                  '& blockquote': {
                    borderLeft: 4,
                    borderColor: 'primary.main',
                    pl: 2,
                    ml: 0,
                    my: 1,
                  },
                  '& code': {
                    backgroundColor: 'grey.100',
                    p: 0.5,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                  },
                }}
              >
                <ReactMarkdown components={customComponents}>{message.content}</ReactMarkdown>
              </Box>
            </Box>
          ))}

          {/* The currently streaming message (partial tokens) */}
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
                  '& p': { m: 0, mb: 1 },
                  '& h1, & h2, & h3': {
                    mt: 1,
                    mb: 2,
                    fontWeight: 'bold',
                    color: 'primary.main',
                  },
                  '& ul, & ol': {
                    mt: 1,
                    mb: 1,
                    pl: 2,
                  },
                  '& li': {
                    mb: 0.5,
                  },
                  '& hr': {
                    my: 2,
                    borderColor: 'divider',
                  },
                  '& blockquote': {
                    borderLeft: 4,
                    borderColor: 'primary.main',
                    pl: 2,
                    ml: 0,
                    my: 1,
                  },
                  '& code': {
                    backgroundColor: 'grey.100',
                    p: 0.5,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                  },
                }}
              >
                <ReactMarkdown components={customComponents}>
                  {currentStreamedMessage}
                </ReactMarkdown>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
          }}
        >
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
              },
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
