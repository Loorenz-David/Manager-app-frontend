import { CustomerAddressFieldGroup } from './CustomerAddressFieldGroup';
import { CustomerDisplayNameField } from './fields/CustomerDisplayNameField';
import { CustomerEmailField } from './fields/CustomerEmailField';
import { CustomerPhoneField } from './fields/CustomerPhoneField';
import { CustomerTypeField } from './fields/CustomerTypeField';

export function CustomerFieldGroup() {
  return (
    <div className="flex flex-col gap-4" data-testid="customer-field-group">
      <CustomerDisplayNameField />
      <CustomerTypeField />
      <CustomerEmailField />
      <CustomerPhoneField />
      <CustomerAddressFieldGroup />
    </div>
  );
}
