import { AppItem } from './helpers/AppItem';
import { MORE_APPS } from './helpers/constants';

export const MoreApps: React.FC = () => {
    return (
        <>
            <h3 className="text-neutral-control-layer-color-60 font-metro-semibold text-xs md:text-xl lg:text-2xl mb-4 md:mb-6">
                More Apps
            </h3>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {MORE_APPS.map((app, index) => (
                    <AppItem
                        key={app.title + index}
                        title={app.title}
                        description={app.description}
                        logoUrl={app.logoUrl}
                        bannerUrl={app.bannerUrl}
                        appUrl={app.appUrl}
                        comingSoon={app.comingSoon}
                    />
                ))}
            </section>
        </>
    );
};
