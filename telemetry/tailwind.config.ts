module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'loading-bar': 'loading 2s infinite ease-in-out',
            },
            keyframes: {
                loading: {
                    '0%': { transform: 'translateX(-100%)' },
                    '50%': { transform: 'translateX(50%)' },
                    '100%': { transform: 'translateX(300%)' },
                },
            },
            colors: {
                nexus: {
                    black: '#050505',
                    green: '#00ff00',
                    orange: '#ff9900',
                }
            }
        },
    },
    plugins: [],
}