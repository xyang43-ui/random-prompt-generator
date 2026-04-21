import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';

// --- 数据定义 ---
interface Prompt {
  id: number;
  prompt_text: string;
  response_text?: string;
  media_url: string;
  media_type: string;
}

const VERBS = ["organize", "deconstruct", "reimagine", "capture", "distort", "sequence", "translate", "mirror", "fragment", "amplify", "mute", "loop", "invert", "layer", "dissolve", "bridge", "anchor", "drift", "pulse", "echo", "trace", "etch", "mold", "stitch", "shatter", "warp", "tint", "carve", "fold", "unfold", "mask", "reveal", "blend", "clash", "float", "sink", "scatter", "gather", "twist", "spin", "balance", "tilt", "cut", "paste", "erase", "mark", "vibrate", "still", "motion", "intersect", "overlap", "synchronize", "isolate", "rotate", "expand", "collapse", "saturate", "desaturate", "expose"];
const NOUNS = [{ s: "text", p: "texts" }, { s: "sound", p: "sounds" }, { s: "shadow", p: "shadows" }, { s: "memory", p: "memories" }, { s: "rhythm", p: "rhythms" }, { s: "void", p: "voids" }, { s: "color", p: "colors" }, { s: "texture", p: "textures" }, { s: "movement", p: "movements" }, { s: "silence", p: "silences" }, { s: "glitch", p: "glitches" }, { s: "pattern", p: "patterns" }, { s: "dream", p: "dreams" }, { s: "city", p: "cities" }, { s: "face", p: "faces" }, { s: "word", p: "words" }, { s: "line", p: "lines" }, { s: "shape", p: "shapes" }, { s: "breath", p: "breaths" }, { s: "pulse", p: "pulses" }, { s: "reflection", p: "reflections" }, { s: "fragment", p: "fragments" }, { s: "ghost", p: "ghosts" }, { s: "mirror", p: "mirrors" }, { s: "surface", p: "surfaces" }, { s: "depth", p: "depths" }, { s: "limit", p: "limits" }, { s: "flow", p: "flows" }, { s: "friction", p: "frictions" }, { s: "gravity", p: "gravities" }, { s: "time", p: "times" }, { s: "space", p: "spaces" }, { s: "light", p: "lights" }, { s: "dark", p: "darks" }, { s: "noise", p: "noises" }, { s: "signal", p: "signals" }, { s: "body", p: "bodies" }, { s: "skin", p: "skins" }, { s: "bone", p: "bones" }, { s: "liquid", p: "liquids" }, { s: "gas", p: "gases" }, { s: "solid", p: "solids" }, { s: "weight", p: "weights" }, { s: "mass", p: "masses" }, { s: "scale", p: "scales" }, { s: "distance", p: "distances" }, { s: "proximity", p: "proximities" }, { s: "boundary", p: "boundaries" }, { s: "portal", p: "portals" }, { s: "seed", p: "seeds" }, { s: "echo", p: "echoes" }, { s: "trace", p: "traces" }, { s: "spectrum", p: "spectrums" }, { s: "landscape", p: "landscapes" }, { s: "vessel", p: "vessels" }, { s: "horizon", p: "horizons" }, { s: "structure", p: "structures" }, { s: "sequence", p: "sequences" }, { s: "wave", p: "waves" }, { s: "field", p: "fields" }];
const FONTS = ["'Inter', sans-serif", "'Space Mono', monospace", "'Playfair Display', serif", "'Courier New', Courier, monospace", "Georgia, serif", "Impact, Charcoal, sans-serif", "'Times New Roman', Times, serif", "Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif", "Monaco, monospace", "'Garamond', serif", "'Futura', sans-serif", "'Rockwell', serif"];
const ABOUT_FONTS = ["'Playfair Display', serif", "'Space Mono', monospace", "Impact, Charcoal, sans-serif"];
const BGM_FILES = ["calm-rhodes-piano-smooth.mp3", "cat-meditation.mp3", "cornfield.mp3", "crackling-fire.mp3", "ocean-waves.mp3", "podcast-lo-fi.mp3", "quietphase-ambient-zen.mp3", "rain-lofi.mp3", "rain-whisper-calm-ambient.mp3", "sad-lo-fi.mp3", "serene-reflections-piano.mp3", "shadows-in-the-haze-piano.mp3", "white-noise.mp3", "zen-oasis.mp3"];

const API_BASE_URL = "https://random-prompt-generator-production.up.railway.app";

const Visualizer: React.FC<{ analyzer: AnalyserNode | null, isPlaying: boolean }> = ({ analyzer, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!analyzer || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, 32, 12); if (isPlaying) analyzer.getByteFrequencyData(dataArray);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 8; i++) { const h = (dataArray[i * 2] / 255) * 12; ctx.fillRect(i * 4, 12 - h, 2, h); }
      animationFrameId = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(animationFrameId);
  }, [analyzer, isPlaying]);
  return <canvas ref={canvasRef} width={32} height={12} className="visualizer-canvas" />;
};

const InteractiveLine: React.FC<{ text: string, font: string, mousePos: { x: number, y: number }, isHolding: boolean, progress: number }> = ({ text, font, mousePos, isHolding, progress }) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, skew: 0, blur: 0 });
  const letterSpacings = useMemo(() => text.split('').map(() => (Math.random() * 0.3 - 0.05) + 'em'), [text]);
  useEffect(() => {
    let animationFrameId: number;
    const update = () => {
      if (!lineRef.current) return;
      const rect = lineRef.current.getBoundingClientRect();
      const dx = mousePos.x - (rect.left + rect.width / 2); const dy = mousePos.y - (rect.top + rect.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 450) { const force = (1 - distance / 450); setTransform({ x: -(dx / distance) * (isHolding ? force * 40 : force * 20), y: -(dy / distance) * (isHolding ? force * 40 : force * 20), skew: (dx / 450) * 15, blur: isHolding ? force * 5 : force * 2 }); }
      else { setTransform(prev => ({ x: prev.x * 0.92, y: prev.y * 0.92, skew: prev.skew * 0.92, blur: prev.blur * 0.92 })); }
      animationFrameId = requestAnimationFrame(update);
    };
    update(); return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos, isHolding]);
  return (
    <div ref={lineRef} className={`line glitch-text ${isHolding ? 'is-holding' : ''}`} data-text={text} style={{ fontFamily: font, transform: `translate(${transform.x}px, ${transform.y}px) skewX(${transform.skew}deg)`, filter: `blur(${transform.blur}px)` }}>
      {text.split('').map((char, i) => (<span key={i} style={{ marginRight: letterSpacings[i], display: 'inline-block' }}>{char === ' ' ? '\u00A0' : char}</span>))}
    </div>
  );
};

const InteractiveBackground: React.FC<{ isHolding: boolean; progress: number; mousePos: { x: number; y: number } }> = ({ isHolding, progress, mousePos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let particles: Array<any> = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createRadialGradient(mousePos.x, mousePos.y, 0, mousePos.x, mousePos.y, isHolding ? 250 + progress * 8 : 250);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${isHolding ? 0.08 + progress / 500 : 0.05})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (Math.random() > 0.4) particles.push({ x: mousePos.x, y: mousePos.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, size: Math.random() * 3, life: 1.0 });
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.015; ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.3})`; ctx.fillRect(p.x, p.y, p.size, p.size); });
      requestAnimationFrame(render);
    };
    render(); return () => window.removeEventListener('resize', resize);
  }, [isHolding, progress, mousePos]);
  return <canvas ref={canvasRef} className="interactive-bg" />;
};

const FloatingPrompt: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => {
  const [pos, setPos] = useState({ x: Math.random() * (window.innerWidth - 200), y: Math.random() * (window.innerHeight - 100) });
  const [vel] = useState({ x: (Math.random() - 0.5) * 1.5, y: (Math.random() - 0.5) * 1.5 });
  const font = useMemo(() => FONTS[Math.floor(Math.random() * FONTS.length)], []);

  useEffect(() => {
    let animationFrameId: number;
    const update = () => {
      setPos(prev => {
        let nextX = prev.x + vel.x;
        let nextY = prev.y + vel.y;
        if (nextX <= 0 || nextX >= window.innerWidth - 200) vel.x *= -1;
        if (nextY <= 0 || nextY >= window.innerHeight - 100) vel.y *= -1;
        return { x: nextX, y: nextY };
      });
      animationFrameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationFrameId);
  }, [vel]);

  return (
    <div 
      className="floating-prompt" 
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, fontFamily: font }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {text}
    </div>
  );
};

const UploadModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [promptText, setPromptText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('prompt_text', promptText);
    formData.append('response_text', responseText);
    if (file) formData.append('media', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        onSuccess();
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-prompt-title">SUBMIT YOUR PROMPT</div>
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>PROMPT</label>
            <input 
              type="text" 
              value={promptText} 
              onChange={(e) => setPromptText(e.target.value)} 
              placeholder=""
              required
            />
          </div>
          <div className="form-group">
            <label>RESPONSE</label>
            <textarea 
              value={responseText} 
              onChange={(e) => setResponseText(e.target.value)} 
              placeholder=""
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>MEDIA FILE (IMAGE/VIDEO/AUDIO)</label>
            <input 
              type="file" 
              accept="image/*,video/*,audio/*" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              placeholder="Select file"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>CANCEL</button>
            <button type="submit" className="submit-btn" disabled={isUploading}>
              {isUploading ? 'UPLOADING...' : 'SUBMIT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ArchiveFloatingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchPrompts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts`);
      const data = await response.json();
      setPrompts(data);
    } catch (err) {
      console.error("Failed to fetch prompts:", err);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this prompt?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSelectedPrompt(null);
        fetchPrompts();
      } else {
        alert("Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete error");
    }
  };

  return (
    <div className="sub-archive-view archive-floating-container">
      <button className="back-btn" style={{ position: 'absolute', top: '40px', left: '40px', margin: 0 }} onClick={onBack}>BACK TO HOME</button>
      <button className="upload-btn-trigger" onClick={() => setIsUploadOpen(true)}>UPLOAD</button>
      
      {prompts.length === 0 ? (
        <FloatingPrompt text="explain randomness" onClick={() => setSelectedPrompt({ id: 0, prompt_text: "explain randomness", media_url: "", media_type: "placeholder" })} />
      ) : (
        prompts.map(p => (
          <FloatingPrompt key={p.id} text={p.prompt_text} onClick={() => setSelectedPrompt(p)} />
        ))
      )}

      {selectedPrompt && (
        <div className="modal-overlay" onClick={() => setSelectedPrompt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-prompt-title">{selectedPrompt.prompt_text}</div>
            
            {selectedPrompt.response_text && (
              <div className="modal-response-text">{selectedPrompt.response_text}</div>
            )}

            {selectedPrompt.media_type !== 'text' && (
              <div className="modal-media-container">
                {selectedPrompt.media_type === 'image' && <img src={selectedPrompt.media_url} alt={selectedPrompt.prompt_text} className="modal-media" />}
                {selectedPrompt.media_type === 'video' && <video src={selectedPrompt.media_url} controls className="modal-media" />}
                {selectedPrompt.media_type === 'audio' && (
                  <div className="audio-display">
                    <div className="modal-placeholder-icon">♬</div>
                    <audio src={selectedPrompt.media_url} controls />
                  </div>
                )}
                {selectedPrompt.media_type === 'placeholder' && (
                  <div className="modal-placeholder">
                    <div className="modal-placeholder-icon">⠿</div>
                    <div className="modal-placeholder-text">MEDIA CONTENT PLACEHOLDER</div>
                  </div>
                )}
              </div>
            )}

            {selectedPrompt.id !== 0 && (
              <button className="delete-btn" onClick={() => handleDelete(selectedPrompt.id)}>DELETE PROMPT</button>
            )}
            <div className="modal-placeholder-text" style={{ fontSize: '0.6rem', marginTop: '20px' }}>CLICK OUTSIDE TO RETURN</div>
          </div>
        </div>
      )}

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={() => {
            setIsUploadOpen(false);
            fetchPrompts();
          }} 
        />
      )}
    </div>
  );
};

const CustomCursor: React.FC<{ mousePos: { x: number, y: number }, isHolding: boolean }> = ({ mousePos, isHolding }) => {
  return (
    <div 
      className={`custom-cursor ${isHolding ? 'is-holding' : ''}`} 
      style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
    />
  );
};

function App() {
  type ViewState = "home" | "archive" | "archive_random" | "archive_about" | "archive_nature";
  const [view, setView] = useState<ViewState>("home");
  const [verb, setVerb] = useState("click &"); const [article, setArticle] = useState(""); const [noun, setNoun] = useState("hold");
  const [isPlural, setIsPlural] = useState(true); const [verbFont, setVerbFont] = useState(FONTS[0]); const [articleFont, setArticleFont] = useState(FONTS[0]); const [nounFont, setNounFont] = useState(FONTS[0]);
  const [isHolding, setIsHolding] = useState(false); const [progress, setProgress] = useState(0); const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isMusicPanelOpen, setIsMusicPanelOpen] = useState(false); const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5); const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); const audioCtxRef = useRef<AudioContext | null>(null); const analyzerRef = useRef<AnalyserNode | null>(null);

  const [aboutPromptIndex, setAboutPromptIndex] = useState(0);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext(); const analyzer = ctx.createAnalyser(); analyzer.fftSize = 64;
      const source = ctx.createMediaElementSource(audioRef.current!); source.connect(analyzer); analyzer.connect(ctx.destination);
      audioCtxRef.current = ctx; analyzerRef.current = analyzer;
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  };

  const handleTrackChange = (track: string | null) => {
    initAudio(); if (!track) { audioRef.current?.pause(); setIsPlaying(false); setCurrentTrack(null); return; }
    setCurrentTrack(track); setIsPlaying(true); setTimeout(() => { if (audioRef.current) audioRef.current.play(); }, 0);
  };

  const generateRandomPrompt = useCallback(() => {
    const v = VERBS[Math.floor(Math.random() * VERBS.length)]; const nObj = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const plural = Math.random() > 0.5; setVerb(v); setIsPlural(plural); setVerbFont(FONTS[Math.floor(Math.random() * FONTS.length)]); setArticleFont(FONTS[Math.floor(Math.random() * FONTS.length)]); setNounFont(FONTS[Math.floor(Math.random() * FONTS.length)]);
    if (plural) setNoun(nObj.p); else { setNoun(nObj.s); setArticle(['a','e','i','o','u'].includes(nObj.s[0].toLowerCase()) ? 'an' : 'a'); }
  }, []);

  const generateAboutPrompt = useCallback(() => {
    setAboutPromptIndex(prev => (prev + 1) % ABOUT_FONTS.length);
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (isHolding) {
      if (view === "home" || view === "archive_about") {
        interval = window.setInterval(() => {
          setProgress((prev: number) => { 
            if (prev >= 100) { 
              if (view === "home") generateRandomPrompt();
              else generateAboutPrompt();
              setIsHolding(false); 
              return 0; 
            } 
            return prev + 2; 
          });
        }, 20);
      }
    } else if (!isHolding) setProgress(0);
    return () => clearInterval(interval);
  }, [isHolding, generateRandomPrompt, generateAboutPrompt, view]);

  return (
    <div className={`app-container ${view} ${isHolding ? 'is-holding' : ''}`} onMouseDown={(e) => { setMousePos({ x: e.clientX, y: e.clientY }); if(view==="home" || view==="archive_about") setIsHolding(true); initAudio(); }} onMouseUp={() => setIsHolding(false)} onMouseLeave={() => setIsHolding(false)} onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })} onTouchStart={(e) => { setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY }); if(view==="home" || view==="archive_about") setIsHolding(true); initAudio(); }} onTouchEnd={() => setIsHolding(false)} onTouchMove={(e) => setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })}>
      <CustomCursor mousePos={mousePos} isHolding={isHolding} />
      <audio ref={audioRef} src={currentTrack ? `/bgm/${currentTrack}` : undefined} loop />
      <InteractiveBackground isHolding={isHolding} progress={progress} mousePos={mousePos} />
      <div className="vignette"></div>
      <div className="top-nav">
        {view === "home" && (
          <div className="mini-audio-controls">
            <button className="track-btn" onClick={(e) => { e.stopPropagation(); const idx = currentTrack ? BGM_FILES.indexOf(currentTrack) : 0; handleTrackChange(BGM_FILES[(idx - 1 + BGM_FILES.length) % BGM_FILES.length]); }}>‹</button>
            <Visualizer analyzer={analyzerRef.current} isPlaying={isPlaying} />
            <button className="track-btn" onClick={(e) => { e.stopPropagation(); const idx = currentTrack ? BGM_FILES.indexOf(currentTrack) : -1; handleTrackChange(BGM_FILES[(idx + 1) % BGM_FILES.length]); }}>›</button>
          </div>
        )}
        <button className="music-toggle-btn" onClick={(e) => { e.stopPropagation(); setIsMusicPanelOpen(!isMusicPanelOpen); }}>MUSIC</button>
      </div>
      <div className={`music-panel ${isMusicPanelOpen ? 'open' : ''}`}>
        <div className="music-panel-content">
          <header><h3>BGM SELECT</h3><button className="close-panel-btn" onClick={() => setIsMusicPanelOpen(false)}>×</button></header>
          <div className="volume-control"><span>VOLUME</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} /></div>
          <ul className="track-list">
            <li className={currentTrack === null ? 'active' : ''} onClick={() => handleTrackChange(null)}>MUTE / OFF</li>
            {BGM_FILES.map(file => (<li key={file} className={currentTrack === file ? 'active' : ''} onClick={() => handleTrackChange(file)}>{file.replace('.mp3', '').replace(/-/g, ' ')}</li>))}
          </ul>
        </div>
      </div>
      <main className="main-content">
        {view === "home" && (
          <div className="prompt-wrapper">
            <h1 className={`prompt-display ${isHolding ? 'holding' : ''} ${isPlural ? 'plural' : 'singular'}`}>
              <InteractiveLine text={verb} font={verbFont} mousePos={mousePos} isHolding={isHolding} progress={progress} />
              {!isPlural && <InteractiveLine text={article} font={articleFont} mousePos={mousePos} isHolding={isHolding} progress={progress} />}
              <InteractiveLine text={noun} font={nounFont} mousePos={mousePos} isHolding={isHolding} progress={progress} />
            </h1>
          </div>
        )}
      </main>

      {/* Archive and Sub-views */}
      {view === "archive" && (
        <ArchiveFloatingView onBack={() => setView('home')} />
      )}
      {view === "archive_random" && (
        <ArchiveFloatingView onBack={() => setView('archive')} />
      )}
      {view === "archive_about" && (
        <div className="sub-archive-view about-view" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'black', zIndex: 998 }}>
          <button className="back-btn" style={{ position: 'absolute', top: '40px', left: '40px' }} onClick={() => setView('archive')}>BACK TO ARCHIVE</button>
          <div className="prompt-wrapper" style={{ marginTop: '50vh', transform: 'translateY(-50%)' }}>
            <h1 className={`prompt-display ${isHolding ? 'holding' : ''}`}>
              <InteractiveLine text="explain randomness" font={ABOUT_FONTS[aboutPromptIndex]} mousePos={mousePos} isHolding={isHolding} progress={progress} />
            </h1>
          </div>
        </div>
      )}
      {view === "archive_nature" && (
        <div className="sub-archive-view" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'black', zIndex: 998 }}>
          <button className="back-btn" style={{ position: 'absolute', top: '40px', left: '40px' }} onClick={() => setView('archive')}>BACK TO ARCHIVE</button>
          <h2 className="placeholder-title">NATURE</h2>
        </div>
      )}
      <div className="ui-overlay">
        {(view === "home" || view === "archive_about") && (
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        <div className="footer-info">
          <nav className="nav-links">
            <button className={`nav-btn ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>HOME</button>
            <span className="nav-separator">/</span>
            <button className={`nav-btn ${view.startsWith('archive') ? 'active' : ''}`} onClick={() => setView('archive')}>ARCHIVE</button>
          </nav>
          <div className="footer-right">
            <span>RANDOM PROMPT GENERATOR</span>
            {(view === "home" || view === "archive_about") && (
              <div className="hold-hint-group"><span>HOLD TO GENERATE</span></div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-elements"><div className={`scanline ${isHolding ? 'active' : ''}`}></div></div>
    </div>
  );
}

export default App;
