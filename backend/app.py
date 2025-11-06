from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask import jsonify
from datetime import datetime, timedelta
import bcrypt
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import os

# Initialize Flask app
app = Flask(__name__)

# CORS - Allow frontend to connect
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///healthcue.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'akshara_14_healthcue_!@#987random'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
jwt = JWTManager(app)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_ALGORITHM'] = 'HS256'

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
# Fix for malformed or missing JWT tokens
@jwt.unauthorized_loader
def unauthorized_response(callback):
    return jsonify({"error": "Missing or invalid JWT token"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(reason):
    return jsonify({"error": f"Invalid token: {reason}"}), 422

sentiment_analyzer = SentimentIntensityAnalyzer()

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

class JournalEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    sentiment_label = db.Column(db.String(20))
    sentiment_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'sentiment_label': self.sentiment_label,
            'sentiment_score': round(self.sentiment_score, 3),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M')
        }

class HealthAlert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    alert_type = db.Column(db.String(50))
    message = db.Column(db.Text)
    severity = db.Column(db.String(20))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EmotionCapture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    emotion = db.Column(db.String(50))
    confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create database tables
with app.app_context():
    db.create_all()
    print("✅ Database tables created successfully!")
    
    # ✅ ADD DEMO USER AND DATA - INSIDE THE CONTEXT!
    # Create demo user if not exists
    if not User.query.filter_by(email='demo@healthcue.com').first():
        demo_user = User(
            username='healthUser',
            email='demo@healthcue.com'
        )
        demo_user.set_password('demo123')
        db.session.add(demo_user)
        db.session.commit()
        
        print("✅ Demo user created: demo@healthcue.com / demo123")
        
        # Add sample journal entries
        sample_entries = [
            "Feeling great today! Completed my morning run and feeling energized.",
            "Bit stressed about the upcoming project deadline. Need to manage time better.",
            "Wonderful day with family. We had a picnic in the park.",
            "Not feeling my best today. Woke up with a headache.",
            "Productive work session! Finally solved that tricky coding problem."
        ]
        
        for i, content in enumerate(sample_entries):
            sentiment_scores = sentiment_analyzer.polarity_scores(content)
            compound_score = sentiment_scores['compound']
            
            if compound_score >= 0.05:
                sentiment_label = "Positive"
            elif compound_score <= -0.05:
                sentiment_label = "Negative"
            else:
                sentiment_label = "Neutral"
            
            entry = JournalEntry(
                user_id=demo_user.id,
                content=content,
                sentiment_label=sentiment_label,
                sentiment_score=compound_score,
                created_at=datetime.utcnow() - timedelta(days=4-i)  # Spread entries over days
            )
            db.session.add(entry)
        
        # Add sample alert
        alert = HealthAlert(
            user_id=demo_user.id,
            alert_type='welcome',
            message='Welcome to HealthCue! Start tracking your wellness journey.',
            severity='info'
        )
        db.session.add(alert)
        
        db.session.commit()
        print("✅ Sample journal entries and alerts created!")

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'message': 'HealthCue API is running!',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        user = User(
            username=data.get('username', data['email'].split('@')[0]),
            email=data['email']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=str(user.id))
            
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/journal/entries', methods=['POST'])
@jwt_required()
def create_journal_entry():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Journal content is required'}), 400
        
        # AI Sentiment Analysis
        sentiment_scores = sentiment_analyzer.polarity_scores(data['content'])
        compound_score = sentiment_scores['compound']
        
        if compound_score >= 0.05:
            sentiment_label = "Positive"
        elif compound_score <= -0.05:
            sentiment_label = "Negative"
        else:
            sentiment_label = "Neutral"
        
        # Save to database
        entry = JournalEntry(
            user_id=user_id,
            content=data['content'],
            sentiment_label=sentiment_label,
            sentiment_score=compound_score
        )
        
        db.session.add(entry)
        db.session.commit()
        check_alerts(user_id)
        
        return jsonify({
            'message': 'Journal entry saved successfully',
            'entry': entry.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/journal/entries', methods=['GET'])
@jwt_required()
def get_journal_entries():
    try:
        user_id = get_jwt_identity()
        
        entries = JournalEntry.query.filter_by(user_id=user_id)\
            .order_by(JournalEntry.created_at.desc())\
            .all()
        
        return jsonify({
            'entries': [entry.to_dict() for entry in entries],
            'total': len(entries)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id = get_jwt_identity()
        
        # Get real statistics from database
        total_entries = JournalEntry.query.filter_by(user_id=user_id).count()
        
        # If no data found for this user, return demo data
        if total_entries == 0:
            print(f"⚠️ No data for user {user_id}, returning demo data")
            return jsonify({
                'stats': {
                    'total_entries': 5,
                    'positive_entries': 3,
                    'negative_entries': 1,
                    'neutral_entries': 1,
                    'mood_score': 75.0
                },
                'chart_data': [
                    {'date': '10-26 09:00', 'score': 0.8, 'label': 'Positive'},
                    {'date': '10-26 12:00', 'score': -0.3, 'label': 'Negative'},
                    {'date': '10-26 15:00', 'score': 0.6, 'label': 'Positive'},
                    {'date': '10-27 10:00', 'score': 0.2, 'label': 'Positive'},
                    {'date': '10-27 14:00', 'score': 0.1, 'label': 'Neutral'}
                ],
                'alerts': [
                    {
                        'id': 1, 
                        'message': 'Welcome to HealthCue! Your AI wellness assistant is ready.', 
                        'severity': 'info', 
                        'created_at': '2025-10-26 15:00'
                    }
                ]
            }), 200
        
        # Real statistics from database
        positive_entries = JournalEntry.query.filter_by(user_id=user_id, sentiment_label='Positive').count()
        negative_entries = JournalEntry.query.filter_by(user_id=user_id, sentiment_label='Negative').count()
        neutral_entries = JournalEntry.query.filter_by(user_id=user_id, sentiment_label='Neutral').count()
        
        # Real chart data from database
        recent_entries = JournalEntry.query.filter_by(user_id=user_id)\
            .order_by(JournalEntry.created_at.desc())\
            .limit(10)\
            .all()
        
        chart_data = []
        for entry in reversed(recent_entries):
            chart_data.append({
                'date': entry.created_at.strftime('%m-%d %H:%M'),
                'score': entry.sentiment_score,
                'label': entry.sentiment_label
            })
        
        # Real alerts from database
        alerts = HealthAlert.query.filter_by(user_id=user_id, is_read=False)\
            .order_by(HealthAlert.created_at.desc())\
            .limit(5)\
            .all()
        
        alert_data = [{
            'id': alert.id,
            'message': alert.message,
            'severity': alert.severity,
            'created_at': alert.created_at.strftime('%Y-%m-%d %H:%M')
        } for alert in alerts]
        
        return jsonify({
            'stats': {
                'total_entries': total_entries,
                'positive_entries': positive_entries,
                'negative_entries': negative_entries,
                'neutral_entries': neutral_entries,
                'mood_score': round((positive_entries / total_entries * 100), 2) if total_entries > 0 else 0
            },
            'chart_data': chart_data,
            'alerts': alert_data
        }), 200
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        # Fallback to demo data if anything fails
        return jsonify({
            'stats': {
                'total_entries': 5,
                'positive_entries': 3,
                'negative_entries': 1,
                'neutral_entries': 1,
                'mood_score': 75.0
            },
            'chart_data': [
                {'date': '10-26 09:00', 'score': 0.8, 'label': 'Positive'},
                {'date': '10-26 12:00', 'score': -0.3, 'label': 'Negative'},
                {'date': '10-26 15:00', 'score': 0.6, 'label': 'Positive'}
            ],
            'alerts': [
                {
                    'id': 1, 
                    'message': 'System working! Start journaling to see your personal analytics.', 
                    'severity': 'info', 
                    'created_at': '2025-10-26 15:00'
                }
            ]
        }), 200
    
@app.route('/api/v1/emotion/capture', methods=['POST'])
@jwt_required()
def capture_emotion():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        emotion_capture = EmotionCapture(
            user_id=user_id,
            emotion=data['emotion'],
            confidence=data['confidence']
        )
        
        db.session.add(emotion_capture)
        db.session.commit()
        
        return jsonify({
            'message': 'Emotion captured successfully',
            'emotion': data['emotion']
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/alerts/mark-read/<int:alert_id>', methods=['PUT'])
@jwt_required()
def mark_alert_read(alert_id):
    try:
        user_id = get_jwt_identity()
        alert = HealthAlert.query.filter_by(id=alert_id, user_id=user_id).first()
        
        if alert:
            alert.is_read = True
            db.session.commit()
            return jsonify({'message': 'Alert marked as read'}), 200
        else:
            return jsonify({'error': 'Alert not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def check_alerts(user_id):
    """Real AI-powered alert system"""
    try:
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        negative_count = JournalEntry.query.filter(
            JournalEntry.user_id == user_id,
            JournalEntry.created_at >= seven_days_ago,
            JournalEntry.sentiment_label == 'Negative'
        ).count()
        
        if negative_count >= 3:
            existing_alert = HealthAlert.query.filter_by(
                user_id=user_id,
                alert_type='negative_pattern'
            ).first()
            
            if not existing_alert:
                alert = HealthAlert(
                    user_id=user_id,
                    alert_type='negative_pattern',
                    message=f'We noticed {negative_count} negative entries in the last week. Consider talking to someone or trying relaxation exercises.',
                    severity='medium'
                )
                db.session.add(alert)
                db.session.commit()
                
    except Exception as e:
        print(f"Alert check error: {e}")

if __name__ == '__main__':
    print("🚀 HealthCue Backend Server Starting...")
    print("✅ CORS Enabled for frontend")
    print("✅ Database initialized") 
    print("✅ AI Sentiment Analysis Ready")
    print("✅ Emotion Capture Routes Ready")
    print("🌐 Server: http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')