import { useChatStore } from '../store/chatStore';

describe('Unit Test: chatStore (Zustand)', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('initializes with default state', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.activeTab).toBe('none');
    expect(state.focusedFloatId).toBeNull();
    expect(state.targetCenter).toBeNull();
    expect(state.realProfiles.loading).toBe(false);
    expect(state.realProfiles.selectedCycles).toEqual([]);
  });

  it('adds messages with generated UUIDs', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'Find float 5906432' });
    useChatStore.getState().addMessage({ role: 'assistant', content: 'Found float 5906432', intent: 'map' });

    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Find float 5906432');
    expect(messages[0].id).toBeDefined();
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].intent).toBe('map');
  });

  it('updates activeTab', () => {
    useChatStore.getState().setActiveTab('plot');
    expect(useChatStore.getState().activeTab).toBe('plot');

    useChatStore.getState().setActiveTab('table');
    expect(useChatStore.getState().activeTab).toBe('table');
  });

  it('sets focus with optional target lat/lon coordinates', () => {
    useChatStore.getState().setFocus('float-101', 14.5, 72.8);
    let state = useChatStore.getState();
    expect(state.focusedFloatId).toBe('float-101');
    expect(state.targetCenter).toEqual({ lat: 14.5, lon: 72.8 });

    useChatStore.getState().setFocus(null);
    state = useChatStore.getState();
    expect(state.focusedFloatId).toBeNull();
    expect(state.targetCenter).toBeNull();
  });

  it('manages realProfiles loading, data, and error lifecycle', () => {
    useChatStore.getState().setRealProfilesLoading('5906432');
    let state = useChatStore.getState();
    expect(state.realProfiles.loading).toBe(true);
    expect(state.realProfiles.floatId).toBe('5906432');
    expect(state.realProfiles.error).toBeNull();

    const mockProfiles: any[] = [
      { id: 'prof-1', cycle: 10, timestamp: '2025-01-01', lat: 10, lon: 70, measurements: [] },
      { id: 'prof-2', cycle: 11, timestamp: '2025-01-10', lat: 10.2, lon: 70.3, measurements: [] }
    ];

    useChatStore.getState().setRealProfilesData('5906432', mockProfiles);
    state = useChatStore.getState();
    expect(state.realProfiles.loading).toBe(false);
    expect(state.realProfiles.profiles).toEqual(mockProfiles);
    expect(state.realProfiles.selectedCycle).toBe(10); // First cycle selected by default

    // Select different cycle
    useChatStore.getState().selectProfileCycle(11);
    expect(useChatStore.getState().realProfiles.selectedCycle).toBe(11);

    // Set error
    useChatStore.getState().setRealProfilesError('Failed to fetch Argo data');
    state = useChatStore.getState();
    expect(state.realProfiles.loading).toBe(false);
    expect(state.realProfiles.error).toBe('Failed to fetch Argo data');
  });

  it('toggles cycle overlays correctly in multi-cycle comparison', () => {
    useChatStore.getState().toggleCycleOverlay(1);
    expect(useChatStore.getState().realProfiles.selectedCycles).toEqual([1]);

    useChatStore.getState().toggleCycleOverlay(2);
    expect(useChatStore.getState().realProfiles.selectedCycles).toEqual([1, 2]);

    // Toggling existing cycle removes it
    useChatStore.getState().toggleCycleOverlay(1);
    expect(useChatStore.getState().realProfiles.selectedCycles).toEqual([2]);
  });

  describe('executeVisualizationCommand', () => {
    it('handles switch_tab command', () => {
      useChatStore.getState().executeVisualizationCommand({ action: 'switch_tab', tab: 'plot' });
      expect(useChatStore.getState().activeTab).toBe('plot');

      useChatStore.getState().executeVisualizationCommand({ action: 'switch_tab', tab: 'table' });
      expect(useChatStore.getState().activeTab).toBe('table');

      // Invalid tab is ignored
      useChatStore.getState().executeVisualizationCommand({ action: 'switch_tab', tab: 'unknown-tab' });
      expect(useChatStore.getState().activeTab).toBe('table');
    });

    it('handles center_map command', () => {
      useChatStore.getState().executeVisualizationCommand({
        action: 'center_map',
        lat: -12.5,
        lon: 65.2
      });
      const state = useChatStore.getState();
      expect(state.activeTab).toBe('map');
      expect(state.targetCenter).toEqual({ lat: -12.5, lon: 65.2 });
    });

    it('handles load_profile command', () => {
      useChatStore.getState().executeVisualizationCommand({
        action: 'load_profile',
        float_id: '5906999'
      });
      const state = useChatStore.getState();
      expect(state.activeTab).toBe('plot');
      expect(state.focusedFloatId).toBe('5906999');
    });
  });

  it('resets state completely', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'test' });
    useChatStore.getState().setActiveTab('plot');
    useChatStore.getState().setFocus('123', 10, 20);

    useChatStore.getState().reset();
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.activeTab).toBe('none');
    expect(state.focusedFloatId).toBeNull();
    expect(state.targetCenter).toBeNull();
  });
});

