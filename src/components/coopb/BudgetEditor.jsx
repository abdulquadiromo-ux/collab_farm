import { useState } from 'react';
import { Plus, Trash2, Inbox } from 'lucide-react';
import { Button, SelectField, TextField, MoneyField, FileDrop } from '../ui/index.js';
import { BUDGET_CATEGORIES, RESPONSIBLE_PARTIES } from './constants.jsx';
import { newBudgetItem } from './logic.js';

const ALLOWED = /\.(pdf|jpe?g|png)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

const withCurrent = (list, current) => (current && !list.includes(current) ? [...list, current] : list);

/**
 * "What's Included?" budget repeater (Figma 7131:19180). Each item: category, description, amount,
 * responsible party and a supporting document name (kept locally, nothing is uploaded).
 */
export default function BudgetEditor({ items, onChange, errors = {}, onClearError }) {
  const [fileErrors, setFileErrors] = useState({});
  const patch = (id, key, value) => {
    onChange(items.map((b) => (b.id === id ? { ...b, [key]: value } : b)));
    onClearError?.(`b:${id}:${key}`);
    onClearError?.('budget');
  };
  const remove = (id) => onChange(items.filter((b) => b.id !== id));
  // The shared FileDrop does not check file type or size, so the check happens here.
  const takeFiles = (id, list) => {
    const bad = list.find((f) => !ALLOWED.test(f.name || ''));
    const big = list.find((f) => (f.size || 0) > MAX_BYTES);
    if (bad || big) {
      setFileErrors((e) => ({ ...e, [id]: bad ? `"${bad.name}" is not a PDF, JPG or PNG file. Choose a different file.` : `"${big.name}" is larger than 5MB. Choose a smaller file.` }));
      return;
    }
    setFileErrors((e) => { const { [id]: _drop, ...rest } = e; return rest; });
    patch(id, 'files', list);
  };
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
            <SelectField
              label="Budget category" required placeholder="Choose a category"
              options={withCurrent(BUDGET_CATEGORIES, b.category)} value={b.category}
              onChange={(e) => patch(b.id, 'category', e.target.value)} error={errors[`b:${b.id}:category`]}
            />
            <TextField
              label="Item or input" required placeholder="For example, hybrid maize seed" value={b.description}
              onChange={(e) => patch(b.id, 'description', e.target.value)} error={errors[`b:${b.id}:description`]}
            />
            <MoneyField
              label="Amount" required value={b.amount} onChange={(v) => patch(b.id, 'amount', v)} error={errors[`b:${b.id}:amount`]}
            />
            <SelectField
              label="Responsible party" required placeholder="Who will manage this item?"
              options={withCurrent(RESPONSIBLE_PARTIES, b.responsible)} value={b.responsible}
              onChange={(e) => patch(b.id, 'responsible', e.target.value)} error={errors[`b:${b.id}:responsible`]}
            />
          </div>
          <FileDrop
            label="Supporting document (quotation or invoice)"
            accept="PDF, JPG or PNG (Max 5MB). The file stays in your browser in this demo."
            files={b.files}
            onFiles={(f) => takeFiles(b.id, f)}
            error={fileErrors[b.id] || errors[`b:${b.id}:files`]}
          />
        </fieldset>
      ))}
      {errors.budget && <p className="field__error" role="alert">{errors.budget}</p>}
      <div>
        <Button variant="outline-green" onClick={add}><Plus size={18} />Add another item</Button>
      </div>
    </div>
  );
}
