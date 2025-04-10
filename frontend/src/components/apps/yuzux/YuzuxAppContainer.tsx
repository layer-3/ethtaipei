import { useSnapshot } from 'valtio';
import AppStore from '@/store/AppStore';
import { YuzuxApp } from '@/mini-apps';

export function YuzuxAppContainer() {
  const appSnap = useSnapshot(AppStore.state);
  
  return (
    <div
      className={`fixed inset-0 bg-black z-40 transform transition-all duration-300 ${
        appSnap.openApp === 'yuzux'
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-95 pointer-events-none'
      }`}
    >
      {appSnap.openApp === 'yuzux' && <YuzuxApp />}
    </div>
  );
}