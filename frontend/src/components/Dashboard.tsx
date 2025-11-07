import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Button } from 'react-bootstrap';
import { User } from '../App';

interface DashboardData {
  stats: {
    total_entries: number;
    positive_entries: number;
    negative_entries: number;
    mood_score: number;
  };
  chart_data: Array<{
    date: string;
    score: number;
    label: string;
  }>;
  alerts: Array<{
    id: number;
    message: string;
    severity: string;
    created_at: string;
  }>;
}

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://13.62.164.30:5000/api';;

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/v1/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center">Loading your analytics...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!dashboardData) {
    return <Alert variant="warning">No data available. Start writing in your journal!</Alert>;
  }

  return (
    <div>
      <div className="mb-4 text-white">
        <h1>Welcome back, {user.username}! 👋</h1>
        <p className="lead">Your AI-Powered Mental Wellness Dashboard</p>
      </div>

      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-number text-primary">
                {dashboardData.stats.total_entries}
              </div>
              <div className="stats-label">Total Entries</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-number text-success">
                {dashboardData.stats.positive_entries}
              </div>
              <div className="stats-label">Positive Moods</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-number text-danger">
                {dashboardData.stats.negative_entries}
              </div>
              <div className="stats-label">Negative Moods</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-number text-warning">
                {dashboardData.stats.mood_score}%
              </div>
              <div className="stats-label">Wellness Score</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">📈 Your Mood Timeline</h5>
            </Card.Header>
            <Card.Body>
              {dashboardData.chart_data.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p>No data yet</p>
                  <p>Write journal entries to see your mood trends!</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Mood</th>
                        <th>AI Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.chart_data.map((entry, index) => (
                        <tr key={index}>
                          <td>{entry.date}</td>
                          <td>
                            <span className={
                              entry.label === 'Positive' ? 'text-success' : 
                              entry.label === 'Negative' ? 'text-danger' : 'text-secondary'
                            }>
                              {entry.label}
                            </span>
                          </td>
                          <td>{entry.score.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">⚠️ AI Health Alerts</h5>
            </Card.Header>
            <Card.Body>
              {dashboardData.alerts.length === 0 ? (
                <div className="text-center text-muted py-3">
                  <p>No alerts</p>
                  <p>🎉 Your mood patterns look good!</p>
                </div>
              ) : (
                dashboardData.alerts.map((alert) => (
                  <Alert key={alert.id} variant="warning">
                    <strong>{alert.message}</strong>
                    <br />
                    <small>{alert.created_at}</small>
                  </Alert>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;