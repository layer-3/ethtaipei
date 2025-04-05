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
        },
    },
};
