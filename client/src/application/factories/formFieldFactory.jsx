import { TextField } from '../../ui/components/fields/TextField';
import { TextAreaField } from '../../ui/components/fields/TextAreaField';
import { SelectField } from '../../ui/components/fields/SelectField';
import { DateField } from '../../ui/components/fields/DateField';
import { NumberField } from '../../ui/components/fields/NumberField';

const map = {
  text: TextField,
  email: TextField,
  textarea: TextAreaField,
  select: SelectField,
  date: DateField,
  number: NumberField
};

export function createFieldComponent(type = 'text') {
  return map[type] || TextField;
}
