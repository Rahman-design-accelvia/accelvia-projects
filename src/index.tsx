// src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './features/theme/ThemeContext';
import { AuthProvider } from './features/auth/AuthContext';
import { NotificationProvider } from './features/notifications/NotificationContext';
import { WorkspaceLayout } from './features/workspace/WorkspaceLayout';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container missing in index.html');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <WorkspaceLayout />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

