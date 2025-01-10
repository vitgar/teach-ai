import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  Checkbox, 
  ListItemText,
  OutlinedInput,
  TextField,
  CircularProgress,
  Alert,
  Button,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Paper,
  Autocomplete
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { useTeacher } from '../../context/TeacherContext';
import apiAxiosInstance, { aiAxiosInstance } from "../../utils/axiosInstance";
import BookIcon from '@mui/icons-material/Book';
import StoryDialog from './StoryDialog';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GraphicOrganizerDialog from './GraphicOrganizerDialog';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import FeedbackButton from '../Common/FeedbackButton';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import html2pdf from 'html2pdf.js';

interface Group {
  _id: string;
  name: string;
  students: string[];
  teacherId: string;
}

interface Standard {
  _id: string;
  code: string;
  standard: string;
  description: string;
  strand?: string;
  gradeLevel?: string;
  short_description?: string;
  teachingStandard?: string;
}

interface Story {
  title: string;
  content: string;
}

interface LessonContent {
  warmUp: string;
  introduction: string;
  guidedPractice: string;
  writingComprehension: string;
}

interface MarkdownSectionProps {
  title: string;
  content: string;
  onRegenerate?: (prompt: string) => Promise<void>;
  placeholder?: string;
}

interface SectionHistory {
  warmUp: { versions: string[], currentIndex: number };
  introduction: { versions: string[], currentIndex: number };
  guidedPractice: { versions: string[], currentIndex: number };
  writingComprehension: { versions: string[], currentIndex: number };
}

interface ModifySection {
  value: 'all' | keyof LessonContent;
  label: string;
}

interface ApiResponse {
  content?: string;
  lesson?: string;
  error?: string;
}

interface LexileLevel {
  level: string;
  description?: string;
}

interface StandardResponse {
  _id: string;
  code: string;
  standard: string;
  description: string;
  strand: string;
  gradeLevel: string;
  short_description: string;
  teachingStandard: string;
}

interface StandardOption {
  _id: string;
  code: string;
  description: string;
  displayText: string;
}

interface PromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLoading?: boolean;
  label?: string;
}

const MODIFY_SECTIONS: ModifySection[] = [
  { value: 'all', label: 'Modify All' },
  { value: 'warmUp', label: 'Warm Up' },
  { value: 'introduction', label: 'Introduction and Guided Practice' },
  { value: 'guidedPractice', label: 'Independent Practice' },
  { value: 'writingComprehension', label: 'Checking Comprehension' },
];

const PromptBox: React.FC<PromptBoxProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter your modifications...",
  isLoading = false,
  label = "Modify Content"
}) => {
  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            }
          }}
        />
        <IconButton
          onClick={onSubmit}
          disabled={!value || isLoading}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&.Mui-disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500',
            },
            width: 40,
            height: 40,
            mt: 1
          }}
        >
          {isLoading ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : (
            <SendIcon />
          )}
        </IconButton>
      </Box>
    </Box>
  );
};

const LessonPlan = () => {
  const { teacher } = useTeacher();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState('');
  const [generateStory, setGenerateStory] = useState(false);
  const [warmUpTopic, setWarmUpTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [graphicOrganizer, setGraphicOrganizer] = useState<string>('');
  const [graphicOrganizerDialogOpen, setGraphicOrganizerDialogOpen] = useState(false);
  const [lessonContent, setLessonContent] = useState<LessonContent>({
    warmUp: '',
    introduction: '',
    guidedPractice: '',
    writingComprehension: ''
  });
  const [sectionHistory, setSectionHistory] = useState<SectionHistory>({
    warmUp: { versions: [], currentIndex: 0 },
    introduction: { versions: [], currentIndex: 0 },
    guidedPractice: { versions: [], currentIndex: 0 },
    writingComprehension: { versions: [], currentIndex: 0 }
  });
  const [selectedSection, setSelectedSection] = useState<'all' | keyof LessonContent>('all');
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [lexileLevel, setLexileLevel] = useState<string>('');
  const [lexileLevels] = useState<LexileLevel[]>([
    { level: 'BR', description: 'Beginning Reader' },
    { level: '200L', description: 'Early Reader' },
    { level: '300L', description: 'Early Reader' },
    { level: '400L', description: 'Early Intermediate' },
    { level: '500L', description: 'Intermediate' },
    { level: '600L', description: 'Intermediate' },
    { level: '700L', description: 'Advanced' },
    { level: '800L', description: 'Advanced' },
    { level: '900L', description: 'Advanced' },
    { level: '1000L', description: 'Advanced' },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentLessonPlanId, setCurrentLessonPlanId] = useState<string | null>(null);
  const [sectionPrompts, setSectionPrompts] = useState<{[key: string]: string}>({
    warmUp: '',
    introduction: '',
    guidedPractice: '',
    writingComprehension: ''
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Mapping origin to group type
  const originTypeMap: { [key: string]: string } = {
    "Guided Reading": "Guided Reading",
    "Intervention": "Intervention",
    "small-groups": "Small Group", // Updated to match the correct group type
    // Add more mappings as needed
  };

  useEffect(() => {
    const fetchData = async () => {
      if (teacher?._id) {
        try {
          setLoading(true);
          console.log('Current teacher:', teacher); // Debug log

          // Fetch groups with correct parameters
          const groupsResponse = await apiAxiosInstance.get('/api/groups', {
            params: { 
              teacherId: teacher._id,
              type: 'Small Group' // Updated to match exact group type
            }
          });
          
          console.log('Groups Response:', groupsResponse.data); // Debug log
          setGroups(groupsResponse.data || []);

          // Fetch standards based on teacher's grade level
          console.log('Fetching standards');
          const standardsResponse = await apiAxiosInstance.get<StandardResponse[]>('/api/detailedstandards', {
            params: teacher.gradeLevel ? { gradeLevel: teacher.gradeLevel } : undefined
          });
          console.log('Standards Response:', standardsResponse.data);

          setStandards(standardsResponse.data.map((std: StandardResponse) => ({
            _id: std._id,
            code: std.code,
            standard: std.standard,
            description: std.description,
            strand: std.strand,
            gradeLevel: std.gradeLevel,
            short_description: std.short_description,
            teachingStandard: std.teachingStandard
          })) || []);
          
          setError(null);
        } catch (error) {
          console.error("Error fetching data:", error);
          setError('Failed to load data. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [teacher]);

  const handleGroupChange = (event: any) => {
    const value = event.target.value;
    setSelectedGroups(typeof value === 'string' ? value.split(',') : value);
  };

  const handleStandardChange = (e: any) => {
    const selectedStandardId = e.target.value;
    setSelectedStandard(selectedStandardId);
    
    // Find the selected standard's description
    const standard = standards.find(s => s._id === selectedStandardId);
    if (standard) {
      setFocus(standard.description);
    }
  };

  const handleGenerateWarmUp = async () => {
    if (!warmUpTopic) return;
    
    setIsGenerating(true);
    try {
      const response = await aiAxiosInstance.post('/generate-warmup', {
        topic: warmUpTopic,
        storyTitle: story?.title || '',
        storyContent: story?.content || ''
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const warmUpTextField = document.getElementById('warm-up-notes');
      if (warmUpTextField instanceof HTMLTextAreaElement) {
        warmUpTextField.value = response.data.content;
      }
    } catch (error) {
      console.error('Error generating warm up:', error);
      setError('Failed to generate warm up content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStreamingResponse = async (
    endpoint: string, 
    params: any, 
    sectionKey: keyof LessonContent,
    setContent: (content: string) => void
  ) => {
    try {
      const response = await fetch(`${aiAxiosInstance.defaults.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get reader');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              if (data.content) {
                accumulatedContent += data.content;
                setContent(accumulatedContent);
              }

              if (data.type === 'complete') {
                if (data.content) {
                  setContent(data.content);
                }
                return accumulatedContent;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      return accumulatedContent;
    } catch (error) {
      console.error('Error in streaming response:', error);
      throw error;
    }
  };

  const handleGenerateStory = async () => {
    if (!selectedStandard || !lexileLevel) return;
    
    setIsGeneratingStory(true);
    // Clear all content when starting new generation
    setStory(null);
    setLessonContent({
      warmUp: '',
      introduction: '',
      guidedPractice: '',
      writingComprehension: ''
    });
    setBookTitle('');
    
    try {
      const topicToUse = selectedStandard 
        ? standards.find(s => s._id === selectedStandard)?.description || ''
        : focus;

      const response = await fetch(`${aiAxiosInstance.defaults.baseURL}/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: topicToUse,
          topic: topicToUse,
          lexileLevel: lexileLevel
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get reader');
      }

      let accumulatedContent = '';
      let currentTitle = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              if (data.content) {
                accumulatedContent += data.content;
                setStory({
                  title: currentTitle,
                  content: accumulatedContent
                });
              }
              
              if (data.title) {
                currentTitle = data.title;
                setBookTitle(currentTitle);
                setStory({
                  title: currentTitle,
                  content: accumulatedContent
                });
              }

              if (data.type === 'complete') {
                const newStory = {
                  title: currentTitle || data.title || '',
                  content: data.content || accumulatedContent
                };
                setStory(newStory);
                setBookTitle(newStory.title);

                // Only proceed with generating other sections if we have a story
                if (newStory.content) {
                  await generateOtherSections(newStory, topicToUse);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setError('Failed to generate content');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const generateOtherSections = async (story: Story, topicToUse: string) => {
    try {
      // Set initial empty state for sections
      setLessonContent(prev => ({
        ...prev,
        warmUp: '',
        introduction: '',
        guidedPractice: '',
        writingComprehension: ''
      }));

      // Generate warm-up
      await handleStreamingResponse(
        '/generate-warmup',
        {
          topic: topicToUse,
          storyTitle: story.title,
          storyContent: story.content
        },
        'warmUp',
        (content) => setLessonContent(prev => ({ ...prev, warmUp: content }))
      );

      // Generate introduction
      await handleStreamingResponse(
        '/generate-guided-reading-intro',
        {
          title: story.title,
          content: story.content,
          skill: topicToUse
        },
        'introduction',
        (content) => setLessonContent(prev => ({ ...prev, introduction: content }))
      );

      // Generate practice
      const practiceContent = await handleStreamingResponse(
        '/generate-practice',
        {
          skill: topicToUse,
          storyTitle: story.title,
          storyContent: story.content
        },
        'guidedPractice',
        (content) => setLessonContent(prev => ({ ...prev, guidedPractice: content }))
      );

      // Generate checking comprehension
      await handleStreamingResponse(
        '/generate-exit-ticket',
        {
          storyTitle: story.title,
          storyContent: story.content,
          skill: topicToUse,
          practiceContent: practiceContent
        },
        'writingComprehension',
        (content) => setLessonContent(prev => ({ ...prev, writingComprehension: content }))
      );

    } catch (error) {
      console.error('Error generating sections:', error);
      setError('Failed to generate one or more sections');
    }
  };

  const processStream = async (response: Response, setContent: (content: string) => void) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get reader');
    }

    let accumulatedContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(5));
            
            if (data.content) {
              accumulatedContent += data.content;
              setContent(accumulatedContent);
            }

            if (data.type === 'complete') {
              if (data.content) {
                setContent(data.content);
              }
              return accumulatedContent;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    return accumulatedContent;
  };

  const handleSectionPromptChange = (section: string, value: string) => {
    setSectionPrompts(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const handleIndividualSectionModify = async (section: keyof LessonContent) => {
    if (!sectionPrompts[section] || !story) return;
    
    setIsModifying(true);
    try {
      // Save current section state to history
      setSectionHistory(prev => ({
        ...prev,
        [section]: {
          versions: [lessonContent[section], ...prev[section].versions].slice(0, 5),
          currentIndex: prev[section].versions.length
        }
      }));

      // Set loading state for selected section
      setLessonContent(prev => ({
        ...prev,
        [section]: 'Generating...'
      }));

      // Generate new content with streaming based on section
      switch (section) {
        case 'warmUp':
          await handleStreamingResponse(
            '/generate-warmup',
            {
              topic: focus,
              storyTitle: story.title,
              storyContent: story.content,
              customPrompt: sectionPrompts[section]
            },
            section,
            (content) => setLessonContent(prev => ({ ...prev, [section]: content }))
          );
          break;

        case 'introduction':
          await handleStreamingResponse(
            '/generate-guided-reading-intro',
            {
              title: story.title,
              content: story.content,
              skill: focus,
              customPrompt: sectionPrompts[section]
            },
            section,
            (content) => setLessonContent(prev => ({ ...prev, [section]: content }))
          );
          break;

        case 'guidedPractice':
          await handleStreamingResponse(
            '/generate-practice',
            {
              skill: focus,
              storyTitle: story.title,
              storyContent: story.content,
              customPrompt: sectionPrompts[section]
            },
            section,
            (content) => setLessonContent(prev => ({ ...prev, [section]: content }))
          );
          break;

        case 'writingComprehension':
          await handleStreamingResponse(
            '/generate-exit-ticket',
            {
              storyTitle: story.title,
              storyContent: story.content,
              skill: focus,
              customPrompt: sectionPrompts[section],
              practiceContent: lessonContent.guidedPractice
            },
            section,
            (content) => setLessonContent(prev => ({ ...prev, [section]: content }))
          );
          break;
      }
      
      // Clear the prompt after successful modification
      setSectionPrompts(prev => ({
        ...prev,
        [section]: ''
      }));
    } catch (error) {
      console.error('Error modifying content:', error);
      setError('Failed to modify content');
    } finally {
      setIsModifying(false);
    }
  };

  const handleUndo = (section: keyof LessonContent) => {
    if (sectionHistory[section].versions.length > 0) {
      const [lastContent, ...remainingHistory] = sectionHistory[section].versions;
      
      setLessonContent(prev => ({
        ...prev,
        [section]: lastContent
      }));
      
      setSectionHistory(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          versions: remainingHistory
        }
      }));
    }
  };

  const handleVersionChange = (section: keyof LessonContent, direction: 'prev' | 'next') => {
    setSectionHistory(prev => {
      const sectionData = prev[section];
      let newIndex = direction === 'prev' 
        ? sectionData.currentIndex - 1 
        : sectionData.currentIndex + 1;
      
      // Ensure index stays within bounds
      newIndex = Math.max(0, Math.min(newIndex, sectionData.versions.length - 1));
      
      // Update content if index changed
      if (newIndex !== sectionData.currentIndex) {
        setLessonContent(prevContent => ({
          ...prevContent,
          [section]: sectionData.versions[newIndex]
        }));
      }
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          currentIndex: newIndex
        }
      };
    });
  };

  const addNewVersion = (section: keyof LessonContent, content: string) => {
    setSectionHistory(prev => {
      const sectionData = prev[section];
      let newVersions = [...sectionData.versions];
      
      // Add new version
      if (newVersions.length >= 5) {
        // Remove oldest version if at limit
        newVersions = newVersions.slice(1);
      }
      newVersions.push(content);
      
      return {
        ...prev,
        [section]: {
          versions: newVersions,
          currentIndex: newVersions.length - 1
        }
      };
    });
  };

  const handleSaveLessonPlan = async () => {
    if (!story || !selectedStandard || !lexileLevel) {
      setError('Please generate a complete lesson plan before saving');
      return;
    }

    setIsSaving(true);
    try {
      // Get the selected standard details
      const standardToSave = standards.find(s => s._id === selectedStandard);
      
      const lessonPlanData = {
        _id: currentLessonPlanId,
        groups: selectedGroups,
        standard: {
          code: standardToSave?.code,
          description: standardToSave?.description
        },
        lexileLevel,
        story: {
          title: story.title,
          content: story.content
        },
        sections: {
          warmUp: lessonContent.warmUp,
          introductionAndGuidedPractice: lessonContent.introduction,
          independentPractice: lessonContent.guidedPractice,
          checkingComprehension: lessonContent.writingComprehension
        }
      };

      const response = await apiAxiosInstance.post('/api/small-group-lesson-plans', lessonPlanData);
      
      if (response.data.lessonPlanId) {
        // Save the lesson plan ID for future updates
        setCurrentLessonPlanId(response.data.lessonPlanId);
        setError(null);
        // Show success message
        console.log(currentLessonPlanId ? 'Lesson plan updated successfully' : 'Lesson plan saved successfully');
      }
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      setError('Failed to save lesson plan');
    } finally {
      setIsSaving(false);
    }
  };

  const formatHtmlContent = (content: string) => {
    return content
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/`/g, '')    // Remove code markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
      .replace(/\n\n/g, '</p><p>') // Convert double newlines to paragraphs
      .replace(/\n/g, '<br>') // Convert single newlines to line breaks
      .trim();
  };

  const formatMarkdownContent = (content: string) => {
    return content
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/`/g, '')    // Remove code markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
      .replace(/\n\n/g, '\\par\\par ') // Convert double newlines to RTF paragraphs
      .replace(/\n/g, '\\line ') // Convert single newlines to RTF line breaks
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  const handlePrint = () => {
    if (!story || !lessonContent) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lesson Plan - ${story.title}</title>
            <style>
              @page {
                margin: 1in;
                size: letter;
              }
              
              @media print {
                @page {
                  margin: 1in;
                  size: letter;
                }
              }

              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }

              h1, h2 {
                color: #1976d2;
                margin-top: 2em;
                margin-bottom: 1em;
              }

              .story-content {
                background-color: #f5f5f5;
                padding: 1em;
                margin: 1em 0;
                border-radius: 4px;
                white-space: pre-wrap;
                word-wrap: break-word;
              }

              .section {
                margin-bottom: 2em;
                page-break-inside: avoid;
              }

              .section-content {
                white-space: pre-wrap;
                word-wrap: break-word;
              }

              p {
                margin: 1em 0;
              }
            </style>
          </head>
          <body>
            <h1>Lesson Plan: ${story.title}</h1>
            ${selectedStandard ? `
              <div style="margin-bottom: 2em;">
                <strong>Standard:</strong> ${standards.find(s => s._id === selectedStandard)?.code || ''}
                ${standards.find(s => s._id === selectedStandard)?.description ? 
                  `<br><em>${standards.find(s => s._id === selectedStandard)?.description}</em>` : ''}
              </div>
            ` : ''}

            <div class="section">
              <h2>Story: ${story.title}</h2>
              <div class="story-content">${story.content}</div>
            </div>

            <div class="section">
              <h2>Warm Up</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonContent.warmUp)}</p></div>
            </div>

            <div class="section">
              <h2>Introduction and Guided Practice</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonContent.introduction)}</p></div>
            </div>

            <div class="section">
              <h2>Independent Practice</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonContent.guidedPractice)}</p></div>
            </div>

            <div class="section">
              <h2>Checking Comprehension</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonContent.writingComprehension)}</p></div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadPDF = async () => {
    if (!story || !lessonContent) return;
    
    handleDownloadClose();
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: block;
              position: relative;
              margin: 15px 0;
            }
            h2 {
              page-break-after: avoid !important;
              break-after: avoid !important;
              margin: 0 0 10px 0 !important;
              padding: 0 !important;
            }
            .content-wrapper {
              page-break-before: avoid !important;
              break-before: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .content {
              page-break-before: avoid !important;
              break-before: avoid !important;
              white-space: pre-wrap;
              word-wrap: break-word;
              line-height: 1.6;
            }
            p {
              orphans: 3;
              widows: 3;
              margin: 0 0 10px 0;
            }
          }
        </style>
        <h1 style="color: #1976d2; margin: 0 0 20px 0;">Lesson Plan: ${story.title}</h1>
        ${selectedStandard ? `
          <div style="margin: 0 0 20px 0;">
            <strong>Standard:</strong> ${standards.find(s => s._id === selectedStandard)?.code || ''}
            ${standards.find(s => s._id === selectedStandard)?.description ? 
              `<br><em>${standards.find(s => s._id === selectedStandard)?.description}</em>` : ''}
          </div>
        ` : ''}

        <div class="section">
          <h2 style="color: #1976d2;">Story: ${story.title}</h2>
          <div class="content-wrapper">
            <div class="content" style="background-color: #f5f5f5; padding: 15px; border-radius: 4px;">
              ${story.content}
            </div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Warm Up</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonContent.warmUp)}</div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Introduction and Guided Practice</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonContent.introduction)}</div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Independent Practice</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonContent.guidedPractice)}</div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Checking Comprehension</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonContent.writingComprehension)}</div>
          </div>
        </div>
      </div>
    `;

    const opt = {
      margin: 0.75,
      filename: `lesson-plan-${story.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { 
        mode: ['avoid-all'],
        before: '.section',
        avoid: ['h2', '.content-wrapper', '.content']
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    }
  };

  const handleDownloadWord = () => {
    if (!story || !lessonContent) return;
    
    handleDownloadClose();
    try {
      let rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}
{\\colortbl;\\red25\\green118\\blue210;}

\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440
\\widowctrl\\ftnbj\\aenddoc\\wrapdefault\\adjustright

\\pard\\qc\\b\\fs36 Lesson Plan: ${story.title}\\par
${selectedStandard ? `
  \\pard\\sa360\\fs24\\b Standard: ${standards.find(s => s._id === selectedStandard)?.code || ''}
  ${standards.find(s => s._id === selectedStandard)?.description ? 
    `<br><em>${standards.find(s => s._id === selectedStandard)?.description}</em>` : ''}
` : ''}

\\pard\\qc\\b\\fs32 Story: ${story.title}\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${story.content}\\par

\\pard\\qc\\b\\fs32 Warm Up\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonContent.warmUp)}\\par

\\pard\\qc\\b\\fs32 Introduction and Guided Practice\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonContent.introduction)}\\par

\\pard\\qc\\b\\fs32 Independent Practice\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonContent.guidedPractice)}\\par

\\pard\\qc\\b\\fs32 Checking Comprehension\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonContent.writingComprehension)}\\par
}`;

      const blob = new Blob([rtfContent], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `lesson-plan-${story.title}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Failed to generate Word document');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Small Group Lesson Plan
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        {/* Groups and Standards in the same row */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 2,
          alignItems: 'flex-start'
        }}>
          <FormControl sx={{ flex: 1 }}>
            <InputLabel id="groups-label">Select Groups</InputLabel>
            <Select
              labelId="groups-label"
              multiple
              value={selectedGroups}
              onChange={handleGroupChange}
              input={<OutlinedInput label="Select Groups" />}
              renderValue={(selected) => {
                return groups
                  .filter(group => selected.includes(group._id))
                  .map(group => group.name)
                  .join(', ');
              }}
            >
              {groups.map((group) => (
                <MenuItem key={group._id} value={group._id}>
                  <Checkbox checked={selectedGroups.indexOf(group._id) > -1} />
                  <ListItemText 
                    primary={group.name} 
                    secondary={`${group.students.length} students`}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flex: 2 }}>
            <Autocomplete
              value={standards.find(s => s._id === selectedStandard) || null}
              onChange={(_, newValue: Standard | null) => {
                if (newValue) {
                  handleStandardChange({ target: { value: newValue._id } });
                }
              }}
              options={standards}
              getOptionLabel={(option) => {
                if (!option) return '';
                return `${option.standard || option.code} - ${option.description}`;
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select or Search Standard"
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-input': {
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <MenuItem 
                  {...props}
                  sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1,
                    minHeight: 'auto',
                    whiteSpace: 'normal'
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: 'primary.main',
                        backgroundColor: 'primary.light',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        display: 'inline-block',
                        mb: 0.5
                      }}
                    >
                      {option.standard || option.code}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.3,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              )}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              filterOptions={(options, { inputValue }) => {
                const searchTerms = inputValue?.toLowerCase().split(' ') || [];
                return options.filter(option => 
                  searchTerms.every(term => {
                    const standard = String(option.standard || '').toLowerCase();
                    const code = String(option.code || '').toLowerCase();
                    const description = String(option.description || '').toLowerCase();
                    return standard.includes(term) || code.includes(term) || description.includes(term);
                  })
                );
              }}
              sx={{
                '& .MuiAutocomplete-inputRoot': {
                  '& .MuiOutlinedInput-input': {
                    overflow: 'auto',
                    maxHeight: '100px'
                  }
                }
              }}
            />
          </FormControl>
        </Box>

        {/* Rest of the components */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 4,
          alignItems: 'center'
        }}>
          <Box sx={{ width: '300px' }}>
            <Autocomplete
              freeSolo
              value={lexileLevel}
              onChange={(_, newValue) => setLexileLevel(typeof newValue === 'string' ? newValue : newValue?.level || '')}
              inputValue={lexileLevel}
              onInputChange={(_, newInputValue) => setLexileLevel(newInputValue)}
              options={lexileLevels}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return `${option.level}${option.description ? ` - ${option.description}` : ''}`;
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Lexile Level"
                />
              )}
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateStory}
            disabled={!selectedStandard || !lexileLevel || isGeneratingStory}
            startIcon={isGeneratingStory ? <CircularProgress size={20} /> : null}
            sx={{ height: '48px' }}
          >
            {isGeneratingStory ? 'Generating...' : 'Generate Lesson Plan'}
          </Button>

          {/* Only show these buttons when all sections are complete */}
          {story && 
           lessonContent.warmUp && 
           lessonContent.introduction && 
           lessonContent.guidedPractice && 
           lessonContent.writingComprehension &&
           lessonContent.writingComprehension !== 'Generating...' && (
            <>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleSaveLessonPlan}
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                sx={{ height: '48px' }}
              >
                {isSaving ? 'Saving...' : currentLessonPlanId ? 'Update Lesson Plan' : 'Save Lesson Plan'}
              </Button>

              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ height: '48px' }}
              >
                Print
              </Button>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadClick}
                sx={{ height: '48px' }}
              >
                Download
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleDownloadClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={handleDownloadPDF}>
                  <PictureAsPdfIcon sx={{ mr: 1 }} />
                  PDF
                </MenuItem>
                <MenuItem onClick={handleDownloadWord}>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  Word
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* Content sections */}
        <Box sx={{ 
          mt: 4,
          height: 'calc(100vh - 400px)',
          position: 'relative',
          overflow: 'auto',
          pr: 2,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'grey.100',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.400',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'grey.500',
            },
          },
        }}>
          {/* Generated Story Section */}
          {(story || isGeneratingStory) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
                {isGeneratingStory ? 'Generating Story...' : 'Story'}
              </Typography>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.50',
                  minHeight: '100px',
                  '& p': { margin: '0.5em 0' }
                }}
              >
                {story?.title && <Typography variant="h6" gutterBottom>{story.title}</Typography>}
                <ReactMarkdown>{story?.content || ''}</ReactMarkdown>
              </Paper>
            </Box>
          )}

          {/* Lesson Content Sections */}
          {story && Object.entries(lessonContent).map(([key, content]) => {
            const sectionKey = key as keyof LessonContent;
            const historyData = sectionHistory[sectionKey];
            const hasVersions = historyData.versions.length > 0;
            const isFirstVersion = historyData.currentIndex === 0;
            const isLastVersion = historyData.currentIndex === historyData.versions.length - 1;
            const totalVersions = historyData.versions.length;

            return (
              <Box key={key} sx={{ mb: 4, position: 'relative' }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2 
                }}>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    {MODIFY_SECTIONS.find(s => s.value === key)?.label}
                  </Typography>
                  {hasVersions && totalVersions > 1 && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1 
                    }}>
                      {!isFirstVersion && (
                        <IconButton
                          onClick={() => handleVersionChange(sectionKey, 'prev')}
                          size="small"
                        >
                          <ArrowBackIcon />
                        </IconButton>
                      )}
                      <Typography variant="body2" sx={{ mx: 2 }}>
                        {`${historyData.currentIndex + 1}/${totalVersions}`}
                      </Typography>
                      {!isLastVersion && (
                        <IconButton
                          onClick={() => handleVersionChange(sectionKey, 'next')}
                          size="small"
                        >
                          <ArrowForwardIcon />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>

                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50',
                    minHeight: '100px',
                    '& p': { margin: '0.5em 0' },
                    '& h1, & h2, & h3, & h4, & h5, & h6': { 
                      margin: '1em 0 0.5em 0',
                      color: 'primary.main',
                      fontWeight: 'bold' 
                    },
                    '& strong': { 
                      fontWeight: 'bold',
                      color: 'text.primary',
                      display: 'block',
                      marginTop: '1em'
                    },
                    '& em': { fontStyle: 'italic' },
                    '& ul, & ol': { 
                      marginTop: 1, 
                      marginBottom: 1,
                      paddingLeft: '1.5em'
                    },
                    '& li': { 
                      margin: '0.5em 0',
                      lineHeight: 1.6
                    },
                    '& blockquote': {
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      paddingLeft: 2,
                      margin: '1em 0',
                      color: 'text.secondary'
                    },
                    '& code': {
                      backgroundColor: 'grey.100',
                      padding: '0.2em 0.4em',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }
                  }}
                >
                  <ReactMarkdown>{content || 'No content generated yet...'}</ReactMarkdown>
                </Paper>

                {content && (
                  <PromptBox
                    value={sectionPrompts[key]}
                    onChange={(value) => handleSectionPromptChange(key, value)}
                    onSubmit={() => handleIndividualSectionModify(sectionKey)}
                    isLoading={isModifying}
                    placeholder={`Enter modifications for ${MODIFY_SECTIONS.find(s => s.value === key)?.label}...`}
                    label="Modify this section"
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Dialogs */}
      {story && (
        <StoryDialog
          open={storyDialogOpen}
          onClose={() => setStoryDialogOpen(false)}
          title={story.title}
          content={story.content}
        />
      )}

      {graphicOrganizer && (
        <GraphicOrganizerDialog
          open={graphicOrganizerDialogOpen}
          onClose={() => setGraphicOrganizerDialogOpen(false)}
          content={graphicOrganizer}
        />
      )}

      <FeedbackButton page="lesson-plan" />
    </Box>
  );
};

export default LessonPlan;