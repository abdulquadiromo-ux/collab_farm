import { Plus, Trash2, Inbox } from 'lucide-react';
import { Button, TextField, MoneyField } from '../ui/index.js';
import { newBudgetItem } from './logic.js';

/**
 * "What's Included?" repeater. Each item contains only a name and amount.
 */
export default function BudgetEditor({ items, onChange, errors = {}, onClearError }) {
  const patch = (id, key, value) => {
    onChange(items.map((b) => (b.id === id ? { ...b, [key]: value } : b)));
    onClearError?.(`b:${id}:${key}`);
    onClearError?.('budget');
  };
  const remove = (id) => onChange(items.filter((b) => b.id !== id));
  const add = () => { onChange([...items, newBudgetItem()]); onClearError?.('budget'); };

  return (
    <div className="stack">
      {items.length === 0 && (
        <div className="coopb-empty-line">
          <Inbox size={20} />
          <span>No items yet. Add the first item of the budget.</span>
        </div>
      )}
      {items.map((b, i) => (
        <fieldset className="coopb-item" key={b.id}>
          <legend className="sr-only">Budget item {i + 1}</legend>
          <div className="coopb-item__head">
            <span className="strong small">Item {i + 1}</span>
            <button type="button" className="coopb-trash" onClick={() => remove(b.id)} aria-label={`Remove budget item ${i + 1}`}><Trash2 size={18} /></button>
          </div>
          <div className="coopb-item__grid">
            <TextField
              label="What's included" required placeholder="For example, hybrid maize seed" value={b.description}
              onChange={(e) => patch(b.id, 'description', e.target.value)} error={errors[`b:${b.id}:description`]}
            />
            <MoneyField
              label="Amount" required value={b.amount} onChange={(v) => patch(b.id, 'amount', v)} error={errors[`b:${b.id}:amount`]}
            />
          </div>
        </fieldset>
      ))}
      {errors.budget && <p className="field__error" role="alert">{errors.budget}</p>}
      <div>
        <Button variant="outline-green" onClick={add}><Plus size={18} />Add another item</Button>
      </div>
    </div>
  );
}
