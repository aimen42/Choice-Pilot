import { useEffect, useMemo, useState } from "react";
import { Sparkles, Plus, Trash2, ArrowRight, CheckCircle2, AlertTriangle, Bot, ShieldCheck, Zap, Vote, Globe2 } from "lucide-react";

const starterOptions = [
  { id: "A", text: "Option one" },
  { id: "B", text: "Option two" },
  { id: "C", text: "Option three" },
  { id: "D", text: "Option four" }
];

export default function App() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(starterOptions);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState({ mode: "checking", providers: [] });
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setHealth)
      .catch(() => setHealth({ mode: "offline", providers: [] }));
  }, []);

  const winnerLabel = useMemo(() => result?.winner
    ? `${result.winner.id}. ${result.winner.text}` : "No clear winner", [result]);

  function updateOption(id, text) {
    setOptions(old => old.map(o => o.id === id ? { ...o, text } : o));
    setResult(null);
    setApproved(false);
  }

  function addOption() {
    if (options.length >= 20) return;
    const id = String.fromCharCode(65 + options.length);
    setOptions(old => [...old, { id, text: "" }]);
  }

  function removeOption(id) {
    if (options.length <= 2) return;
    setOptions(old => old.filter(o => o.id !== id).map((o, i) => ({ ...o, id: String.fromCharCode(65 + i) })));
    setResult(null);
    setApproved(false);
  }

  async function chooseAnswer(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setApproved(false);
    setLoading(true);
    try {
      const response = await fetch("/api/choose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not get an answer.");
      setResult(data);
    } catch (err) {
      setError(err.message || "The server could not be reached. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  const providerNames = health.providers?.length ? health.providers.join(" · ") : "Demo mode";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Sparkles size={20}/></span><span>choice<span className="brand-accent">pilot</span></span></a>
        <div className="top-status"><span className={`status-dot ${health.mode === "live" ? "live" : ""}`}></span>{health.mode === "live" ? "AI providers connected" : health.mode === "offline" ? "Backend offline" : "Checking backend"}</div>
      </header>

      <main className="main-layout">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-icon"><Zap size={14}/></span> MULTI-MODEL DECISION ASSISTANT</div>
          <h1>Better choices.<br/><span>Collective intelligence.</span></h1>
          <p className="hero-copy">Compare answers from multiple AI models, see where they agree, and make a more informed choice.</p>
          <div className="feature-row">
            <span><Vote size={16}/> Model consensus</span>
            <span><ShieldCheck size={16}/> Review before action</span>
            <span><Globe2 size={16}/> Extension-ready API</span>
          </div>
        </section>

        <div className="workspace">
          <section className="panel question-panel">
            <div className="panel-heading">
              <div><div className="step-label">STEP 01</div><h2>Ask your question</h2></div>
              <span className="icon-bubble"><Bot size={20}/></span>
            </div>
            <form onSubmit={chooseAnswer}>
              <label className="field-label" htmlFor="question">Question</label>
              <textarea id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. Which data structure follows LIFO?" required maxLength={5000} rows={3}/>
              <div className="options-heading"><label className="field-label">Answer options</label><span>{options.length}/20</span></div>
              <div className="options-list">
                {options.map((option, i) => <div className="option-input" key={option.id}>
                  <span className="option-letter">{option.id}</span>
                  <input aria-label={`Option ${option.id}`} value={option.text} onChange={e => updateOption(option.id, e.target.value)} placeholder={`Enter option ${i + 1}`} maxLength={1000} required/>
                  <button className="icon-button" type="button" onClick={() => removeOption(option.id)} disabled={options.length <= 2} aria-label={`Remove option ${option.id}`}><Trash2 size={16}/></button>
                </div>)}
              </div>
              <button type="button" className="add-option" onClick={addOption} disabled={options.length >= 20}><Plus size={16}/> Add another option</button>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? <><span className="spinner"></span> Comparing models...</> : <><Sparkles size={18}/> Find consensus <ArrowRight size={17}/></>}
              </button>
              {error && <div className="error-message"><AlertTriangle size={17}/>{error}</div>}
            </form>
            <div className="privacy-note"><ShieldCheck size={15}/> API keys stay on your server. Avoid entering sensitive personal information.</div>
          </section>

          <section className="panel results-panel">
            <div className="panel-heading">
              <div><div className="step-label">STEP 02</div><h2>Consensus result</h2></div>
              <span className="result-count">{result ? `${result.totalModels} responses` : "Awaiting question"}</span>
            </div>
            {!result && !loading && <div className="empty-state">
              <div className="empty-illustration"><Sparkles size={30}/></div>
              <h3>Your answer will appear here</h3>
              <p>Enter a question and at least two options. The models will evaluate the choices independently.</p>
              <div className="mini-stats"><div><strong>01</strong><span>Ask</span></div><div><strong>02</strong><span>Compare</span></div><div><strong>03</strong><span>Review</span></div></div>
            </div>}
            {loading && <div className="loading-state"><span className="spinner large"></span><h3>Gathering perspectives</h3><p>Waiting for available AI providers...</p></div>}
            {result && <div className="result-content">
              {result.demo && <div className="demo-warning"><AlertTriangle size={16}/> Demo mode — these are placeholder votes, not real AI answers. Configure provider keys in <code>.env</code>.</div>}
              {result.needsReview && <div className="review-warning"><AlertTriangle size={17}/> {result.tied ? "The top options are tied." : "There is not enough agreement for an automatic recommendation."} Review the individual responses.</div>}
              <div className="winner-card">
                <div className="winner-top"><span className="winner-kicker"><CheckCircle2 size={15}/> {result.needsReview ? "LEADING OPTION" : "CONSENSUS PICK"}</span><span className="vote-pill">{result.voteShare}% vote share</span></div>
                <h3>{winnerLabel}</h3>
                <p>{result.winner ? result.votes.find(v => v.optionId === result.winner.id)?.reason || "Selected by model vote." : "The models did not return a valid option."}</p>
                <div className="vote-bar"><span style={{ width: `${result.voteShare}%` }}></span></div>
                <div className="vote-caption"><span>{result.validVotes} valid votes</span><span>{result.totalModels} total responses</span></div>
              </div>
              <div className="subheading">MODEL RESPONSES <span>{providerNames}</span></div>
              <div className="vote-list">
                {result.votes.map((vote, i) => {
                  const picked = options.find(o => o.id === vote.optionId);
                  return <div className="vote-row" key={`${vote.provider}-${i}`}>
                    <div className="model-avatar"><Bot size={17}/></div>
                    <div className="vote-details"><strong>{vote.provider}</strong><span>{vote.error ? vote.reason : picked ? `${picked.id}. ${picked.text}` : vote.reason}</span></div>
                    <span className={`vote-status ${vote.error ? "failed" : vote.optionId ? "success" : ""}`}>{vote.error ? "Error" : vote.optionId ? "Voted" : "Skipped"}</span>
                  </div>;
                })}
              </div>
              {result.winner && <button className={`approve-button ${approved ? "approved" : ""}`} onClick={() => setApproved(true)} disabled={approved || result.needsReview}>
                <CheckCircle2 size={17}/>{approved ? "Choice approved" : result.needsReview ? "Review needed before approval" : "Approve recommendation"}
              </button>}
              <p className="disclaimer">Agreement is not proof of correctness. Check the explanation before using the result.</p>
            </div>}
          </section>
        </div>
        <footer><span>CHOICEPILOT © 2026</span><span>Built for clearer decisions, not blind automation.</span></footer>
      </main>
    </div>
  );
}