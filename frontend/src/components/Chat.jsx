import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Send, Plus, MessageSquare } from 'lucide-react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    setSessions(savedSessions);

    if (savedSessions.length > 0 && !currentSession) {
      setCurrentSession(savedSessions[0].id);
      setMessages(savedSessions[0].messages || []);
    }

    const newSocket = io('http://localhost:1337', { transports: ['websocket'], withCredentials: true });
    newSocket.on('connect', () => console.log('Connected to WebSocket server'));
    setSocket(newSocket);

    return () => newSocket.close();
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('chat message', (msg) => {
        const newMessage = {
          text: msg,
          timestamp: new Date().toISOString(),
          type: 'received'
        };
        setMessages(prev => [...prev, newMessage]);
        saveMessageToSession(newMessage);
      });
    }
  }, [socket, currentSession]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now(),
      name: `Chat ${sessions.length + 1}`,
      messages: []
    };

    setSessions(prev => {
      const updatedSessions = [...prev, newSession];
      localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
      return updatedSessions;
    });

    setCurrentSession(newSession.id);
    setMessages([]);
    setIsSidebarOpen(false);
  };


  useEffect(() => {
    const storedSessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
    if (storedSessions.length === 0) {
      createNewSession();
    }
  }, []);

  const switchSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(sessionId);
      setMessages(session.messages || []);
      setIsSidebarOpen(false);
    }
  };

  const saveMessageToSession = (message) => {
    setSessions(prev => {
      const updatedSessions = prev.map(session => {
        if (session.id === currentSession) {
          return {
            ...session,
            messages: [...(session.messages || []), message]
          };
        }
        return session;
      });
      localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
      return updatedSessions;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (messageInput.trim() && socket && currentSession) {
      const newMessage = {
        text: messageInput,
        timestamp: new Date().toISOString(),
        type: 'sent'
      };

      socket.emit('chat message', messageInput);
      setMessages(prev => [...prev, newMessage]);
      saveMessageToSession(newMessage);
      setMessageInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 w-72 bg-white shadow-lg transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-300 ease-in-out z-50
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <button
              onClick={createNewSession}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`
                  p-4 cursor-pointer hover:bg-blue-100 transition-colors duration-200
                  flex items-center gap-3
                  ${currentSession === session.id ? 'bg-blue-200 text-blue-700' : 'text-black'} 
                `}
              >
                <MessageSquare size={20} />
                <span className="truncate">{session.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-semibold">
                {sessions.find(s => s.id === currentSession)?.name || 'Chat'}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-6xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl p-3 rounded-lg
                    ${message.type === 'sent' 
                      ? 'bg-blue-600 text-white ml-12'  // Sent messages color
                      : 'bg-gray-200 text-gray-800 shadow-sm border mr-12'  // Received messages color
                    }
                  `}
                >
                  <p className="leading-relaxed">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t bg-white p-4">
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 text-black focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
              >
                <Send size={20} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;