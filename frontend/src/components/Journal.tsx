import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, ListGroup, Badge, Row, Col } from 'react-bootstrap';
import { User } from '../App';

interface JournalEntry {
  id: number;
  content: string;
  sentiment_label: string;
  sentiment_score: number;
  created_at: string;
}

interface JournalProps {
  user: User;
}

const Journal: React.FC<JournalProps> = ({ user }) => {
  const [journalText, setJournalText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://13.62.164.30:5000/api';

const fetchEntries = async () => {
  try {
    const token = localStorage.getItem('access_token');
    console.log('Fetching journal entries, token:', token ? 'present' : 'missing');
    
    const response = await fetch(`${API_BASE}/api/v1/journal/entries`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Journal response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Journal entries loaded:', data.entries.length);
      setEntries(data.entries);
    } else {
      console.error('Failed to load journal entries');
      setError('Failed to load journal entries');
    }
  } catch (err) {
    console.error('Journal connection error:', err);
    setError('Cannot connect to server');
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalText.trim()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/v1/journal/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: journalText
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Entry saved! AI detected: ${data.entry.sentiment_label} mood`);
        setJournalText('');
        fetchEntries();
      } else {
        setError(data.error || 'Failed to save entry');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const getSentimentVariant = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'success';
      case 'Negative': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Row>
      <Col lg={6}>
        <Card className="shadow">
          <Card.Header>
            <h4 className="mb-0">How are you feeling today?</h4>
          </Card.Header>
          <Card.Body>
            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Express your thoughts...</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="Write about your day. Our AI will analyze the sentiment automatically."
                  disabled={loading}
                />
              </Form.Group>

              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || !journalText.trim()}
                className="w-100"
              >
                {loading ? 'Analyzing with AI...' : 'Save Entry & Analyze Mood'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6}>
        <Card className="shadow">
          <Card.Header>
            <h4 className="mb-0">Your Journal History</h4>
          </Card.Header>
          <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {entries.length === 0 ? (
              <div className="text-center text-muted py-4">
                <p>No entries yet. Start writing!</p>
              </div>
            ) : (
              <ListGroup variant="flush">
                {entries.map((entry) => (
                  <ListGroup.Item key={entry.id}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge bg={getSentimentVariant(entry.sentiment_label)}>
                        {entry.sentiment_label}
                      </Badge>
                      <small className="text-muted">{entry.created_at}</small>
                    </div>
                    <p className="mb-1">{entry.content}</p>
                    <small className="text-muted">
                      AI Score: {entry.sentiment_score.toFixed(3)}
                    </small>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default Journal;