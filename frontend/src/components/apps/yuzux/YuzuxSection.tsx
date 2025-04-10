import Image from 'next/image';

interface YuzuxSectionProps {
    onOpenYuzux: () => void;
}

export function YuzuxSection({ onOpenYuzux }: YuzuxSectionProps) {
    return (
        <section className="flex flex-col justify-center items-center gap-6 mt-20">
            <Image src="/logo_yuzux.png" alt="Yuzux" width={128} height={122} className="w-24 h-24" priority />

            <div className="text-left bg-gray-100 p-4 rounded-sm w-full max-w-md">
                <h1 className="text-2xl font-bold mb-2">Yuzux</h1>
                <p className="text-gray-600 mb-6">
                    Pay Anyone, Anywhere. Instantly fast with no merchant fees. Secured by state channels.
                </p>
            </div>

            <button
                onClick={onOpenYuzux}
                className="w-full max-w-md bg-primary text-black py-2 rounded-md hover:bg-primary-hover transition-all font-normal transform hover:scale-105 duration-200"
                aria-label="Open Yuzux App"
            >
                Open App
            </button>
        </section>
    );
}
