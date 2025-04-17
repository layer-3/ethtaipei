import { AppCard } from '@/components/ui/AppCard';

export function AppCatalog() {
    return (
        <>
            <h3 className="font-medium text-xl md:text-2xl md:font-bold text-gray-900 mb-4 md:mb-6">
                Financial Services
            </h3>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-8">
                <AppCard
                    image="/images/apps/p2p-trading.svg"
                    title="P2P Trading"
                    category="Finance/Exchange"
                    description="Direct peer-to-peer token swaps with no intermediaries"
                />
                <AppCard
                    image="/images/apps/defi-dashboard.svg"
                    title="DeFi Dashboard"
                    category="Finance/Analytics"
                    description="Track your DeFi investments and protocol interactions from one place"
                />
                <AppCard
                    image="/images/apps/liquidity-pool.svg"
                    title="Liquidity Pool"
                    category="Finance/Investment"
                    description="Provide liquidity to token pairs and earn trading fees"
                />
            </section>

            <h3 className="mt-8 md:mt-8 lg:mt-8 mb-4 md:mb-6 font-medium text-xl md:text-2xl md:font-bold text-gray-900">
                Blockchain Utilities
            </h3>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-8">
                <AppCard
                    image="/images/apps/cross-chain-bridge.svg"
                    title="Cross-Chain Bridge"
                    category="Utility/Infrastructure"
                    description="Transfer assets securely between different blockchain networks"
                />
                <AppCard
                    image="/images/apps/smart-contract-wizard.svg"
                    title="Smart Contract Wizard"
                    category="Development/Tools"
                    description="Create and deploy secure smart contracts with no coding required"
                />
                <AppCard
                    image="/images/apps/payment-portal.svg"
                    title="Payment Portal"
                    category="Finance/Business"
                    description="Secure payment solutions for institutions and enterprises"
                />
            </section>

            <h3 className="mt-8 md:mt-8 lg:mt-8 mb-4 md:mb-6 font-medium text-xl md:text-2xl md:font-bold text-gray-900">
                Entertainment
            </h3>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
                <AppCard
                    image="/images/apps/ping-pong.svg"
                    title="Ping-Pong"
                    category="Game/Arcade"
                    description="Classic arcade with crypto stakes"
                    compact
                />
                <AppCard
                    image="/images/apps/snake-game.svg"
                    title="Snake Game"
                    category="Game/Arcade"
                    description="Collect tokens and compete"
                    compact
                />
                <AppCard
                    image="/images/apps/nft-gallery.svg"
                    title="NFT Gallery"
                    category="Art/Collection"
                    description="Showcase digital collectibles"
                    compact
                />
                <AppCard
                    image="/images/apps/blockchain-battles.svg"
                    title="Blockchain Battles"
                    category="Game/Strategy"
                    description="Strategic blockchain combat"
                    compact
                />
            </section>
        </>
    );
}
