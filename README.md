# AskMyDocs - Chat with Your PDFs (with Auth & Dashboard)

🚀 **Production-grade SaaS-style PDF chat application** with user authentication, dashboard, and AI-powered document interaction.

## Features

✅ **User Authentication** - JWT-based login/register  
✅ **Personal Dashboard** - Upload & manage your PDFs  
✅ **AI Chat Interface** - Ask questions about your documents  
✅ **Chat History** - Resume conversations with any PDF  
✅ **Secure File Storage** - User-specific file access  

## Tech Stack

**Backend:** FastAPI + MongoDB + LangChain + Gemini AI  
**Frontend:** React + Tailwind CSS + Zustand + React Router  
**AI:** Google Gemini Pro + FAISS Vector Store  

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB (local or Atlas)

### 1. Setup Backend
```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Start server
python main.py
```

### 2. Setup Frontend
```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### 3. Environment Variables
Update `backend/.env`:
```
GOOGLE_API_KEY=your_gemini_api_key
MONGODB_URL=mongodb://localhost:27017
SECRET_KEY=your-jwt-secret-key
```

## Usage

1. **Register/Login** at `http://localhost:5173`
2. **Upload PDFs** from your dashboard
3. **Chat with documents** - Ask questions and get AI responses
4. **View chat history** for each document

## API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /chat/upload` - Upload PDF
- `GET /chat/files` - Get user's files
- `POST /chat/query` - Ask questions
- `GET /chat/history/{filename}` - Get chat history

## Deployment Ready

- **Backend:** Deploy on Render/Railway
- **Frontend:** Deploy on Vercel/Netlify
- **Database:** MongoDB Atlas
- **Storage:** Local files (upgrade to AWS S3)

---

**Built for hackathons, portfolios, and production use! 🔥**