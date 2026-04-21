import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest } from '@jest/globals';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('NDAForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial form fields', () => {
    // Dynamic import outside test scope
    const { default: NDAForm } = require('./NDAForm');
    render(<NDAForm />);

    expect(screen.getByLabelText(/purpose/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/governing law/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/jurisdiction/i)).toBeInTheDocument();
  });

  it('has party section headers', () => {
    const { default: NDAForm } = require('./NDAForm');
    render(<NDAForm />);

    // Check for section headers
    expect(screen.getByText(/party/i)).toBeInTheDocument();
  });

  it('has a download button', () => {
    const { default: NDAForm } = require('./NDAForm');
    render(<NDAForm />);

    expect(screen.getByText(/download/i)).toBeInTheDocument();
  });

  it('shows live preview', () => {
    const { default: NDAForm } = require('./NDAForm');
    render(<NDAForm />);

    // Check for preview content
    expect(screen.getByText(/mutual non-disclosure agreement/i)).toBeInTheDocument();
  });

  it('has radio buttons for term selection', () => {
    const { default: NDAForm } = require('./NDAForm');
    render(<NDAForm />);

    // Check for term radio buttons exist
    expect(document.body.innerHTML).toContain('1 year');
    expect(document.body.innerHTML).toContain('In perpetuity');
  });

  it('has party input fields', () => {
    const { default: NDAForm } = require('./NDAForm');
    render(<NDAForm />);

    expect(document.body.innerHTML).toContain('Company Name');
    expect(document.body.innerHTML).toContain('Representative Name');
    expect(document.body.innerHTML).toContain('Title');
  });

  it('allows user to input text', async () => {
    const { default: NDAForm } = require('./NDAForm');
    const user = userEvent.setup();
    render(<NDAForm />);

    const purposeInput = screen.getByLabelText(/purpose/i) as HTMLTextAreaElement;
    await user.type(purposeInput, 'Test Purpose');
    expect(purposeInput.value).toBe('Test Purpose');
  });
});
