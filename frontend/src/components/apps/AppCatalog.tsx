import { AppCard } from '@/components/ui/AppCard';

export function AppCatalog() {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <AppCard image="/snake-game.png" title="Snake Game" category="Arcade/Action" />
            <AppCard image="/ping-pong.png" title="Ping-Pong" category="Arcade/Action" />
        </section>
    );
}
