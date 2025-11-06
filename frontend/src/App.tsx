import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import EmotionCapture from './components/EmotionCapture';
import Navbar from './components/navbar';

export interface User {
  id: number;
  username: string;
  email: string;
}

function App() {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'dashboard' | 'journal' | 'emotion'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setCurrentView('dashboard');
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    setCurrentView('dashboard');
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {user && (
        <Navbar 
          user={user} 
          onLogout={handleLogout}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      )}
      
      <div className="container mt-4">
        {currentView === 'login' && !user && (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentView('register')} />
        )}
        
        {currentView === 'register' && !user && (
          <Register onLogin={handleLogin} onSwitchToLogin={() => setCurrentView('login')} />
        )}
        
        {currentView === 'dashboard' && user && (
          <Dashboard user={user} />
        )}
        
        {currentView === 'journal' && user && (
          <Journal user={user} />
        )}
        
        {currentView === 'emotion' && user && (
          <EmotionCapture user={user} />
        )}
      </div>
    </div>
  );
}

export default App;