import { Dropdown as OfficeDropdown, IDropdownOption, IDropdownProps } from 'office-ui-fabric-react/lib/Dropdown';
import React, { useContext } from 'react';
import { useWindowSize } from 'react-use';
import { ThemeContext } from '../../ThemeContext';
import { dropdownStyleOverrides } from './formControl.override.styles';
import ReactiveFormControl from './ReactiveFormControl';

interface CustomDropdownProps {
  id: string;
  upsellMessage?: string;
  infoBubbleMessage?: string;
  label?: string;
  errorMessage?: string;
  dirty?: boolean;
  onChange: (e: unknown, option: IDropdownOption) => void;
  learnMoreLink?: string;
  widthOverride?: string;
  onPanel?: boolean;
}

const DropdownNoFormik = (props: IDropdownProps & CustomDropdownProps) => {
  const { onChange, errorMessage, options, label, widthOverride, onPanel, ...rest } = props;
  const theme = useContext(ThemeContext);
  const { width } = useWindowSize();

  const fullpage = !onPanel && width > 1000;

  return (
    <ReactiveFormControl {...props}>
      <OfficeDropdown
        aria-labelledby={`${props.id}-label`}
        ariaLabel={label}
        options={options}
        onChange={onChange}
        errorMessage={errorMessage}
        {...rest}
        styles={dropdownStyleOverrides(theme, fullpage, widthOverride)}
      />
    </ReactiveFormControl>
  );
};

export default DropdownNoFormik;
