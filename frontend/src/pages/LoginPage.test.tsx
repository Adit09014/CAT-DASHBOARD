import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../services/auth';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('renders demo credentials', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/admin@catguardian.demo/i)).toBeInTheDocument();
    expect(screen.getByText(/operator@catguardian.demo/i)).toBeInTheDocument();
  });
});
