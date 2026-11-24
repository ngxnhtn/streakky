import { HABIT_NAME_MAX_LENGTH, todayISO } from "@streakky/core";
import { Field } from "@streakky/ui/components/field";
import { Input } from "@streakky/ui/components/input";

/** A habit's name, with its error under it. `onChange` gets the text as typed. */
export function NameField({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: string;
  onChange: (name: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <Field label="Name" error={error}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          value={value}
          maxLength={HABIT_NAME_MAX_LENGTH}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

/**
 * A quit habit's quit day: a date up to today, with a hint and its error under it. `onChange`
 * gets the input's raw value, "" while a date is half typed or cleared.
 */
export function QuitDayField({
  value,
  onChange,
  error,
  hint,
  autoFocus,
}: {
  value: string;
  onChange: (day: string) => void;
  error?: string;
  hint?: string;
  /** for coming back to the field, say from a question about the day chosen */
  autoFocus?: boolean;
}) {
  return (
    <Field label="Quit day" hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type="date"
          value={value}
          max={todayISO()}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}
