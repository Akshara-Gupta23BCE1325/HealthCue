from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import bcrypt
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import os

# Initialize Flask app
app = Flask(__name__)

# ✅ CORS - Allow all AWS/S3/CloudFront frontend connections
CORS(app, origins=["*"], supports_credentials=True)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///healthcue.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'akshara_14_healthcue_!@#987random'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
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

# Initialize sentiment analyzer
sentiment_analyzer = SentimentIntensityAnalyzer()

# ------------------ MODELS ------------------
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

# ------------------ DATABASE SETUP ------------------
with app.app_context():
    db.create_all()
    print("✅ Database tables created successfully!")

    if not User.query.filter_by(email='demo@healthcue.com').first():
        demo_user = User(username='healthUser', email='demo@healthcue.com')
        demo_user.set_password('demo123')
        db.session.add(demo_user)
        db.session.commit()
        print("✅ Demo user created: demo@healthcue.com / demo123")

        # Add demo data
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
            sentiment_label = (
                "Positive" if compound_score >= 0.05
                else "Negative" if compound_score <= -0.05
                else "Neutral"
            )

            entry = JournalEntry(
                user_id=demo_user.id,
                content=content,
                sentiment_label=sentiment_label,
                sentiment_score=compound_score,
                created_at=datetime.utcnow() - timedelta(days=4 - i)
            )
            db.session.add(entry)

        db.session.add(HealthAlert(
            user_id=demo_user.id,
            alert_type='welcome',
            message='Welcome to HealthCue! Start tracking your wellness journey.',
            severity='info'
        ))
        db.session.commit()
        print("✅ Sample data inserted!")

# ------------------ ROUTES ------------------
@app.route("/")
def home():
    return "<h2>✅ HealthCue Backend is Running on AWS!</h2><p>Try /api/v1 endpoints for data.</p>"

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'HealthCue API is running!',
        'timestamp': datetime.utcnow().isoformat()
    })

# (All your other routes remain unchanged)
# Register, Login, Journal, Alerts, Dashboard, etc.
# ------------------ END ROUTES ------------------

# ------------------ ALERT SYSTEM ------------------
def check_alerts(user_id):
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
                db.session.add(HealthAlert(
                    user_id=user_id,
                    alert_type='negative_pattern',
                    message=f'We noticed {negative_count} negative entries in the last week. Consider relaxation or talking to someone.',
                    severity='medium'
                ))
                db.session.commit()
    except Exception as e:
        print(f"Alert check error: {e}")

# ------------------ MAIN ------------------
if __name__ == '__main__':
    print("🚀 HealthCue Backend Server Starting...")
    print("✅ CORS Enabled for all domains")
    print("✅ Database initialized")
    print("✅ AI Sentiment Analysis Ready")
    print("✅ Emotion Capture Routes Ready")
    print("🌐 Server: http://13.62.164.30:5000/api")
    app.run(debug=True, port=5000, host='0.0.0.0')
