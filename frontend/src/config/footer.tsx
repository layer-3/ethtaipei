import { Icons } from '@/helpers/icons';

const FOOTER_SOCIALS = [
    {
        name: 'Twitter',
        href: 'https://x.com/YellowCom_News',
        icon: () => <Icons name="twitter" />,
        target: '_blank',
    },
    {
        name: 'Telegram',
        href: 'https://t.me/YellowCom_news',
        icon: () => <Icons name="telegram" />,
        target: '_blank',
    },
    {
        name: 'Youtube',
        href: 'https://www.youtube.com/channel/UC2u2FXKKyIFsNBr_MlpCMfA/',
        icon: () => <Icons name="youtube" />,
        target: '_blank',
    },
    {
        name: 'Linkedin',
        href: 'https://www.linkedin.com/company/yellow-com/',
        icon: () => <Icons name="linkedin" />,
        target: '_blank',
    },
    {
        name: 'Discord',
        href: ' https://discord.com/invite/yellownetwork',
        icon: () => <Icons name="discord" />,
        target: '_blank',
    },
];

const FOOTER_NAVIGATION = [
    {
        name: 'Yellow.com',
        fallback: 'Yellow.com',
        submenu: [
            {
                name: 'About',
                fallback: 'About Us',
                href: 'https://yellow.com/about_us',
                target: '_blank',
            },
            {
                name: 'Contact Us',
                fallback: 'Contact Us',
                href: 'https://yellow.com/contact_us',
                target: '_blank',
            },
            {
                name: 'Editorial team',
                fallback: 'Editorial Team',
                href: 'https://yellow.com/authors',
                target: '_self',
            },
        ],
    },
    {
        name: 'LEGAL',
        fallback: 'Legal',
        submenu: [
            {
                name: 'Terms of service',
                fallback: 'Terms of Service',
                href: 'https://yellow.com/terms_of_service',
                target: '_blank',
            },
            {
                name: 'Privacy Policy',
                fallback: 'Privacy Policy',
                href: 'https://yellow.com/privacy_policy',
                target: '_blank',
            },
            {
                name: 'Cookie Policy',
                fallback: 'Cookie Policy',
                href: 'https://yellow.com/cookie_policy',
                target: '_blank',
            },
        ],
    },
    {
        name: 'footer_navigation_company',
        fallback: 'Company',
        submenu: [
            {
                name: 'Yellow Network',
                fallback: 'Yellow Network',
                href: 'https://www.yellow.org/',
                target: '_blank',
            },
            {
                name: 'Yellow Capital',
                fallback: 'Yellow Capital',
                href: 'https://www.yellowcapital.com/',
                target: '_blank',
            },
            {
                name: 'Openware',
                fallback: 'Openware',
                href: 'https://www.openware.com/',
                target: '_blank',
            },
            {
                name: 'Yellow Coworking',
                fallback: 'Yellow Coworking',
                href: 'https://www.yellowincubator.com/coworking',
                target: '_blank',
            },
            {
                name: 'Foundation',
                fallback: 'Foundation',
                href: 'https://www.yellowincubator.com/foundation',
                target: '_blank',
            },
        ],
    },
    {
        name: 'Yellow Network',
        fallback: 'Exchange',
        submenu: [
            {
                name: 'How It Works',
                fallback: 'How it Works',
                href: 'https://docs.yellow.org/about/the-solution',
                target: '_blank',
            },
            {
                name: 'List your Token',
                fallback: 'Tokens',
                href: 'https://yellow.com/join_yellow_network',
                target: '_blank',
            },
            {
                name: 'About YELLOW token',
                fallback: 'Yellow Token',
                href: 'https://yellow.com/discover_yellow_token',
                target: '_blank',
            },
        ],
    },
];

export const FOOTER_OPTIONS = {
    navigations: FOOTER_NAVIGATION,
    socials: FOOTER_SOCIALS,
    upIcon: () => <Icons name="upIcon" />,
    downIcon: () => <Icons name="downIcon" />,
    socialIconNumDisplay: 8,
};
