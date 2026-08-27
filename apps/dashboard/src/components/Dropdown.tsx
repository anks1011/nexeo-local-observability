import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import '../index.css';

interface DropdownProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  width?: string;
}

export function Dropdown({ options, value, onChange, width = '150px' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ width }}>
      <button
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`custom-dropdown-item ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <Check size={14} className="check-icon" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
