import fs from 'node:fs';
import { trainingLabs } from '../../src/training/catalog.ts';
fs.mkdirSync('output/verification', { recursive: true });
const template = fs.readFileSync('scripts/verification/training-ui-template.js', 'utf8');
for (const [name, min, max] of [
  ['class1-3', 1, 3],
  ['class4-5', 4, 5],
  ['class6-8', 6, 8],
]) {
  const labs = trainingLabs.filter(
    (l) => l.id !== 'c1-lab1' && l.classId >= min && l.classId <= max,
  );
  fs.writeFileSync(
    `output/verification/${name}.js`,
    template
      .replace('const labs=LABS;', `const labs=${JSON.stringify(labs)};`)
      .replace('ALL_LABS', JSON.stringify(trainingLabs)),
  );
}
console.log('Prepared 33 UI walkthroughs. Class 1 Lab 1 uses the separate manual console audit.');
