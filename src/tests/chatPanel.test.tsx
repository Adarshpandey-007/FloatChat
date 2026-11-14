import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPanel } from '../components/ChatPanel';
import { useChatStore } from '../store/chatStore';

describe('Component & Interaction Test: ChatPanel', () => {
  const mockSwitchTab = jest.fn();

  beforeEach(() => {
    mockSwitchTab.mockClear();
    useChatStore.setState({
      messages: [],
      activeTab: 'none',
      focusedFloatId: null
    });
    // Mock global.fetch
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          message: 'Hello! I found 3 ARGO floats in the Indian Ocean.',
          intent: 'map',
          toolsUsed: ['search_ocean_area'],
          visualizationCommands: []
        })
      })
    ) as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders empty state greeting and accessible input', () => {
    render(<ChatPanel onSwitchTab={mockSwitchTab} />);
    expect(screen.getByText('Ask me about ARGO ocean data')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask about ocean data...')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /ask about ocean data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('populates input when a quick hint is clicked', () => {
    render(<ChatPanel onSwitchTab={mockSwitchTab} />);
    const hintButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Send');
    expect(hintButtons.length).toBeGreaterThan(0);

    const firstHint = hintButtons[0];
    const hintText = firstHint.textContent || '';
    fireEvent.click(firstHint);

    const input = screen.getByRole('textbox', { name: /ask about ocean data/i }) as HTMLInputElement;
    expect(input.value).toBe(hintText);
  });

  it('submits on Enter keypress when not composing IME characters', async () => {
    render(<ChatPanel onSwitchTab={mockSwitchTab} />);
    const input = screen.getByRole('textbox', { name: /ask about ocean data/i });

    fireEvent.change(input, { target: { value: 'Show floats in Arabian Sea' } });

    fireEvent.keyDown(input, {
      key: 'Enter',
      keyCode: 13,
      nativeEvent: { isComposing: false }
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/query', expect.anything());
    });
  });

  it('does NOT submit on Enter keypress when IME composition is active', async () => {
    render(<ChatPanel onSwitchTab={mockSwitchTab} />);
    const input = screen.getByRole('textbox', { name: /ask about ocean data/i });

    fireEvent.change(input, { target: { value: 'nihon' } });

    // Simulate IME composition enter keydown (isComposing: true)
    fireEvent.keyDown(input, {
      key: 'Enter',
      keyCode: 229,
      nativeEvent: { isComposing: true }
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sanitizes untrusted HTML in assistant messages', () => {
    useChatStore.setState({
      messages: [
        {
          id: 'xss-msg',
          role: 'assistant',
          content: 'Here is data: <script>window.alert("pwned")</script><img src="x" onerror="alert(1)">**Bold Ocean**'
        }
      ]
    });

    render(<ChatPanel onSwitchTab={mockSwitchTab} />);
    expect(screen.getByText('Bold Ocean')).toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
    // Verify onerror attribute was stripped by DOMPurify
    const img = document.querySelector('img');
    if (img) {
      expect(img).not.toHaveAttribute('onerror');
    }
  });
});

