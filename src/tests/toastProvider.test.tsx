import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../components/ui/ToastProvider';

function TestComponent() {
  const { push, dismiss, clear } = useToast();
  return (
    <div>
      <button onClick={() => push({ title: 'Test Alert', message: 'Sensor profile loaded', type: 'success' })}>
        Trigger Toast
      </button>
      <button onClick={clear}>Clear All</button>
    </div>
  );
}

describe('Component & Accessibility Test: ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders notifications container with accessible role and live region', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('displays toast with role="status" and dismisses it on close button click', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const triggerBtn = screen.getByText('Trigger Toast');
    act(() => {
      triggerBtn.click();
    });

    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
    expect(screen.getByText('Sensor profile loaded')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss notification');
    act(() => {
      dismissBtn.click();
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('auto-dismisses toast after default duration', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Trigger Toast').click();
    });

    expect(screen.getByRole('status')).toBeInTheDocument();

    // Advance time past default 4000ms
    act(() => {
      jest.advanceTimersByTime(4500);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

