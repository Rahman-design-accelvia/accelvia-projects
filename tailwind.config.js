/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        status: {
          draft: {
            bg: '#f3f4f6',
            text: '#4b5563',
            border: '#d1d5db',
          },
          pending: {
            bg: '#fef3c7',
            text: '#b45309',
            border: '#fcd34d',
          },
          revision: {
            bg: '#ffedd5',
            text: '#c2410c',
            border: '#fdba74',
          },
          approved: {
            bg: '#dcfce7',
            text: '#15803d',
            border: '#86efac',
          },
          rejected: {
            bg: '#fee2e2',
            text: '#b91c1c',
            border: '#fca5a5',
          },
          superseded: {
            bg: '#e5e7eb',
            text: '#6b7280',
            border: '#9ca3af',
          },
          in_progress: {
            bg: '#e0f2fe',
            text: '#0369a1',
            border: '#7dd3fc',
          },
          delivered: {
            bg: '#fef08a',
            text: '#854d0e',
            border: '#facc15',
          },
          completed: {
            bg: '#d1fae5',
            text: '#065f46',
            border: '#34d399',
          }
        }
      }
    },
  },
  plugins: [],
};
