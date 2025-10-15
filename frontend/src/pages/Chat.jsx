import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function Chat() {
  const { filename } = useParams();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pdfViewerRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
  }, [filename]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/chat/history/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion('');
    setLoading(true);
    
    const userMessage = {
      question: currentQuestion,
      answer: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    setMessages(prev => [...prev, userMessage]);

    const formData = new FormData();
    formData.append('filename', filename);
    formData.append('question', currentQuestion);

    try {
      const response = await axios.post('http://localhost:8000/chat/query', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessages(prev => {
        const newMessages = [...prev];
        const newMessage = {
          question: currentQuestion,
          answer: response.data.response,
          sources: response.data.sources || [],
          timestamp: new Date().toISOString(),
          isLoading: false
        };
        newMessages[newMessages.length - 1] = newMessage;
        
        // Auto-navigate to first cited page
        if (newMessage.sources && newMessage.sources.length > 0) {
          const firstPage = newMessage.sources[0].page;
          if (firstPage && firstPage !== 'Unknown') {
            setTimeout(() => navigateToPage(parseInt(firstPage)), 1000);
          }
        }
        
        return newMessages;
      });
    } catch (error) {
      setMessages(prev => prev.slice(0, -1));
      alert('Query failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const navigateToPage = (pageNum) => {
    setCurrentPage(pageNum);
    if (pdfViewerRef.current) {
      pdfViewerRef.current.src = `http://localhost:8000/uploads/${encodeURIComponent(filename)}#page=${pageNum}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-gray-700 hover:text-blue-700 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="p-1 bg-white rounded-lg shadow-sm">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <span className="font-medium text-sm">Back to Dashboard</span>
              </button>
              
              <div className="w-px h-8 bg-gray-200"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900 truncate" style={{maxWidth: '20rem'}}>{filename}</h1>
                  <p className="text-sm text-gray-500">AI Assistant with Citations</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ● Online
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6" style={{height: 'calc(100vh - 120px)'}}>
        {/* PDF Viewer */}
        <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Document Viewer</h3>
          </div>
          <div className="h-full p-4">
            <div className="relative h-full">
              <div className="absolute top-2 right-2 z-10 bg-white rounded-lg shadow-sm border px-3 py-1 text-sm">
                Page {currentPage}
              </div>
              <iframe
                ref={pdfViewerRef}
                src={`http://localhost:8000/uploads/${encodeURIComponent(filename)}#page=${currentPage}`}
                className="w-full h-full rounded border"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="w-1/2 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Conversation</h3>
                <p className="text-gray-600 mb-6">Ask me anything about your document. I'm here to help you understand and explore its contents.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button 
                    onClick={() => setQuestion("What is this document about?")}
                    className="btn btn-secondary text-sm"
                  >
                    What is this about?
                  </button>
                  <button 
                    onClick={() => setQuestion("Summarize the key points")}
                    className="btn btn-secondary text-sm"
                  >
                    Summarize key points
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div style={{maxWidth: '28rem'}}>
                    <div className="chat-bubble-user">
                      <p className="text-sm" style={{lineHeight: '1.5'}}>{msg.question}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {/* AI Response */}
                <div className="flex justify-start">
                  <div style={{maxWidth: '28rem'}}>
                    <div className="flex items-start space-x-3">
                      <div className="avatar avatar-ai mt-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="chat-bubble-ai">
                        {msg.isLoading ? (
                          <div className="flex items-center space-x-3">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-sm text-gray-500">AI is thinking...</span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-800" style={{lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{msg.answer}</p>
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                                <div className="space-y-2">
                                  {msg.sources.map((source, idx) => (
                                    <div key={idx} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-blue-400 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => navigateToPage(parseInt(source.page))}>
                                      <div className="font-medium text-blue-700 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        Page {source.page}
                                      </div>
                                      <div className="text-gray-600 mt-1">{source.content}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {!msg.isLoading && (
                      <p className="text-xs text-gray-500 mt-2" style={{marginLeft: '2.75rem'}}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

          {/* Input Form */}
          <div className="card p-4">
            <form onSubmit={handleSubmit}>
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask me anything about your document..."
                    className="w-full px-4 py-3 bg-gray-50 border-0 resize-none text-gray-900 rounded-lg"
                    style={{outline: 'none', maxHeight: '8rem'}}
                    rows="1"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {loading ? (
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}