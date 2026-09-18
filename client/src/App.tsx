import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, Check, ChevronRight, CircleHelp, Clock3, Eye, FlaskConical, Lightbulb, Move3d, RotateCcw, Sparkles, Target, Trophy, X } from "lucide-react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";

const MODEL_URL = "/assets/eye-anatomy.glb";

type GameId = "dashboard" | "path" | "rods" | "hotspots";
const pathAnswer = ["Cornea", "Pupil", "Lens", "Retina", "Optic nerve", "Visual cortex"];
const pathItems = ["Retina", "Lens", "Visual cortex", "Cornea", "Optic nerve", "Pupil"];
const sorterItems = [
  { text: "Night vision", answer: "Rods", note: "Most sensitive in dim light" },
  { text: "Color perception", answer: "Cones", note: "Three spectral types" },
  { text: "Rhodopsin", answer: "Rods", note: "Light-sensitive pigment" },
  { text: "High visual acuity", answer: "Cones", note: "Concentrated in the fovea" },
  { text: "Peripheral vision", answer: "Rods", note: "Abundant outside the fovea" },
  { text: "Photopic vision", answer: "Cones", note: "Bright-light vision" },
];
const hotspotQuestions = [
  { prompt: "The transparent front surface that begins focusing incoming light.", answer: "Cornea", hint: "Think of the eye's outer window." },
  { prompt: "The colored ring that adjusts the size of the opening for light.", answer: "Iris", hint: "It surrounds the pupil." },
  { prompt: "The light-sensitive tissue lining the back of the eye.", answer: "Retina", hint: "Rods and cones live here." },
  { prompt: "The bundle that carries retinal signals toward the brain.", answer: "Optic nerve", hint: "It exits at the optic disc." },
];
const eyeParts = ["Cornea", "Sclera", "Iris", "Pupil", "Lens", "Ciliary body", "Retina", "Fovea", "Optic disc", "Optic nerve", "Vitreous body", "Visual cortex"];

function EyeViewer({ onPick }: { onPick?: (label: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("loading model");
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.025, 0.045, 0.075, 1);
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.2, 4.4, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 2.2; camera.upperRadiusLimit = 8;
    camera.wheelPrecision = 70; camera.panningSensibility = 0;
    const light = new HemisphericLight("labLight", new Vector3(0.3, 1, 0), scene);
    light.intensity = 1.35;
    SceneLoader.ImportMeshAsync("", MODEL_URL.substring(0, MODEL_URL.lastIndexOf("/") + 1), MODEL_URL.split("/").pop()!, scene)
      .then((result) => { result.meshes.forEach((mesh) => { mesh.scaling.scaleInPlace(1.25); }); setStatus("interactive model ready"); })
      .catch(() => setStatus("3D model unavailable — use the games below"));
    const pickObserver = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERPICK || !pointerInfo.pickInfo?.hit || !onPick) return;
      const raw = `${pointerInfo.pickInfo.pickedMesh?.name ?? ""} ${pointerInfo.pickInfo.pickedMesh?.material?.name ?? ""}`.toLowerCase();
      const label = raw.includes("retina") ? "Retina" : raw.includes("sclera") ? "Sclera" : raw.includes("cornea") ? "Cornea" : raw.includes("lens") ? "Lens" : raw.includes("iris") ? "Iris" : raw.includes("pupil") ? "Pupil" : raw.includes("nerve") ? "Optic nerve" : "Eye structure";
      onPick(label);
    });
    engine.runRenderLoop(() => scene.render());
    const resize = () => engine.resize(); window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); if (pickObserver) scene.onPointerObservable.remove(pickObserver); engine.dispose(); };
  }, []);
  return <div className="model-wrap"><canvas ref={canvasRef} aria-label="Interactive 3D cross-section of the human eye" /><div className="model-status"><Move3d size={14} /> {status}</div><div className="model-tip">drag to rotate · scroll to zoom</div></div>;
}

function MiniSpecimen() {
  return <div className="mini-specimen"><div className="mini-specimen-copy"><span className="eyebrow"><Move3d size={13} /> 3D model active</span><strong>Explore the eye while you play</strong><small>drag · zoom · inspect</small></div><div className="mini-specimen-orb"><Eye size={24} /></div></div>;
}

function ScorePill({ score }: { score: number }) { return <div className="score-pill"><Trophy size={16} /><span>{score}</span><small>XP</small></div>; }

function GameShell({ title, eyebrow, icon, onBack, onModelPick, children }: { title: string; eyebrow: string; icon: React.ReactNode; onBack: () => void; onModelPick?: (label: string) => void; children: React.ReactNode }) {
  return <div className="game-shell"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Dashboard</button><div className="game-heading"><div className="game-icon">{icon}</div><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div></div><div className="game-model-inline"><EyeViewer onPick={onModelPick} /></div><p className="model-instruction"><Target size={14} /> Click a structure in the model to use it as your answer.</p><div className="game-visual-strip"><img src="/assets/eye-anatomy-card.jpg" alt="Eye cross-section illustration" /><img src="/assets/retina-detail.jpg" alt="Rod and cone illustration" /></div>{children}</div>;
}

function PathGame({ onBack, onScore }: { onBack: () => void; onScore: (n: number) => void }) {
  const [items, setItems] = useState(pathItems); const [done, setDone] = useState(false);
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; setItems(next); setDone(false); };
  const check = () => { const ok = items.every((v, i) => v === pathAnswer[i]); setDone(ok); if (ok) onScore(100); };
  return <GameShell title="Light Path Challenge" eyebrow="01 · sequence lab" icon={<Lightbulb size={22} />} onBack={onBack}><div className="instruction-card"><div><span className="eyebrow">Mission brief</span><p>Reconstruct the route of a photon from the outside world to the visual cortex.</p></div><div className="mini-badge"><Target size={16} /> 6 steps</div></div><div className="sequence-list">{items.map((item, i) => <div className="sequence-row" key={item}><div className="step-no">0{i + 1}</div><div className="sequence-name">{item}</div><div className="move-controls"><button onClick={() => move(i, -1)} aria-label="Move up"><ArrowLeft size={15} className="up-arrow" /></button><button onClick={() => move(i, 1)} aria-label="Move down"><ArrowRight size={15} className="down-arrow" /></button></div></div>)}</div><button className="primary-button" onClick={check}><Check size={17} /> Verify sequence <ChevronRight size={17} /></button>{done && <div className="success-banner"><Sparkles size={19} /><div><strong>Perfect transmission.</strong><span>Photon route decoded · +100 XP</span></div></div>}</GameShell>;
}

function SorterGame({ onBack, onScore }: { onBack: () => void; onScore: (n: number) => void }) {
  const [index, setIndex] = useState(0); const [results, setResults] = useState<(boolean | null)[]>(Array(sorterItems.length).fill(null));
  const current = sorterItems[index]; const choose = (bucket: string) => { const next = [...results]; next[index] = bucket === current.answer; setResults(next); setTimeout(() => { if (index < sorterItems.length - 1) setIndex(index + 1); }, 250); if (bucket === current.answer) onScore(25); };
  const reset = () => { setIndex(0); setResults(Array(sorterItems.length).fill(null)); };
  return <GameShell title="Rods vs. Cones" eyebrow="02 · classification lab" icon={<Eye size={22} />} onBack={onBack}><div className="sorter-top"><div><span className="eyebrow">Specimen {String(index + 1).padStart(2, "0")} / {sorterItems.length}</span><h2>Which photoreceptor owns this feature?</h2></div><div className="progress-dots">{results.map((r, i) => <span className={i === index ? "active" : r === true ? "correct" : r === false ? "wrong" : ""} key={i} />)}</div></div><div className="feature-card"><div className="feature-orb"><Eye size={32} /></div><h3>{current.text}</h3><p>{current.note}</p></div><div className="bucket-grid"><button className="bucket rods" onClick={() => choose("Rods")}><span className="bucket-label">RODS</span><strong>Scotopic</strong><small>dim-light specialists</small></button><button className="bucket cones" onClick={() => choose("Cones")}><span className="bucket-label">CONES</span><strong>Photopic</strong><small>color + acuity specialists</small></button></div>{index === sorterItems.length - 1 && results.every((r) => r !== null) && <button className="secondary-button" onClick={reset}><RotateCcw size={16} /> Run sorter again</button>}</GameShell>;
}

function HotspotGame({ onBack, onScore }: { onBack: () => void; onScore: (n: number) => void }) {
  const [index, setIndex] = useState(0); const [answer, setAnswer] = useState(""); const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null); const [time, setTime] = useState(30); const [showHint, setShowHint] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setTime((t) => t > 0 ? t - 1 : 0), 1000); return () => window.clearInterval(timer); }, [index]);
  const q = hotspotQuestions[index]; const submit = () => { const ok = answer.trim().toLowerCase() === q.answer.toLowerCase(); setFeedback(ok ? "correct" : "wrong"); if (ok) onScore(75); };
  const next = () => { setIndex((i) => (i + 1) % hotspotQuestions.length); setAnswer(""); setFeedback(null); setTime(30); setShowHint(false); };
  return <GameShell title="Anatomy Hotspots" eyebrow="03 · rapid recall" icon={<Brain size={22} />} onBack={onBack} onModelPick={setAnswer}><div className="hotspot-layout"><div className="diagram-card"><div className="diagram-eye"><div className="iris"><div className="pupil" /></div><span className="diagram-line line-one" /><span className="diagram-line line-two" /></div><div className="diagram-caption"><span className="eyebrow">Cross-section mode</span><strong>Identify the structure</strong></div></div><div className="quiz-panel"><div className="timer"><Clock3 size={17} /> 00:{String(time).padStart(2, "0")}</div><span className="eyebrow">Question {index + 1} of {hotspotQuestions.length}</span><h2>{q.prompt}</h2><label className="answer-label">Your answer<input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Click the model or type a structure…" /></label><div className="quiz-actions"><button className="primary-button" onClick={submit}>Lock answer <ChevronRight size={17} /></button><button className="hint-button" onClick={() => setShowHint((v) => !v)}><CircleHelp size={16} /> {showHint ? "Hide hint" : "Hint"}</button></div>{showHint && <div className="hint-list"><strong>Eye parts</strong><div>{eyeParts.map((part) => <span key={part}>{part}</span>)}</div></div>}{feedback && <div className={feedback === "correct" ? "feedback good" : "feedback bad"}>{feedback === "correct" ? <Check size={17} /> : <X size={17} />} {feedback === "correct" ? "Correct — excellent recall." : `Not quite. Hint: ${q.hint}`}</div>}{feedback === "correct" && <button className="next-button" onClick={next}>Next structure <ArrowRight size={16} /></button>}</div></div></GameShell>;
}

function Dashboard({ score, setGame }: { score: number; setGame: (g: GameId) => void }) {
  const cards = useMemo(() => [{ id: "path" as GameId, no: "01", icon: <Lightbulb />, title: "Light Path", subtitle: "Order the journey of a photon", accent: "violet", stat: "6 nodes" }, { id: "rods" as GameId, no: "02", icon: <Eye />, title: "Rods vs. Cones", subtitle: "Sort the photoreceptor features", accent: "teal", stat: "6 cards" }, { id: "hotspots" as GameId, no: "03", icon: <Brain />, title: "Anatomy Hotspots", subtitle: "Name the structure under pressure", accent: "amber", stat: "30 sec" }], []);
  return <main className="dashboard"><header className="topbar"><div className="brand"><div className="brand-mark"><Eye size={19} /></div><div><strong>EyeBio <em>Arcade</em></strong><span>human vision · interactive lab</span></div></div><div className="topbar-actions"><span className="lab-status"><i /> Lab online</span><ScorePill score={score} /></div></header><section className="hero-grid"><div className="hero-copy"><div className="eyebrow"><FlaskConical size={15} /> VISUAL SYSTEMS / LEVEL 01</div><h1>See the science<br /><span>behind sight.</span></h1><p>Three short missions to master the biology of the human eye. Explore the model, then put your knowledge to work.</p><div className="hero-meta"><span><Sparkles size={15} /> no grades, just gains</span><span><CircleHelp size={15} /> built for health-track students</span></div></div><div className="viewer-card"><div className="viewer-header"><span><span className="live-dot" /> 3D SPECIMEN VIEWER</span><span>cross-section / human eye</span></div><EyeViewer /></div></section><section className="missions"><div className="section-head"><div><span className="eyebrow">Choose your mission</span><h2>Three ways to level up</h2></div><span className="mission-count">03 <small>MISSIONS</small></span></div><div className="mission-grid">{cards.map((card) => <button className={`mission-card ${card.accent}`} key={card.id} onClick={() => setGame(card.id)}><div className="card-top"><span className="card-number">{card.no}</span><span className="card-icon">{card.icon}</span></div><div className="card-body"><h3>{card.title}</h3><p>{card.subtitle}</p></div><div className="card-foot"><span>{card.stat}</span><span className="launch">Launch <ArrowRight size={15} /></span></div></button>)}</div></section><footer><span>EyeBio Arcade <b>·</b> a micro-lab for visual biology</span><span>drag the model to explore <Move3d size={13} /></span></footer></main>;
}

export default function App() {
  const [game, setGame] = useState<GameId>("dashboard"); const [score, setScore] = useState(0);
  const addScore = (n: number) => setScore((s) => s + n);
  if (game === "path") return <PathGame onBack={() => setGame("dashboard")} onScore={addScore} />;
  if (game === "rods") return <SorterGame onBack={() => setGame("dashboard")} onScore={addScore} />;
  if (game === "hotspots") return <HotspotGame onBack={() => setGame("dashboard")} onScore={addScore} />;
  return <Dashboard score={score} setGame={setGame} />;
}
