import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { User } from '../App';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: 'demo@healthcue.com',
    password: 'demo123'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: Use environment variable
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.access_token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Row className="justify-content-center">
      <Col md={6} lg={5}>
        <Card className="shadow">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <h2 className="text-primary">Welcome Back</h2>
              <p className="text-muted">Sign in to your HealthCue account</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  size="lg"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  size="lg"
                />
              </Form.Group>

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 py-2"
                disabled={loading}
                size="lg"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Form>

            <div className="text-center mt-4">
              <p className="text-muted">
                Don't have an account?{' '}
                <Button variant="link" onClick={onSwitchToRegister} className="p-0">
                  Sign up here
                </Button>
              </p>
            </div>

            <div className="mt-4 p-3 bg-light rounded">
              <div className="text-center">
                <small className="d-block text-muted mt-2">
                  <strong>Demo Credentials already filled</strong><br />
                  Email: demo@healthcue.com | Password: demo123
                </small>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default Login;