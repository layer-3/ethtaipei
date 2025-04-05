import { useSnapshot } from 'valtio';
import AppStore, { AppName } from '@/store/AppStore';
import Image from 'next/image';

export function MinimizedApps() {
  const appSnapshot = useSnapshot(AppStore.state);
  const minimizedApps = Array.from(appSnapshot.minimizedApps);

  if (minimizedApps.length === 0) {
    return null;
  }

  const getAppIcon = (appName: AppName) => {
    switch (appName) {
      case 'yuzux':
        return '/yuzux.svg';
      case 'snake':
        return '/snake-game.png';
      case 'ping-pong':
        return '/ping-pong.png';
      default:
        return '/window.svg';
    }
  };

  const getAppLabel = (appName: AppName) => {
    switch (appName) {
      case 'yuzux':
        return 'Yuzux';
      case 'snake':
        return 'Snake Game';
      case 'ping-pong':
        return 'Ping Pong';
      default:
        return 'App';
    }
  };

  const handleMaximize = (appName: AppName) => {
    AppStore.maximizeApp(appName);
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800 bg-opacity-80 p-2 rounded-lg shadow-lg z-40">
      {minimizedApps.map((appName) => (
        <button
          key={appName}
          onClick={() => handleMaximize(appName)}
          className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          <Image
            src={getAppIcon(appName)}
            alt={getAppLabel(appName)}
            width={20}
            height={20}
            className="w-5 h-5"
          />
          <span className="text-white text-sm">{getAppLabel(appName)}</span>
        </button>
      ))}
    </div>
  );
}