import { useRef, useState, useEffect } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { FAQ } from '../../data/governance.js';

// Frontend-only help assistant. It answers from the local FAQ list with simple keyword matching.
// It is a visual stand-in for the chatbot shown in the Figma designs and makes no network requests.
function answer(q) {
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  let best = null; let score = 0;
  FAQ.forEach((f) => {
    const hay = (f.q + ' ' + f.a).toLowerCase();
    const s = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
    if (s > score) { score = s; best = f; }
  });
  return best && score > 0 ? best.a : 'I can help with questions about funding, verification, agreements, crop failure and payments. For account-specific help, please use Help & Support or raise a complaint so a reviewer can follow up.';
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([{ from: 'bot', text: 'Hello. I am the CollabFarm help assistant. Ask me how funding, verification or repayments work.' }]);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }); }, [msgs, open]);
  const send = (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: 'me', text: q }, { from: 'bot', text: answer(q) }]);
    setText('');
  };
  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Help assistant">
          <div className="row between" style={{ padding: '14px 16px', background: 'var(--primary-500)', color: '#fff' }}>
            <strong>CollabFarm Assistant</strong>
            <button className="kebab" style={{ color: '#fff' }} onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18} /></button>
          </div>
          <div className="stack-sm" style={{ padding: 16, overflowY: 'auto', flex: 1, minHeight: 200 }}>
            {msgs.map((m, i) => <div key={i} className={`chat-msg chat-msg--${m.from}`}>{m.text}</div>)}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="row" style={{ padding: 12, borderTop: '1px solid var(--grey-200)' }}>
            <input className="input" style={{ height: 44 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question" aria-label="Type your question" />
            <button className="btn btn--primary btn--icon" aria-label="Send"><Send size={18} /></button>
          </form>
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Open help assistant" aria-expanded={open}>
        <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6eb489, #1e3928)', display: 'grid', placeItems: 'center', color: '#fff' }}><Bot size={28} /></span>
      </button>
    </>
  );
}
