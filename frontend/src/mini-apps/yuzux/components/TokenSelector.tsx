import React, { useState } from 'react';

type Token = {
  id: string;
  name: string;
  symbol: string;
};

const TOKENS: Token[] = [
  { id: '1', name: 'Yuzu Token', symbol: 'YUZU' },
  { id: '2', name: 'Ethereum', symbol: 'ETH' },
  { id: '3', name: 'USD Coin', symbol: 'USDC' },
];

interface TokenSelectorProps {
  onSelect: (token: Token) => void;
  selectedTokenId?: string;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({ 
  onSelect, 
  selectedTokenId = '1'  // Default to YUZU
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedToken = TOKENS.find(t => t.id === selectedTokenId) || TOKENS[0];

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 border border-white rounded-md bg-black text-white"
      >
        <span>{selectedToken.symbol}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute mt-1 w-full rounded-md bg-black border border-white shadow-lg z-10">
          <ul className="max-h-60 overflow-auto py-1">
            {TOKENS.map(token => (
              <li 
                key={token.id} 
                className={`px-4 py-3 cursor-pointer hover:bg-gray-900 ${token.id === selectedToken.id ? 'bg-gray-900' : ''}`}
                onClick={() => handleSelect(token)}
              >
                <div className="flex justify-between">
                  <span className="font-medium text-white">{token.symbol}</span>
                  <span className="text-gray-400">{token.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};