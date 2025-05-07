"use client";

import { useEffect, useCallback } from "react";
import { BackspaceIcon } from "@heroicons/react/24/solid";

export interface NumpadProps {
    /** Current value displayed in the numpad */
    value: string;
    /** Function to call when value changes */
    onChange: (value: string | ((prevValue: string) => string)) => void;
    /** Maximum number of digits (including decimal point) */
    maxLength?: number;
    /** Whether to show the decimal point button */
    showDecimal?: boolean;
    /** Number of decimal places allowed */
    decimalPlaces?: number;
    /** Whether to allow leading zeros */
    allowLeadingZeros?: boolean;
    /** Whether the numpad is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Numpad component for numeric input
 * Displays a grid of number buttons (1-9, 0) with decimal point and backspace
 * Allows users to input numbers without using the device keyboard
 */
export const Numpad: React.FC<NumpadProps> = ({
    value,
    onChange,
    maxLength = 10,
    showDecimal = true,
    decimalPlaces = 2,
    allowLeadingZeros = false,
    disabled = false,
    className = "",
}) => {
    // Handle number button press
    const handleNumberPress = useCallback(
        (num: number | string) => {
            if (disabled) return;

            onChange((prevValue: string) => {
                let newValue = prevValue;

                // If number is pressed
                if (typeof num === "number") {
                    // Check if we're at max length
                    if (prevValue.length >= maxLength) return prevValue;

                    // Handle special cases for zero
                    if (num === 0) {
                        // Don't allow multiple leading zeros (e.g., "00")
                        if (prevValue === "0" && !allowLeadingZeros) return prevValue;
                        // If value is just "0", replace it unless we allow leading zeros
                        if (prevValue === "0" && !allowLeadingZeros) return num.toString();
                    } else {
                        // For non-zero numbers, if value is just "0", replace it
                        if (prevValue === "0") return num.toString();
                    }

                    // Add the number to the end
                    newValue = prevValue + num.toString();
                }
                // If decimal point is pressed
                else if (num === "." && showDecimal) {
                    // Don't add if we already have a decimal point
                    if (prevValue.includes(".")) return prevValue;
                    // If empty, add "0." instead of just "."
                    if (prevValue === "") return "0.";
                    newValue = prevValue + ".";
                }

                // Check decimal place limit
                if (showDecimal && newValue.includes(".")) {
                    const parts = newValue.split(".");

                    if (parts[1] && parts[1].length > decimalPlaces) {
                        return prevValue;
                    }
                }

                return newValue;
            });
        },
        [value, onChange, maxLength, showDecimal, decimalPlaces, allowLeadingZeros, disabled]
    );

    // Handle backspace button press
    const handleBackspace = useCallback(() => {
        if (disabled) return;

        onChange((prevValue: string) => {
            if (prevValue.length <= 1) return "";
            return prevValue.slice(0, -1);
        });
    }, [onChange, disabled]);

    // Handle keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disabled) return;

            // Numbers 0-9
            if (e.key >= "0" && e.key <= "9") {
                handleNumberPress(parseInt(e.key, 10));
            }
            // Decimal point
            else if ((e.key === "." || e.key === ",") && showDecimal) {
                handleNumberPress(".");
            }
            // Backspace
            else if (e.key === "Backspace") {
                handleBackspace();
            }
            // Prevent default for these keys to avoid both numpad and keyboard input
            if ((e.key >= "0" && e.key <= "9") || e.key === "." || e.key === "," || e.key === "Backspace") {
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNumberPress, handleBackspace, showDecimal, disabled]);

    // Common button styles
    const buttonBaseClass = `
    flex items-center justify-center
    font-medium text-lg 
    p-4 rounded-md
    transition-colors duration-150
    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-neutral-control-color-30 active:bg-neutral-control-color-40"}
  `;

    // Generate number buttons 1-9
    const renderNumberButtons = () => {
        const buttons = [];

        for (let i = 1; i <= 9; i++) {
            buttons.push(
                <button
                    key={i}
                    type="button"
                    onClick={() => handleNumberPress(i)}
                    disabled={disabled}
                    className={`${buttonBaseClass} bg-neutral-control-color-10 text-text-color-90`}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    return (
        <div className={`grid grid-cols-3 gap-2 ${className}`} role="group" aria-label="Numpad">
            {/* Numbers 1-9 */}
            {renderNumberButtons()}

            {/* Bottom row: decimal, 0, backspace */}
            {showDecimal ? (
                <button
                    type="button"
                    onClick={() => handleNumberPress(".")}
                    disabled={disabled}
                    className={`${buttonBaseClass} bg-neutral-control-color-10 text-text-color-90`}
                >
                    .
                </button>
            ) : (
                <div /> // Empty cell if decimal not shown
            )}

            <button
                type="button"
                onClick={() => handleNumberPress(0)}
                disabled={disabled}
                className={`${buttonBaseClass} bg-neutral-control-color-10 text-text-color-90`}
            >
                0
            </button>

            <button
                type="button"
                onClick={handleBackspace}
                disabled={disabled}
                className={`${buttonBaseClass} bg-neutral-control-color-10 text-text-color-90`}
                aria-label="Backspace"
            >
                <BackspaceIcon className="h-6 w-6" />
            </button>
        </div>
    );
};
