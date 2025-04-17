import { AppCard } from '@/components/ui/AppCard';

export function AppCatalog() {
    return (
        <>
            <h3 className="my-4 font-medium text-xl">Recommended</h3>
            <section className="grid grid-cols-2 sm:grid-cols-2 gap-6 gap-y-2">
                <AppCard image="/clearnet_icons/ping-pong.png" title="Ping-Pong" category="Arcade/Action" />
                <AppCard image="/clearnet_icons/snake_game.png" title="Snake Game" category="Arcade/Action" />
                <AppCard image="/clearnet_icons/ping-pong.png" title="Ping-Pong" category="Arcade/Action" />
                <AppCard image="/clearnet_icons/snake_game.png" title="Snake Game" category="Arcade/Action" />
                <AppCard image="/clearnet_icons/ping-pong.png" title="Ping-Pong" category="Arcade/Action" />
                <AppCard image="/clearnet_icons/snake_game.png" title="Snake Game" category="Arcade/Action" />
            </section>
        </>
    );
}
