import { TextField } from '../../acdm/components/fields/TextField.jsx';
import { TextAreaField } from '../../acdm/components/fields/TextAreaField.jsx';
import { SelectField } from '../../acdm/components/fields/SelectField.jsx';
import { DateField } from '../../acdm/components/fields/DateField.jsx';
import { NumberField } from '../../acdm/components/fields/NumberField.jsx';

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
