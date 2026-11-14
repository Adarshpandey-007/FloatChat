"use client";
import { useState, useRef, useEffect } from 'react';
import { JurisdictionSelector } from '../../components/legal/JurisdictionSelector';
import { marked } from 'marked';

type Message = { role: 'user' | 'assistant', content: string };

export default function LegalExpertPage() {
  const [jurisdiction, setJurisdiction] = useState('All');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const handleSend = async () => {
    if (!input.trim() || pending) return;
    const userText = input.trim();
    
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setPending(true);
    setToolsUsed([]);

    try {
      // Format history for Gemini
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/legal/query', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          text: userText, 
          history,
          jurisdictionContext: jurisdiction
        }) 
      });
      
      const data = await res.json();
      
      if (data.toolsUsed) {
        setToolsUsed(data.toolsUsed);
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with legal expert.' }]);
    } finally {
      setPending(false);
    }
  };

  const renderContent = (content: string) => {
    const html = marked.parse(content, { breaks: true, gfm: true });
    return (
      <div 
        className="prose prose-sm prose-invert max-w-none
          prose-p:my-2 prose-p:leading-relaxed
          prose-ul:my-2 prose-li:my-1
          prose-headings:text-emerald-300 prose-headings:font-semibold
          prose-strong:text-white
          prose-a:text-emerald-400 prose-a:underline hover:prose-a:text-emerald-300"
        dangerouslySetInnerHTML={{ __html: html as string }} 
      />
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-floatchat-bg">
      {/* Header Area */}
      <div className="px-6 py-6 border-b border-white/[0.08] bg-floatchat-primary/50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">
            Legal Expert Mode
          </h1>
          <p className="text-slate-400 mb-6">
            Ask questions about environmental compliance, zoning laws, and international maritime treaties. The AI will cross-reference its answers with spatial protected areas and legal text databases.
          </p>
          <JurisdictionSelector selected={jurisdiction} onChange={setJurisdiction} />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚖️</div>
              <p className="text-slate-400">Ask a legal question to begin.<br/>Try: &quot;Can I build a port at 18.9N 72.8E?&quot;</p>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                m.role === 'user' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-50' 
                  : 'bg-white/[0.03] border border-white/[0.08] text-slate-300'
              }`}>
                {m.role === 'user' ? (
                  <span>{m.content}</span>
                ) : (
                  renderContent(m.content)
                )}
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-white/[0.03] border border-white/[0.08]">
                {toolsUsed.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {toolsUsed.map(t => (
                      <span key={t} className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-md border border-emerald-500/30">
                        Executing: {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
                  <span>⚖️ Consulting legal databases...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-white/[0.08] bg-floatchat-primary/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about environmental laws, CRZ, or compliance..."
            disabled={pending}
            className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/30 transition-all disabled:opacity-50"
          />
          <button 
            onClick={handleSend} 
            disabled={pending}
            className="bg-emerald-500 text-slate-900 px-6 py-3 rounded-xl font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ask Counsel
          </button>
        </div>
      </div>
    </div>
  );
}
