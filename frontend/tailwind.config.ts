const colors = require('tailwindcss/colors');

const systemColors = {
    'system-green-10': 'var(--system-green-10)',
    'system-green-20': 'var(--system-green-20)',
    'system-green-40': 'var(--system-green-40)',
    'system-green-60': 'var(--system-green-60)',
    'system-green-80': 'var(--system-green-80)',
    'system-green-90': 'var(--system-green-90)',
    'system-blue-10': 'var(--system-blue-10)',
    'system-blue-20': 'var(--system-blue-20)',
    'system-blue-40': 'var(--system-blue-40)',
    'system-blue-60': 'var(--system-blue-60)',
    'system-blue-80': 'var(--system-blue-80)',
    'system-blue-90': 'var(--system-blue-90)',
    'system-yellow-10': 'var(--system-yellow-10)',
    'system-yellow-20': 'var(--system-yellow-20)',
    'system-yellow-40': 'var(--system-yellow-40)',
    'system-yellow-60': 'var(--system-yellow-60)',
    'system-yellow-80': 'var(--system-yellow-80)',
    'system-yellow-90': 'var(--system-yellow-90)',
    'system-red-10': 'var(--system-red-10)',
    'system-red-20': 'var(--system-red-20)',
    'system-red-40': 'var(--system-red-40)',
    'system-red-60': 'var(--system-red-60)',
    'system-red-80': 'var(--system-red-80)',
    'system-red-90': 'var(--system-red-90)',
    primary: '#fcd000',
    'primary-hover': '#e6be00',
};

module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                ...systemColors,
            },
            textColor: {
                ...systemColors,
            },
            borderColor: {
                ...systemColors,
            },
            keyframes: {
                'fade-scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                'scan-line': {
                    '0%': { top: '0%' },
                    '50%': { top: '97%' },
                    '100%': { top: '0%' },
                },
                'fadeIn': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slideUp': {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'pulse-border': {
                    '0%, 100%': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '50%': { borderColor: 'rgba(255, 255, 255, 0.8)' },
                },
            },
            animation: {
                'fade-scale-in': 'fade-scale-in 0.3s ease-out forwards',
                'scan-line': 'scan-line 2s ease-in-out infinite',
                'fadeIn': 'fadeIn 0.3s ease-in-out forwards',
                'slideUp': 'slideUp 0.4s ease-out forwards',
                'pulse-border': 'pulse-border 1.5s ease-in-out infinite',
            },
        },
    },
};
