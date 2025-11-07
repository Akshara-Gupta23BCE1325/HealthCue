import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Card, Button, Alert, Row, Col, Badge } from "react-bootstrap";
import * as faceapi from "face-api.js";

interface EmotionResult {
  emotion: string;
  confidence: number;
  timestamp: Date;
}

interface EmotionCaptureProps {
  user: { id: number; username: string };
}

const EmotionCapture: React.FC<EmotionCaptureProps> = ({ user }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [emotionResult, setEmotionResult] = useState<EmotionResult | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionResult[]>([]);
  const [error, setError] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "http://13.62.164.30:5000/api";

  /**  Load models and start webcam **/
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
        console.log("Models loaded ✅");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setTimeout(() => {
            videoRef.current
              ?.play()
              .then(() => setIsLoading(false))
              .catch(() => setIsLoading(false));
          }, 300);
        }
      } catch (err) {
        console.error(err);
        setError(
          "Could not initialize camera. You can still upload an image to test emotion detection."
        );
        setIsLoading(false);
      }
    };
    init();
  }, []);

  /**  Detect emotions (for live camera or uploaded image) **/
  const detectEmotion = async (input: HTMLVideoElement | HTMLImageElement | null) => {
    if (!input) return;
    setIsDetecting(true);
    try {
      const detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection) {
        const expressions = detection.expressions;
        const top = Object.entries(expressions).reduce((a, b) =>
          a[1] > b[1] ? a : b
        );

        const result: EmotionResult = {
          emotion: top[0],
          confidence: top[1],
          timestamp: new Date(),
        };
        setEmotionResult(result);
        setEmotionHistory((p) => [result, ...p.slice(0, 4)]);

        // draw overlays
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const size = {
            width: input instanceof HTMLVideoElement ? input.videoWidth : input.width,
            height: input instanceof HTMLVideoElement ? input.videoHeight : input.height,
          };
          faceapi.matchDimensions(canvas, size);
          const resized = faceapi.resizeResults(detection, size);
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceExpressions(canvas, resized);
        }

        await saveEmotionToBackend(result);
      } else {
        setError("No face detected. Try better lighting or another image.");
      }
    } catch (e) {
      console.error(e);
      setError("Emotion detection failed. Try again.");
    } finally {
      setIsDetecting(false);
    }
  };

  /**  Save to backend **/
  const saveEmotionToBackend = async (result: EmotionResult) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_BASE}/api/v1/emotion/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emotion: result.emotion,
          confidence: result.confidence,
        }),
      });
    } catch {
      console.log("Failed to save emotion to backend");
    }
  };

  /** Handle uploaded image **/
  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    setError("");
    setTimeout(() => {
      if (imageRef.current) detectEmotion(imageRef.current);
    }, 200);
  };

  const getEmotionDisplay = (emotion: string) => {
    const map: Record<string, { emoji: string; color: string; label: string }> = {
      happy: { emoji: "😊", color: "success", label: "Happy" },
      sad: { emoji: "😔", color: "primary", label: "Sad" },
      angry: { emoji: "😠", color: "danger", label: "Angry" },
      fearful: { emoji: "😨", color: "warning", label: "Fearful" },
      surprised: { emoji: "😲", color: "info", label: "Surprised" },
      disgusted: { emoji: "🤢", color: "secondary", label: "Disgusted" },
      neutral: { emoji: "😐", color: "secondary", label: "Neutral" },
    };
    return map[emotion] || { emoji: "❓", color: "secondary", label: emotion };
  };

  return (
    <div>
      <Row>
        <Col lg={8}>
          <Card className="shadow">
            <Card.Header>
              <h4 className="mb-0">Facial Emotion Detection</h4>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}

              <div className="position-relative mb-3">
                {uploadedImage ? (
                  <img
                    ref={imageRef}
                    src={uploadedImage}
                    alt="Uploaded"
                    width="100%"
                    style={{ borderRadius: "10px" }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    width="100%"
                    height="400"
                    style={{ borderRadius: "10px", backgroundColor: "#000" }}
                    muted
                  />
                )}
                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    borderRadius: "10px",
                  }}
                />
              </div>

              <div className="d-grid gap-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    detectEmotion(uploadedImage ? imageRef.current : videoRef.current)
                  }
                  disabled={isLoading || isDetecting}
                  size="lg"
                >
                  {isLoading
                    ? "Loading AI Models..."
                    : isDetecting
                    ? "Detecting..."
                    : uploadedImage
                    ? "Detect Emotion in Image"
                    : "Capture Current Emotion"}
                </Button>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="form-control mt-3"
                />

                {!isLoading && !isDetecting && (
                  <p className="text-success text-center mt-2">
                    ✅ Camera & AI Models Ready
                  </p>
                )}
              </div>

              {isLoading && (
                <div className="text-center mt-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading AI models...</span>
                  </div>
                  <p className="text-muted mt-2">
                    Loading emotion detection AI... (This may take a moment)
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {emotionResult && (
            <Card className="shadow mb-4">
              <Card.Header>
                <h5 className="mb-0">Detected Emotion</h5>
              </Card.Header>
              <Card.Body className="text-center">
                <div style={{ fontSize: "4rem" }}>
                  {getEmotionDisplay(emotionResult.emotion).emoji}
                </div>
                <h4
                  className={`text-${getEmotionDisplay(emotionResult.emotion).color}`}
                >
                  {getEmotionDisplay(emotionResult.emotion).label}
                </h4>
                <p className="text-muted">
                  Confidence: {(emotionResult.confidence * 100).toFixed(1)}%
                </p>
                <small className="text-muted">
                  Detected: {emotionResult.timestamp.toLocaleTimeString()}
                </small>
              </Card.Body>
            </Card>
          )}

          {emotionHistory.length > 0 && (
            <Card className="shadow">
              <Card.Header>
                <h5 className="mb-0">Recent Emotions</h5>
              </Card.Header>
              <Card.Body>
                {emotionHistory.map((r, i) => (
                  <div
                    key={i}
                    className="d-flex justify-content-between align-items-center mb-2"
                  >
                    <Badge bg={getEmotionDisplay(r.emotion).color}>
                      {getEmotionDisplay(r.emotion).emoji}{" "}
                      {getEmotionDisplay(r.emotion).label}
                    </Badge>
                    <small className="text-muted">
                      {(r.confidence * 100).toFixed(0)}%
                    </small>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default EmotionCapture;
