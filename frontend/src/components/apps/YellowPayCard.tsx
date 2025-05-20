import { YellowPayIcon } from '@/assets/images/YellowPayIcon';
import Image from 'next/image';

interface IYellowPayCard {
    onOpenYuzux: () => void;
}

export const YellowPayCard: React.FC<IYellowPayCard> = ({ onOpenYuzux }: IYellowPayCard) => {
    const MobileYellowPay = () => (
        <section id="yellow-pay-mobile" className="md:hidden flex flex-col justify-center items-center relative pt-4">
            <Image
                src="/clearnet_icons/yellowpay_mobile-banner.png"
                className="w-full min-h-[230px] rounded-lg border-2 border-divider-color-20"
                alt="YellowPay Banner"
                width={345}
                height={230}
                priority
            />

            <div
                className="absolute top-[18%] left-1/2 transform -translate-x-1/2 rounded-3xl bg-gradient-to-b from-transparent to-divider-color-20 p-[2px]"
                onClick={onOpenYuzux}>
                <div className="w-[120px] h-[120px] rounded-3xl bg-main-background-color p-5 flex items-center justify-center">
                    <YellowPayIcon />
                </div>
            </div>

            <div className="absolute bottom-0 translate-y-[55%] left-1/2 -translate-x-1/2 transform w-full flex items-center justify-center z-[10]">
                <div className="w-full relative h-full min-h-[98px]">
                    <div className="flex flex-col items-start justify-center py-4 px-8 rounded-lg w-full h-full z-10 relative">
                        <h3 className="text-xl font-gilmer-bold text-text-color-100 mb-1">YellowPay</h3>
                        <p className="text-sm text-text-color-70 font-metro-regular">
                            Fast, secure payments via state channels technology
                        </p>
                    </div>
                    <div
                        className="h-full min-h-[98px] w-[calc(100%-24px)] absolute -top-1 left-0 right-0 mx-auto"
                        style={{
                            transform: 'perspective(2000px) rotateX(-20deg)',
                        }}>
                        <div
                            className="w-full h-full border-2 border-white rounded-lg backdrop-blur-[40px] shadow-md"
                            style={{
                                background:
                                    'linear-gradient(to top, rgba(255, 255, 255, 1) 16%, rgba(255, 255, 255, 0.4982) 201.37%)',
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );

    return (
        <>
            <MobileYellowPay />
            <section id="yellow-pay-desktop" className="hidden md:block w-full">
                <div
                    id="yellow-pay-desktop"
                    className="relative w-full h-[320px] lg:h-[360px] overflow-hidden rounded-[4px] group">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/70 to-transparent z-10" />

                    <div className="relative w-full h-full">
                        <div className="absolute inset-0 opacity-100">
                            <Image
                                src="/clearnet_icons/desktop_yuzux_banner.png"
                                alt="Fast Payments with YellowPay"
                                fill
                                style={{ objectFit: 'cover', objectPosition: 'center' }}
                                priority
                                className="transition-transform duration-700"
                            />
                        </div>
                    </div>

                    <div className="absolute inset-0 flex flex-col justify-center px-12 lg:px-16 z-10 opacity-100">
                        <div className="max-w-md">
                            <div className="flex items-center gap-x-3 mb-3">
                                <h1 className="text-3xl lg:text-4xl font-gilmer-bold text-text-color-0">YellowPay</h1>
                            </div>

                            <p className="text-lg font-metro-regular text-text-color-10 mb-4 md:mb-5">
                                Fast, secure payments via state channels technology
                            </p>

                            <button
                                onClick={onOpenYuzux}
                                className="w-auto bg-primary-cta-color-60 text-primary-cta-layer-color-90 py-2 px-6 rounded-sm hover:bg-primary-cta-color-80 hover:transition-all font-metro-medium hover:transform hover:scale-105 text-base"
                                aria-label="Open App">
                                Open YellowPay
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};
