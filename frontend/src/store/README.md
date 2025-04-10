# Store Architecture

This directory contains all the global state management for the application using Valtio.

## Structure

- **AppStore**: Manages UI state like open/minimized apps and modals
- **WalletStore**: Manages wallet connections, addresses, and state channels
- **ConfigStore**: Manages application configuration
- **MessageStore**: Manages messages for the messaging system
- **NitroliteStore**: Manages Nitrolite client state
- **SettingsStore**: Manages user settings
- **AssetsStore**: Manages asset/token data

## Usage

Each store follows a consistent pattern:

1. Define types for the state
2. Create a proxy state object with initial values
3. Define actions as methods on the store object

Example:

```typescript
import { proxy } from 'valtio';

// 1. Define state interface
interface MyState {
  value: string;
  isLoading: boolean;
}

// 2. Create proxy state
const state = proxy<MyState>({
  value: '',
  isLoading: false,
});

// 3. Define store with actions
const MyStore = {
  state,
  
  setValue(newValue: string) {
    state.value = newValue;
  },
  
  startLoading() {
    state.isLoading = true;
  },
  
  stopLoading() {
    state.isLoading = false;
  }
};

export default MyStore;
```

## Best Practices

- Use immutable patterns with Valtio's proxy
- Separate concerns into different stores based on domain
- Keep actions atomic and focused
- Use the `useSnapshot` hook from Valtio in components to subscribe to state changes
- Import stores directly where needed, there's no Provider needed with Valtio

## Using in Components

```typescript
import { useSnapshot } from 'valtio';
import MyStore from '@/store/MyStore';

function MyComponent() {
  // Subscribe to state changes
  const snap = useSnapshot(MyStore.state);
  
  const handleClick = () => {
    // Call actions directly
    MyStore.setValue('new value');
  };
  
  return <div>{snap.value}</div>;
}
```