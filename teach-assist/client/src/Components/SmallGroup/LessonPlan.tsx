import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
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

const MODIFY_SECTIONS: ModifySection[] = [
  { value: 'all', label: 'Modify All' },
  { value: 'warmUp', label: 'Warm Up' },
  { value: 'introduction', label: 'Introduction and Guided Practice' },
  { value: 'guidedPractice', label: 'Independent Practice' },
  { value: 'writingComprehension', label: 'Checking Comprehension' },
];

const MarkdownSection = ({ title, content, onRegenerate, placeholder }: MarkdownSectionProps) => {
  const [prompt, setPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!prompt || !onRegenerate) return;
    
    setIsRegenerating(true);
    try {
      await onRegenerate(prompt);
      setPrompt(''); // Clear prompt after successful regeneration
    } catch (error) {
      console.error('Error regenerating content:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
        {title}
      </Typography>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          backgroundColor: 'grey.50',
          minHeight: '100px',
          '& p': { margin: 0 },
          '& ul, & ol': { marginTop: 1, marginBottom: 1 },
        }}
      >
        <ReactMarkdown>{content || 'No content generated yet...'}</ReactMarkdown>
      </Paper>
      
      {/* Prompt Field */}
      <Box sx={{ 
        mt: 2, 
        display: 'flex', 
        gap: 1,
        alignItems: 'flex-start'
      }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder || "Enter your modifications or specific requirements..."}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            }
          }}
        />
        <IconButton
          onClick={handleRegenerate}
          disabled={!prompt || isRegenerating || !content}
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
          {isRegenerating ? (
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
              
              if (data.type === 'story' || data.type === 'title') {
                // For story generation
                accumulatedContent += data.content;
                setContent(accumulatedContent);
              } else if (data.type === 'complete') {
                // For final content
                if (data.content) {
                  setContent(data.content);
                } else if (data.title && data.content) {
                  // Handle story completion
                  setContent(data.content);
                }
              } else if (data.content) {
                // For other streaming content
                accumulatedContent += data.content;
                setContent(accumulatedContent);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming response:', error);
      throw error;
    }
  };

  const handleGenerateStory = async () => {
    if ((!focus && !selectedStandard) || !lexileLevel) return;
    
    setIsGeneratingStory(true);
    try {
      const topicToUse = selectedStandard 
        ? standards.find(s => s._id === selectedStandard)?.description || ''
        : focus;

      // First generate and save the story
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

      let storyContent = '';
      let storyTitle = '';
      let newStory: Story | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              if (data.type === 'story') {
                storyContent += data.content;
                setStory(prev => ({
                  title: prev?.title || '',  // Provide default empty string
                  content: storyContent
                }));
              } else if (data.type === 'title') {
                storyTitle += data.content;
                setBookTitle(storyTitle);
                setStory(prev => ({
                  title: storyTitle,
                  content: prev?.content || ''  // Provide default empty string
                }));
              } else if (data.type === 'complete') {
                // Save the complete story
                newStory = {
                  title: data.title,
                  content: data.content
                };
                setStory(newStory);
                setBookTitle(data.title);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Only proceed with generating other sections if we have a story
      if (newStory) {
        // Now generate all sections using streaming
        setLessonContent(prev => ({
          ...prev,
          warmUp: 'Generating...',
          introduction: 'Generating...',
          guidedPractice: 'Generating...',
          writingComprehension: 'Generating...'
        }));

        try {
          // Create a variable to store the practice content
          let practiceContent = '';

          // Generate first three sections in parallel and store their results
          const results = await Promise.all([
            // Generate warm-up
            handleStreamingResponse(
              '/generate-warmup',
              {
                topic: topicToUse,
                storyTitle: newStory.title,
                storyContent: newStory.content
              },
              'warmUp',
              (content) => setLessonContent(prev => ({ ...prev, warmUp: content }))
            ),

            // Generate introduction
            handleStreamingResponse(
              '/generate-guided-reading-intro',
              {
                title: newStory.title,
                content: newStory.content,
                skill: topicToUse
              },
              'introduction',
              (content) => setLessonContent(prev => ({ ...prev, introduction: content }))
            ),

            // Generate practice story
            handleStreamingResponse(
              '/generate-practice',
              {
                skill: topicToUse,
                storyTitle: newStory.title,
                storyContent: newStory.content
              },
              'guidedPractice',
              (content) => {
                setLessonContent(prev => ({ ...prev, guidedPractice: content }));
                practiceContent = content; // Store the practice content
              }
            )
          ]);

          // Now generate exit ticket using the stored practice content
          if (practiceContent) {
            await handleStreamingResponse(
              '/generate-exit-ticket',
              {
                storyTitle: newStory.title,
                storyContent: newStory.content,
                skill: topicToUse,
                practiceContent: practiceContent
              },
              'writingComprehension',
              (content) => setLessonContent(prev => ({ ...prev, writingComprehension: content }))
            );
          } else {
            console.error('Practice content not available for exit ticket generation');
            setError('Failed to generate exit ticket: Practice content not available');
          }

        } catch (error) {
          console.error('Error generating sections:', error);
          setError('Failed to generate one or more sections');
        }
      }

    } catch (error) {
      console.error('Error generating content:', error);
      setError('Failed to generate content');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleSectionModify = async () => {
    if (!modifyPrompt || isModifying || !story) return;
    
    setIsModifying(true);
    try {
      if (selectedSection === 'all') {
        // Save current state to history for all sections
        setSectionHistory(prev => ({
          warmUp: { versions: [lessonContent.warmUp, ...prev.warmUp.versions].slice(0, 5), currentIndex: prev.warmUp.versions.length },
          introduction: { versions: [lessonContent.introduction, ...prev.introduction.versions].slice(0, 5), currentIndex: prev.introduction.versions.length },
          guidedPractice: { versions: [lessonContent.guidedPractice, ...prev.guidedPractice.versions].slice(0, 5), currentIndex: prev.guidedPractice.versions.length },
          writingComprehension: { versions: [lessonContent.writingComprehension, ...prev.writingComprehension.versions].slice(0, 5), currentIndex: prev.writingComprehension.versions.length },
        }));

        // Set loading state for all sections
        setLessonContent(prev => ({
          ...prev,
          warmUp: 'Generating...',
          introduction: 'Generating...',
          guidedPractice: 'Generating...',
          writingComprehension: 'Generating...'
        }));

        // Generate all sections in parallel with streaming
        await Promise.all([
          handleStreamingResponse(
            '/generate-warmup',
            {
              topic: focus,
              storyTitle: story.title,
              storyContent: story.content,
              customPrompt: modifyPrompt
            },
            'warmUp',
            (content) => setLessonContent(prev => ({ ...prev, warmUp: content }))
          ),
          
          handleStreamingResponse(
            '/generate-guided-reading-intro',
            {
              title: story.title,
              content: story.content,
              skill: focus,
              customPrompt: modifyPrompt
            },
            'introduction',
            (content) => setLessonContent(prev => ({ ...prev, introduction: content }))
          ),
          
          handleStreamingResponse(
            '/generate-practice',
            {
              skill: focus,
              storyTitle: story.title,
              storyContent: story.content,
              customPrompt: modifyPrompt
            },
            'guidedPractice',
            (content) => setLessonContent(prev => ({ ...prev, guidedPractice: content }))
          ),
          
          handleStreamingResponse(
            '/generate-exit-ticket',
            {
              storyTitle: story.title,
              storyContent: story.content,
              skill: focus,
              customPrompt: modifyPrompt
            },
            'writingComprehension',
            (content) => setLessonContent(prev => ({ ...prev, writingComprehension: content }))
          )
        ]);

      } else {
        // Handle single section modification
        const sectionKey = selectedSection as keyof LessonContent;
        
        // Save current section state to history
        setSectionHistory(prev => ({
          ...prev,
          [sectionKey]: {
            versions: [lessonContent[sectionKey], ...prev[sectionKey].versions].slice(0, 5),
            currentIndex: prev[sectionKey].versions.length
          }
        }));

        // Set loading state for selected section
        setLessonContent(prev => ({
          ...prev,
          [sectionKey]: 'Generating...'
        }));

        // Generate new content with streaming
        switch (sectionKey) {
          case 'warmUp':
            await handleStreamingResponse(
              '/generate-warmup',
              {
                topic: focus,
                storyTitle: story.title,
                storyContent: story.content,
                customPrompt: modifyPrompt
              },
              sectionKey,
              (content) => setLessonContent(prev => ({ ...prev, [sectionKey]: content }))
            );
            break;

          case 'introduction':
            await handleStreamingResponse(
              '/generate-guided-reading-intro',
              {
                title: story.title,
                content: story.content,
                skill: focus,
                customPrompt: modifyPrompt
              },
              sectionKey,
              (content) => setLessonContent(prev => ({ ...prev, [sectionKey]: content }))
            );
            break;

          case 'guidedPractice':
            await handleStreamingResponse(
              '/generate-practice',
              {
                skill: focus,
                storyTitle: story.title,
                storyContent: story.content,
                customPrompt: modifyPrompt
              },
              sectionKey,
              (content) => setLessonContent(prev => ({ ...prev, [sectionKey]: content }))
            );
            break;

          case 'writingComprehension':
            await handleStreamingResponse(
              '/generate-exit-ticket',
              {
                storyTitle: story.title,
                storyContent: story.content,
                skill: focus,
                customPrompt: modifyPrompt,
                practiceContent: lessonContent.guidedPractice
              },
              sectionKey,
              (content) => setLessonContent(prev => ({ ...prev, [sectionKey]: content }))
            );
            break;
        }
      }
      
      setModifyPrompt(''); // Clear the prompt after successful modification
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
        {/* Original Fields */}
        <FormControl fullWidth sx={{ mb: 2 }}>
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

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
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

          {!selectedStandard && (
            <TextField
              label="Focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 2 
        }}>
          <TextField
            label="Focus"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            sx={{ flex: 2 }}
          />
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
                sx={{ flex: 1, minWidth: '200px' }}
              />
            )}
            sx={{ flex: 1 }}
          />
        </Box>

        {/* Book Title and Generate Lesson Plan Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <TextField
            label="Book/Text Title"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            sx={{ width: '40%' }}
            InputProps={{ readOnly: true }}
          />
          {story && (
            <IconButton
              onClick={() => setStoryDialogOpen(true)}
              size="medium"
              sx={{ 
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': { backgroundColor: 'primary.dark' },
                width: 40,
                height: 40
              }}
            >
              <BookIcon />
            </IconButton>
          )}
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateStory}
              disabled={(!focus && !selectedStandard) || !lexileLevel || isGeneratingStory}
              startIcon={isGeneratingStory ? <CircularProgress size={20} /> : null}
              sx={{ height: '48px' }}
            >
              {isGeneratingStory ? 'Generating...' : 'Generate Lesson Plan'}
            </Button>

            <Button
              variant="contained"
              color="secondary"
              onClick={handleSaveLessonPlan}
              disabled={!story || !selectedStandard || !lexileLevel || isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ height: '48px' }}
            >
              {isSaving ? 'Saving...' : currentLessonPlanId ? 'Update Lesson Plan' : 'Save Lesson Plan'}
            </Button>
          </Box>
        </Box>

        {/* Split Panel Layout */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          mt: 4,
          height: 'calc(100vh - 400px)', // Adjust this value based on your header height
          position: 'relative'
        }}>
          {/* Left Panel - Fixed */}
          <Box sx={{ 
            width: '300px',
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start'
          }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Section to Modify</InputLabel>
              <Select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value as 'all' | keyof LessonContent)}
                label="Select Section to Modify"
              >
                {MODIFY_SECTIONS.map((section) => (
                  <MenuItem key={section.value} value={section.value}>
                    {section.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              value={modifyPrompt}
              onChange={(e) => setModifyPrompt(e.target.value)}
              placeholder="Enter your modifications..."
              sx={{ mb: 2 }}
            />
            
            <Button
              fullWidth
              variant="contained"
              onClick={handleSectionModify}
              disabled={!modifyPrompt || isModifying}
              startIcon={isModifying ? <CircularProgress size={20} /> : null}
              sx={{ height: '48px' }}
            >
              {isModifying ? 'Modifying...' : 'Apply Changes'}
            </Button>
          </Box>

          {/* Right Panel - Scrollable */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            maxHeight: '100%',
            pr: 2, // Add padding for scrollbar
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
            {Object.entries(lessonContent).map(([key, content]) => {
              const sectionData = sectionHistory[key as keyof LessonContent];
              const hasVersions = sectionData.versions.length > 0;
              const isFirstVersion = sectionData.currentIndex === 0;
              const isLastVersion = sectionData.currentIndex === sectionData.versions.length - 1;
              const totalVersions = sectionData.versions.length;

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
                            onClick={() => handleVersionChange(key as keyof LessonContent, 'prev')}
                            size="small"
                          >
                            <ArrowBackIcon />
                          </IconButton>
                        )}
                        <Typography variant="body2" sx={{ mx: 2 }}>
                          {`${sectionData.currentIndex + 1}/${totalVersions}`}
                        </Typography>
                        {!isLastVersion && (
                          <IconButton
                            onClick={() => handleVersionChange(key as keyof LessonContent, 'next')}
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
                </Box>
              );
            })}
          </Box>
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