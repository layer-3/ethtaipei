import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'YuzuX',
        short_name: 'YuzuX',
        theme_color: '#000',
        background_color: '#000',
        display: 'fullscreen',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
            {
                src: 'icons/icon-48x48.png',
                sizes: '48x48',
                type: 'image/png',
            },
            {
                src: 'icons/icon-72x72.png',
                sizes: '72x72',
                type: 'image/png',
            },
            {
                src: 'icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
            },
            {
                src: 'icons/icon-128x128.png',
                sizes: '128x128',
                type: 'image/png',
            },
            {
                src: 'icons/icon-144x144.png',
                sizes: '144x144',
                type: 'image/png',
            },
            {
                src: 'icons/icon-152x152.png',
                sizes: '152x152',
                type: 'image/png',
            },
            {
                src: 'icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: 'icons/icon-256x256.png',
                sizes: '256x256',
                type: 'image/png',
            },
            {
                src: 'icons/icon-384x384.png',
                sizes: '384x384',
                type: 'image/png',
            },
            {
                src: 'icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
