import type { LanguageCode, LanguageOption } from '@/types/polyvoice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LanguageSelectProps {
  id: string;
  label: string;
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
  options: LanguageOption[];
  disabled?: boolean;
}

export function LanguageSelect({ id, label, value, onChange, options, disabled }: LanguageSelectProps) {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as LanguageCode)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
