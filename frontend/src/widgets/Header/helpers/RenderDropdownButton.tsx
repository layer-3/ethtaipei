import React from 'react';
import { TDropdownOption } from './RenderAccountWithDropdown';

interface IRenderDropdownButton {
    dropdownOption: TDropdownOption;
}

export const RenderDropDownButton: React.FC<IRenderDropdownButton> = ({ dropdownOption }: IRenderDropdownButton) => {
    return (
        <button
            key={dropdownOption.label}
            className="group min-w-fit w-full whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-neutral-control-color-30 active:bg-neutral-control-color-10 text-xs sm:text-sm font-medium text-neutral-control-layer-color-70 hover:text-neutral-control-layer-color-100 flex items-center gap-4"
            onClick={dropdownOption.onClickHandler}>
            {dropdownOption.icon}
            {dropdownOption.label}
        </button>
    );
};
