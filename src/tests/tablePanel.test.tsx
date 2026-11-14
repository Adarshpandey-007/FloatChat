import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TablePanel } from '../components/visualizations/TablePanel';

describe('Component & Accessibility Test: TablePanel', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          profiles: [
            {
              id: 'prof-001',
              cycle: 1,
              timestamp: '2025-05-10T12:00:00Z',
              lat: 12.34,
              lon: 76.54,
              stats: { meanTemp: 22.45, meanSalinity: 34.82 }
            },
            {
              id: 'prof-002',
              cycle: 2,
              timestamp: '2025-05-20T12:00:00Z',
              lat: 12.55,
              lon: 76.88,
              stats: { meanTemp: 21.90, meanSalinity: 34.95 }
            }
          ]
        })
      })
    ) as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading skeleton while fetching data and transitions to content', async () => {
    render(<TablePanel />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /profile summaries table/i })).toBeInTheDocument();
    });
  });

  it('renders accessible table region and column headers with scope="col"', async () => {
    render(<TablePanel />);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /profile summaries table/i })).toBeInTheDocument();
    });

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(7);
    headers.forEach(h => {
      expect(h).toHaveAttribute('scope', 'col');
    });

    expect(screen.getByText('prof-001')).toBeInTheDocument();
    expect(screen.getByText('prof-002')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });
});

