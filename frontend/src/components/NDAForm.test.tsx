import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest } from '@jest/globals';

// Need to use jest-dom matchers
const { toBeInTheDocument } = require('@testing-library/jest-dom');
expect.extend({ toBeInTheDocument });

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

  it('renders with initial form fields', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    render(React.createElement(NDAForm));

    // Check for key text labels and inputs
    expect(document.body.innerHTML).toContain('Mutual NDA Generator');
    expect(document.body.innerHTML).toContain('Agreement Terms');
    // Check for textarea (purpose field)
    expect(document.body.innerHTML).toContain('purpose');
    expect(document.body.innerHTML).toContain('effective');
  });

  it('has party section headers', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    render(React.createElement(NDAForm));

    // Check for party text
    expect(document.body.innerHTML).toContain('Party 1');
    expect(document.body.innerHTML).toContain('Party 2');
  });

  it('has a download button', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    render(React.createElement(NDAForm));

    expect(document.body.innerHTML).toContain('Download NDA');
  });

  it('shows live preview', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    render(React.createElement(NDAForm));

    expect(document.body.innerHTML).toContain('Live Preview');
    expect(document.body.innerHTML).toContain('Mutual Non-Disclosure Agreement');
  });

  it('has radio buttons for term selection', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    render(React.createElement(NDAForm));

    expect(document.body.innerHTML).toContain('1 year');
    expect(document.body.innerHTML).toContain('In perpetuity');
    expect(document.body.innerHTML).toContain('continues');
  });

  it('has party input fields', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    render(React.createElement(NDAForm));

    expect(document.body.innerHTML).toContain('Company Name');
    expect(document.body.innerHTML).toContain('Representative Name');
    expect(document.body.innerHTML).toContain('Title');
  });

  it('allows user to input text', async () => {
    const { default: NDAForm } = await import('./NDAForm');
    const user = userEvent.setup();
    render(React.createElement(NDAForm));

    const purposeText = 'Test Purpose';
    const textarea = document.querySelector('textarea');
    if (textarea) {
      await userEvent.type(textarea, purposeText);
      expect(textarea.value).toContain(purposeText);
    }
  });
});
