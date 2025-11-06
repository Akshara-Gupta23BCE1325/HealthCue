import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Container } from 'react-bootstrap';
import { User } from '../App';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  currentView: string;
  onViewChange: (view: 'dashboard' | 'journal' | 'emotion') => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, currentView, onViewChange }) => {
  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BootstrapNavbar.Brand href="#">
          🧠 HealthCue
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              active={currentView === 'dashboard'} 
              onClick={() => onViewChange('dashboard')}
              style={{ cursor: 'pointer' }}
            >
              📊 Dashboard
            </Nav.Link>
            <Nav.Link 
              active={currentView === 'journal'} 
              onClick={() => onViewChange('journal')}
              style={{ cursor: 'pointer' }}
            >
              📝 Journal
            </Nav.Link>
            <Nav.Link 
              active={currentView === 'emotion'} 
              onClick={() => onViewChange('emotion')}
              style={{ cursor: 'pointer' }}
            >
              😊 Emotion Detection
            </Nav.Link>
          </Nav>
          
          <Nav>
            <Nav.Link disabled>Welcome, {user.username}!</Nav.Link>
            <Nav.Link onClick={onLogout} style={{ cursor: 'pointer' }}>
              🚪 Logout
            </Nav.Link>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;