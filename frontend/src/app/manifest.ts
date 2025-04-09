import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'YuzuX',
        short_name: 'YuzuX',
        theme_color: '#FCD000',
        background_color: '#000',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
            {
                src: '/icons/logo_yuzux.png',
                type: 'image/png',
                sizes: '192x192',
            },
            {
                src: '/icons/logo_yuzux.png',
                type: 'image/png',
                sizes: '256x256',
            },
            {
                src: '/icons/logo_yuzux.png',
                type: 'image/png',
                sizes: '512x512',
            },
        ],
    };
}
