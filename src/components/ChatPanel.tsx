"use client";
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { classifyIntent, buildAssistantHint } from '../lib/intentRouter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Tool display names
const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  'get_ocean_profile': { label: 'Fetching Profile', icon: '🌊' },
  'search_ocean_area': { label: 'Spatial Search', icon: '📍' },
  'check_float_health': { label: 'Health Check', icon: '🔋' },
  'search_erddap': { label: 'Bulk Data Query', icon: '📊' },
  'system_health_check': { label: 'System Check', icon: '⚙️' },
};

export function ChatPanel({ onSwitchTab }: { onSwitchTab: (t: 'map' | 'plot' | 'table' | 'none') => void }) {
  const { messages, addMessage, setActiveTab } = useChatStore();
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const handleSend = async () => {
    if (!input.trim() || pending) return;
    const userText = input.trim();
    addMessage({ role: 'user', content: userText });
    setInput('');
    setPending(true);
    setToolsUsed([]);
    try {
      // Format history for Gemini
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/query', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text: userText, history }) 
      });
      const data = await res.json();
      
      // Track tools used for display
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        setToolsUsed(data.toolsUsed);
      }
      
      addMessage({ role: 'assistant', content: data.message, intent: data.intent });
      
      // Execute auto-visualization commands from Gemini
      if (data.visualizationCommands && data.visualizationCommands.length > 0) {
        data.visualizationCommands.forEach((cmd: any) => {
          useChatStore.getState().executeVisualizationCommand(cmd);
        });
      } else {
        // Fallback to basic intent routing if no specific commands
        const t = data.intent === 'unknown' ? 'none' : data.intent;
        setActiveTab(t);
        onSwitchTab(t);
        if (data.intent === 'map' && data.nearest) {
          useChatStore.getState().setFocus(data.nearest.id, data.nearest.lat, data.nearest.lon);
        }
      }
    } catch (e) {
      addMessage({ role: 'assistant', content: 'Error processing request.', intent: 'unknown' });
    }
    setPending(false);
  };

  const lastIntent = [...messages].reverse().find(m => m.intent)?.intent || 'unknown';
  const hints = buildAssistantHint((lastIntent as any) || 'unknown');

  // Render markdown for assistant messages
  const renderContent = (content: string, role: string) => {
    if (role === 'user') {
      return <span>{content}</span>;
    }
    
    // Parse and sanitize markdown for assistant messages
    const rawHtml = marked.parse(content, { breaks: true, gfm: true }) as string;
    const sanitizedHtml = typeof window !== 'undefined'
      ? DOMPurify.sanitize(rawHtml)
      : rawHtml;

    return (
      <div 
        className="prose prose-sm prose-invert max-w-none
          prose-p:my-1 prose-p:leading-relaxed
          prose-ul:my-1 prose-li:my-0.5
          prose-headings:text-cyan-300 prose-headings:font-semibold
          prose-strong:text-white
          prose-code:text-cyan-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded
          prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10
          prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
      />
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="text-2xl">🌊</div>
            <div className="text-sm text-slate-400">Ask me about ARGO ocean data</div>
            <div className="text-xs text-slate-500">I can query the database, find floats, and analyze profiles</div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`rounded-xl px-4 py-2.5 text-sm max-w-[90%] ${
            m.role === 'user' 
              ? 'bg-cyan-400/10 text-cyan-100 ml-auto border border-cyan-400/20' 
              : 'bg-white/[0.04] border border-white/[0.08] text-slate-300'
          }`}>
            {renderContent(m.content, m.role)}
          </div>
        ))}
        {pending && (
          <div className="space-y-2">
            {toolsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {toolsUsed.map(tool => {
                  const info = TOOL_LABELS[tool] || { label: tool, icon: '⚙️' };
                  return (
                    <span key={tool} className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{toolsUsed.length > 0 ? 'Analyzing data...' : 'Thinking...'}</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-white/[0.08] bg-floatchat-primary/60 backdrop-blur-lg">
        <div className="flex gap-2 mb-2 flex-wrap">
          {hints.map(h => (
            <button key={h} onClick={() => setInput(h)} className="text-xs bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white px-2.5 py-1 rounded-full border border-white/[0.08] transition-all">
              {h}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about ocean data..."
            aria-label="Ask about ocean data"
            disabled={pending}
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/30 transition-all disabled:opacity-50"
          />
          <button 
            onClick={handleSend} 
            disabled={pending}
            className="bg-cyan-400 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
