import Image from 'next/image';

interface YuzuxSectionProps {
    onOpenYuzux: () => void;
}

export function YuzuxSection({ onOpenYuzux }: YuzuxSectionProps) {
    return (
        <section className="flex flex-col justify-center items-center">
            <Image
                src="/clearnet_icons/yuzux_banner.png"
                className="mt-4"
                alt="Yuzux"
                width={708}
                height={400}
                priority
            />
            <div className="flex items-center w-full max-w-md gap-x-2 gap-y-0 mt-2 mb-8">
                <Image src="/logo_yuzux.png" alt="Yuzux Logo" width={32} height={32} />
                <div>
                    <h1 className="text-lg font-bold">Yuzux</h1>
                    <p className="text-gray-600 text-sm">Fast payments via state channels</p>
                </div>
            </div>

            <button
                onClick={onOpenYuzux}
                className="w-full max-w-md bg-primary text-black py-2 rounded-md hover:bg-primary-hover transition-all font-normal transform hover:scale-105 duration-200"
                aria-label="Open Yuzux App">
                Open App
            </button>
        </section>
    );
}
