import APP_CONFIG from '@/config/app';
import { AppLogic, Channel, State } from '@erc7824/nitrolite';
import { Address, encodeAbiParameters, Hex, decodeAbiParameters } from 'viem';

/**
 * AdjudicatorA: A simple state channel application that implements a counter
 *
 * This application demonstrates the basic concepts of implementing a custom
 * state channel application using the Nitrolite SDK. The counter can be
 * incremented, decremented, or reset, and demonstrates custom validation logic.
 */
export class AdjudicatorApp implements AppLogic<bigint> {
    /**
     * Encode application state to bytes for on-chain use
     * @param data The application state to encode
     * @returns Hex-encoded data
     */
    public encode(data: bigint): Hex {
        return encodeAbiParameters(
            [
                {
                    type: 'uint256',
                },
            ],
            [data],
        );
    }

    /**
     * Decode bytes back to application state
     * @param encoded The encoded state
     * @returns Decoded application state
     */
    public decode(encoded: Hex): bigint {
        const [type] = decodeAbiParameters(
            [
                {
                    type: 'uint256',
                },
            ],
            encoded,
        );

        return type;
    }

    /**
     * Validate a state transition
     * @param _channel The channel context
     * @param prevState Previous application state
     * @param nextState New application state
     * @returns Whether the transition is valid
     */
    public validateTransition(_channel: Channel, prevState: bigint, nextState: bigint): boolean {
        return nextState > prevState;
    }

    /**
     * Provide proof states for dispute resolution
     * @param _channel The channel context
     * @param _state Current state
     * @param _previousStates Previous states
     * @returns Array of proof states
     */
    public provideProofs(_channel: Channel, _state: bigint, _previousStates: State[]): State[] {
        // No additional proofs needed for this simple application
        return [];
    }

    /**
     * Determine if a state is final
     * @param state The application state to check
     * @returns Whether the state is final
     */
    public isFinal(state: bigint): boolean {
        // The application is considered final when counter is 0
        return state === BigInt(APP_CONFIG.CHANNEL.MAGIC_NUMBER_CLOSE);
    }

    /**
     * Get the address of the adjudicator contract
     * @returns Adjudicator contract address
     */
    public getAdjudicatorAddress(): Address {
        // TODO:
        return APP_CONFIG.ADJUDICATORS.flag as Address;
    }

    /**
     * Get the type of adjudicator
     * @returns Adjudicator type string
     */
    public getAdjudicatorType(): string {
        return 'micropayments';
    }
}
