# TeachAssist Project Structure

This project consists of three main components:

## 1. AI Backend (`ai_backend/`)
- **Purpose**: Handles AI-related endpoints and OpenAI integration
- **Tech Stack**: Python, FastAPI
- **Development URL**: `http://localhost:5001`
- **Production URL**: `https://teach-ai-aq9x.vercel.app`
- **Environment Variables**:
  - `OPENAI_API_KEY`: OpenAI API key
  - `ENVIRONMENT`: 'development' or 'production'

## 2. Database Backend (`db_backend/`)
- **Purpose**: Handles database operations, authentication, and core API functionality
- **Tech Stack**: Node.js, Express, MongoDB
- **Development URL**: `http://localhost:5000`
- **Production URL**: `https://teach-ai-db-backend.vercel.app`
- **Environment Variables**:
  - `MONGODB_DEV_URI`: Development MongoDB connection string
  - `MONGODB_PROD_URI`: Production MongoDB connection string
  - `JWT_SECRET`: Secret key for JWT tokens
  - `SESSION_SECRET`: Secret key for sessions
  - `NODE_ENV`: 'development' or 'production'

## 3. Frontend (`client/`)
- **Purpose**: React application for the user interface
- **Tech Stack**: React, TypeScript, Material-UI
- **Development URL**: `http://localhost:3000`
- **Production URL**: `https://teach-ai-beige.vercel.app`
- **Environment Variables**:
  - `REACT_APP_API_URL`: DB Backend URL
  - `REACT_APP_AUTH_URL`: Auth endpoint URL
  - `REACT_APP_AI_URL`: AI Backend URL

## Development Setup

1. Clone the repository
2. Set up environment variables in each component
3. Install dependencies:
   ```bash
   # AI Backend
   cd ai_backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt

   # DB Backend
   cd db_backend
   npm install

   # Frontend
   cd client
   npm install
   ```
4. Start the development servers:
   ```bash
   # AI Backend
   cd ai_backend
   uvicorn main:app --reload --port 5001

   # DB Backend
   cd db_backend
   npm run dev

   # Frontend
   cd client
   npm start
   ```

## Production Deployment

All components are deployed on Vercel with their respective configurations in `vercel.json` files.
