import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardHeader, Button, TextField, MoneyField, InfoList, Banner } from '../ui/index.js';
import { formatNaira, formatNumber } from '../../utils/format.js';
import { Explain } from './FarmUi.jsx';

// "What will I owe?" Uses only the repayment and produce terms found in this farmer's own obligations.
export default function OweCalculator({ ctx }) {
  const { ob, expectedHarvestKg, crop } = ctx;
  const [harvest, setHarvest] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const hasTerms = ob.repayDue > 0 || ob.produceDueKg > 0;

  const compute = (h, p) => {
    const kg = Number(h);
    const produceGiven = Math.min(kg, ob.produceOutstandingKg);
    return {
      kg,
      produceGiven,
      shortfall: Math.max(0, ob.produceOutstandingKg - kg),
      keep: Math.max(0, kg - produceGiven),
      repay: ob.repayOutstanding,
      price: Number(p) || 0,
    };
  };

  const run = (ev) => {
    ev.preventDefault();
    const kg = Number(harvest);
    if (!harvest || Number.isNaN(kg) || kg < 0) {
      setError('Type how many kg you expect to harvest. Use 0 or a bigger number.');
      setResult(null);
      return;
    }
    setError('');
    setResult(compute(harvest, price));
  };

  return (
    <Card id="calculator" className="farm-scroll-target">
      <CardHeader title="What will I owe?" subtitle="Try your own numbers to see what the agreement means for you." />
      {!hasTerms ? (
        <p className="muted">Your agreement shows no repayment or produce delivery for you, so there is nothing to work out.</p>
      ) : (
        <div className="grid-2 farm-calc">
          <form onSubmit={run} noValidate className="stack-lg">
            <InfoList compact items={[
              ['Repayment in my agreement', ob.repayDue > 0 ? formatNaira(ob.repayDue) : 'None'],
              ['Produce to deliver', ob.produceDueKg > 0 ? `${formatNumber(ob.produceDueKg)} kg of ${crop.toLowerCase()}` : 'None'],
            ]} />
            <TextField label="How much do you expect to harvest? (kg)" type="number" inputMode="decimal" min="0" value={harvest} onChange={(e) => { setHarvest(e.target.value); setError(''); }} error={error} placeholder={`Estimate: ${formatNumber(expectedHarvestKg)}`} />
            <div>
              <Button variant="outline-green" className="farm-btn" onClick={() => { setHarvest(String(expectedHarvestKg)); setError(''); }}>Use my estimate ({formatNumber(expectedHarvestKg)} kg)</Button>
            </div>
            <MoneyField label="Price you expect per kg" optional value={price} onChange={setPrice} hint="Only used to show a rough value. Prices change." />
            <div className="farm-actions">
              <Button type="submit" size="lg" className="farm-btn"><Calculator size={18} />Work it out</Button>
            </div>
          </form>

          <div className="stack" aria-live="polite">
            {result ? (
              <>
                <InfoList items={[
                  ['Money to pay back', formatNaira(result.repay)],
                  ['Produce to give', `${formatNumber(result.produceGiven)} kg`],
                  ['Produce you keep', `${formatNumber(result.keep)} kg`],
                  ...(result.price > 0 ? [
                    ['Rough value of produce you give', formatNaira(result.produceGiven * result.price)],
                    ['Rough value of what you keep', formatNaira(result.keep * result.price)],
                  ] : []),
                ]} />
                {result.shortfall > 0 && (
                  <Banner tone="info" title="Your harvest is smaller than the agreed produce">
                    Your agreement says {formatNumber(ob.produceOutstandingKg)} kg and this harvest is {formatNumber(result.shortfall)} kg short. A smaller harvest gets a fair review. It is never treated as fraud.
                  </Banner>
                )}
              </>
            ) : (
              <p className="muted">Your answer will show here after you tap Work it out.</p>
            )}
            <Explain>This is an estimate. Final amounts come from your agreement. Prices and harvests can change, and nothing here is a promise of income.</Explain>
          </div>
        </div>
      )}
    </Card>
  );
}
