"use client";
import { useState, useRef, useEffect } from 'react';
import { ImpactAssessment, type AssessmentResult } from './ImpactAssessment';
import { marked } from 'marked';

type Message = { 
  role: 'user' | 'assistant', 
  content: string,
  assessment?: AssessmentResult | null,
  filePreview?: string | null
};

export function PlannerChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => setFilePreview(event.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !file) return;
    if (pending) return;

    const userText = input.trim();
    let fileData = null;
    let mimeType = null;
    let currentPreview = filePreview;

    if (file && filePreview) {
      // Split the base64 string to get only the data part
      const parts = filePreview.split(',');
      if (parts.length === 2) {
        mimeType = file.type;
        fileData = parts[1];
      }
    }

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userText || "I've attached a file.",
      filePreview: currentPreview
    }]);

    setInput('');
    setFile(null);
    setFilePreview(null);
    setPending(true);
    setToolsUsed([]);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/planner/assess', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          text: userText || "Please analyze this attached file.", 
          history,
          fileData,
          mimeType
        }) 
      });
      
      const data = await res.json();
      
      if (data.toolsUsed) {
        setToolsUsed(data.toolsUsed);
      }

      // Remove the raw JSON block from the chat text if it exists
      let cleanMessage = data.message.replace(/```json_assessment\n[\s\S]*?\n```/, '').trim();
      if (!cleanMessage) cleanMessage = "Here is the assessment based on your project details:";
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: cleanMessage,
        assessment: data.assessment
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with Nature Advocate.' }]);
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
          prose-headings:text-cyan-300 prose-headings:font-semibold
          prose-strong:text-white"
        dangerouslySetInnerHTML={{ __html: html as string }} 
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🌿</div>
              <p className="text-slate-400">Describe your project, specify a location, or upload a plan to begin.</p>
              <p className="text-sm text-slate-500 mt-2">Example: &quot;I want to build a desalination plant near the Gulf of Kutch&quot;</p>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                m.role === 'user' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-50' 
                  : 'bg-white/[0.03] border border-white/[0.08] text-slate-300'
              }`}>
                {m.filePreview && (
                  <img src={m.filePreview} alt="Upload preview" className="max-w-sm rounded-lg mb-4 border border-white/[0.1]" />
                )}
                
                {m.role === 'user' ? (
                  <span>{m.content}</span>
                ) : (
                  renderContent(m.content)
                )}
              </div>

              {/* Render the Assessment Card Native in Chat */}
              {m.assessment && (
                <div className="mt-4 w-full max-w-4xl">
                  <ImpactAssessment assessment={m.assessment} onReset={() => {}} />
                </div>
              )}
            </div>
          ))}

          {pending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-white/[0.03] border border-white/[0.08]">
                {toolsUsed.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {toolsUsed.map(t => (
                      <span key={t} className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-md border border-cyan-500/30">
                        Using: {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
                  <span>🌊 The Nature Advocate is analyzing your plans...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-white/[0.08] bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {filePreview && (
            <div className="mb-3 relative inline-block">
              <img src={filePreview} alt="Preview" className="h-16 rounded border border-white/[0.1]" />
              <button 
                onClick={() => { setFile(null); setFilePreview(null); }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >✕</button>
            </div>
          )}
          <div className="flex gap-3 items-center">
            <label className="cursor-pointer p-3 bg-white/[0.05] border border-white/[0.1] rounded-xl hover:bg-white/[0.1] transition-colors">
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
              📎
            </label>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Describe your project and location..."
              disabled={pending}
              className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/30 transition-all disabled:opacity-50"
            />
            <button 
              onClick={handleSend} 
              disabled={pending}
              className="bg-cyan-500 text-slate-900 px-6 py-3 rounded-xl font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
